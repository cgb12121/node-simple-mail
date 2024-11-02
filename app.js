const express = require('express');
const path = require('path');
const logger = require('morgan');
const pool = require('./dbsetup');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'mySecretKey',
    resave: true,
    saveUninitialized: false
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/');
};

app.get('/', (req, res) => {
    req.session.user ? res.redirect('/inbox') : res.render('signin', { title: 'Sign In' });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (users.length && await password === users[0].password) {
            req.session.user = users[0];
            res.redirect('/inbox');
        } else {
            res.status(401).render('signin', { err: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send({ err: 'Server error' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) res.status(500).send({ err: 'Could not log out, please try again' });
        else res.redirect('/');
    });
});

app.get('/signup', (req, res) => {
    res.render('signup', { layout: false, title: "Create New Account" });
});

app.post('/register', async (req, res) => {
    const { name, email, password, rePassword } = req.body;

    let nameErr;
    let emailErr;
    let passwordErr;
    let rePasswordErr;

    if (!name) nameErr = "You must fill in your name";
    if (!email) emailErr = "You must fill in your email";
    if (!password) passwordErr = "You must fill in your password";
    if (!rePassword) rePasswordErr = "Passwords do not match";

    if (!name || !email || !password || !rePassword) {
        return res.status(400).render('signup',{ nameErr, emailErr, passwordErr, rePasswordErr, err: 'Please fill out all required fields' });
    }
    if (password.length < 6) return res.status(400).render('signup', { passwordErr: 'Password must be at least 6 characters' });

    if (password !== rePassword) return res.status(400).render('signup', { rePasswordErr: 'Passwords do not match' });

    try {
        const [existingUser] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (existingUser.length > 0) return res.status(400).render('signup',{ err: 'Email already used' });

        await pool.query(`INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)`, [name, email, password]);
        res.send({ message: 'Account created successfully!' });
        res.render('/signin', { success: 'Account created successfully!' });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send({ err: 'Server error' });
    }
});

app.get('/inbox', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const [emails] = await pool.query(
            `SELECT e.id, e.subject, e.created_at, u1.full_name AS sender_name
            FROM emails e
            JOIN users u1 ON e.sender_id = u1.id
            WHERE e.receiver_id = ?
            ORDER BY e.created_at DESC
            LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS count
            FROM emails
            WHERE receiver_id = ?`,
            [userId]
        );

        const totalEmails = countResult[0].count;
        const totalPages = Math.ceil(totalEmails / limit);

        res.render('inbox', {
            user: req.session.user,
            emails: emails,
            currentPage: page,
            pages: totalPages
        });
    } catch (err) {
        console.error('Error fetching emails:', err);
        res.status(500).send({ err: 'Server error' });
    }
});

app.get('/outbox', isAuthenticated, async (req, res) => {
    const currentUser = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const [emails] = await pool.query(
            `SELECT e.id, u.full_name AS recipient_name, e.subject, e.created_at
            FROM emails e
            JOIN users u ON e.receiver_id = u.id
            WHERE e.sender_id = ?
            ORDER BY e.created_at DESC
            LIMIT ? OFFSET ?`,
            [currentUser, limit, offset]
        );

        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS count
            FROM emails
            WHERE sender_id = ?`,
            [currentUser]
        );

        const totalEmails = countResult[0].count;
        const totalPages = Math.ceil(totalEmails / limit);

        res.render('outbox', {
            user: req.session.user,
            emails: emails,
            currentPage: page,
            pages: totalPages
        });
    } catch (err) {
        console.error('Error fetching outbox:', err);
        res.status(500).send({ err: 'Server error' });
    }
});


app.get('/compose', isAuthenticated, async (req, res) => {
    const loggedInUser = req.session.user.id;
    try {
        const [users] = await pool.query('SELECT id, full_name FROM users WHERE id != ?', [loggedInUser]);
        res.render('compose', { users, loggedInUser });
    } catch (err) {
        console.error('Error fetching users for compose:', err);
        res.status(500).send({ err: 'Server error' });
    }
});

app.post('/compose', isAuthenticated, async (req, res) => {
    const { receiver_id, subject, body } = req.body;
    const sender_id = req.session.user.id;
    const savingPath = path.join(__dirname, req.attachment.name)
    const attachmentPath = req.attachment ? savingPath : null;

    try {
        await pool.query(
            `INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path) VALUES (?, ?, ?, ?, ?)`,
            [sender_id, receiver_id, subject || '(no subject)', body, attachmentPath]
        );
        res.render('compose', { success: 'Email sent successfully!' });
    } catch (err) {
        console.error('Error sending email:', err);
        res.render('compose', { err: 'Server error, unable to send email.' });
    }
});

app.post('/send-email', isAuthenticated, upload.single('attachment'), async (req, res) => {
    const { recipient, subject, body } = req.body;
    const sender_id = req.session.user.id;

    try {
        const [existingUser] = await pool.query(`SELECT id FROM users WHERE email = ?`, [recipient]);

        if (!existingUser.length) {
            return res.status(400).render('compose',{ err: 'Recipient not found' });
        }

        const receiver_id = existingUser[0].id;
        const attachmentPath = req.file ? req.file.path : null;

        await pool.query(
            `INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path) VALUES (?, ?, ?, ?, ?)`,
            [sender_id, receiver_id, subject || '(no subject)', body, attachmentPath]
        );

        res.render('compose', { success: 'Email sent successfully!' });
    } catch (err) {
        console.error('Error sending email:', err);
        res.render('compose', { err: 'Server error, unable to send email.' });
    }
});

app.post('/delete-emails', isAuthenticated, async (req, res) => {
    const { emailIds } = req.body;

    if (!emailIds || !Array.isArray(emailIds)) {
        return res.status(400).send({ err: 'Invalid email IDs' });
    }

    try {
        await pool.query(
            `DELETE FROM emails WHERE id IN (?) AND (sender_id = ? OR receiver_id = ?)`,
            [emailIds, req.session.user.id, req.session.user.id]
        );
        res.send({ message: 'Emails deleted successfully' });
    } catch (err) {
        console.error('Error deleting emails:', err);
        res.status(500).send({ err: 'Server error' });
    }
});

app.get('/emails/:id', isAuthenticated, async (req, res) => {
    const emailId = req.params.id;
    const userId = req.session.user.id;

    try {
        const [result] = await pool.query(
            `SELECT e.*, u1.full_name as sender, u2.full_name as receiver
            FROM emails e
            JOIN users u1 ON e.sender_id = u1.id
            JOIN users u2 ON e.receiver_id = u2.id
            WHERE e.id = ? AND (e.sender_id = ? OR e.receiver_id = ?)`,
            [emailId, userId, userId]
        );

        if (result.length === 0) return res.status(404).send('Email not found');
        const email_details = result[0];
        const sender_id = email_details.sender_id;

        const [sender] = await pool.query(
            `SELECT * FROM users WHERE id = ?`,
            [sender_id]
        );

        const sender_name = sender[0].full_name;
        const attachmentPath = email_details.attachment_path;

        console.log(attachmentPath);
        res.render('emailDetail', { sender_name, email: email_details, attachmentPath });
    } catch (err) {
        console.error('Error fetching email details:', err);
        res.status(500).send({ err: 'Server error' });
    }
});

app.get('/download/:id', isAuthenticated, async (req, res) => {
    const emailId = req.params.id;

    try {
        const [result] = await pool.query(
            `SELECT attachment_path FROM emails WHERE id = ?`,
            [emailId]
        );

        if (result.length === 0 || !result[0].attachment_path) {
            return res.status(404).send('File not found');
        }

        const filePart = result[0].attachment_path;
        res.download(filePart);
    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).send('Server error');
    }
});

const PORT = 8000;
app.listen(PORT, (err) => {
    if (err) console.error('Error in server setup');
    console.log('Server listening on Port', PORT);
});

module.exports = app;
