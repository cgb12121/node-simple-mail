const express = require('express');
const path = require('path');
const pool = require('./dbsetup');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const storage = multer.diskStorage({
    destination:  (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename:     (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage });

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser("mySecretKey"));
app.use(express.static(path.join(__dirname, 'public')));

const COOKIE_NAME = 'user';

const isAuthenticated = (req, res, next) => {
    if (req.signedCookies[COOKIE_NAME]) {
        return next();
    } else {
        return res.status(401).render('401');
    }
};

app.get('', (req, res) => {
    if (req.signedCookies[COOKIE_NAME]) {
        return res.redirect('inbox');
    } else {
        return res.render('home');
    }
});

app.get('/', (req, res) => {
    if (req.signedCookies[COOKIE_NAME]) {
        return res.redirect('inbox');
    } else {
        return res.render('home');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (users.length && await password === users[0].password) {
            res.cookie(COOKIE_NAME, { id: users[0].id, email: users[0].email }, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                signed: true
            });
            return res.redirect('/inbox');
        } else {
            return res.status(401).render('signin', { err: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).render('500');
    }
});

app.post('/register', async (req, res) => {
    const { name, email, password, rePassword } = req.body;

    let nameErr, emailErr, passwordErr, rePasswordErr;
    if (!name) nameErr = "You must fill in your name";
    if (!email) emailErr = "You must fill in your email";
    if (!password) passwordErr = "You must fill in your password";
    if (!rePassword) rePasswordErr = "Passwords do not match";

    if (!name && !email && !password && !rePassword) {
        return res.status(400).render('signup', { err: 'Please fill out all required fields' })
    }

    if (!name || !email || !password || !rePassword) {
        return res.status(400).render('signup',{ nameErr, emailErr, passwordErr, rePasswordErr });
    }

    if (password.length < 6) {
        return res.status(400).render('signup', { passwordErr: 'Password must be at least 6 characters' });
    }

    if (password !== rePassword) {
        return res.status(400).render('signup', { rePasswordErr: 'Re-password does not match' });
    }

    try {
        const [existingUser] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (existingUser.length > 0) return res.status(400).render('signup',{ err: 'Email already used' });

        await pool.query(`INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)`, [name, email, password]);
        return res.render('signin', { signedUp: 'Account created successfully!' });
    } catch (err) {
        console.error('Error during registration:', err);
        return res.status(500).render('500');
    }
});

/**
 * This code fetch all the incoming emails form db (of that users)
 * It does not check if the user deleted the email
 * TODO: this is used SESSION!
 */
// app.get('/inbox', isAuthenticated, async (req, res) => {
//     const userId = req.session.user.id;
//     const page = parseInt(req.query.page) || 1;
//     const limit = 5;
//     const offset = (page - 1) * limit;
//
//     try {
//         const [emails] = await pool.query(
//             `SELECT e.id, e.subject, e.created_at, u1.full_name AS sender_name
//             FROM emails e
//             JOIN users u1 ON e.sender_id = u1.id
//             WHERE e.receiver_id = ?
//             ORDER BY e.created_at DESC
//             LIMIT ? OFFSET ?`,
//             [userId, limit, offset]
//         );
//
//         const [countResult] = await pool.query(
//             `SELECT COUNT(*) AS count
//             FROM emails
//             WHERE receiver_id = ?`,
//             [userId]
//         );
//
//         const totalEmails = countResult[0].count;
//         const totalPages = Math.ceil(totalEmails / limit);
//
//         return res.render('inbox', { user: req.session.user, emails: emails, currentPage: page, pages: totalPages });
//     } catch (err) {
//         console.error('Error fetching emails:', err);
//         return res.status(500).render('500');
//     }
// });

app.get('/inbox', isAuthenticated, async (req, res) => {
    const user = req.signedCookies[COOKIE_NAME];
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const [emails] = await pool.query(
            `SELECT e.id, e.subject, e.created_at, u1.full_name AS sender_name
             FROM emails e
             JOIN users u1 ON e.sender_id = u1.id
             WHERE e.receiver_id = ? AND e.deleted_by_receiver = FALSE
             ORDER BY e.created_at DESC
             LIMIT ? OFFSET ?`,
            [user.id, limit, offset]
        );

        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS count
             FROM emails
             WHERE receiver_id = ? AND deleted_by_receiver = FALSE`,
            [user.id]
        );

        const totalEmails = countResult[0].count;
        const totalPages = Math.ceil(totalEmails / limit);

        return res.render('inbox', { user: user.email, emails, currentPage: page, pages: totalPages });
    } catch (err) {
        console.error('Error fetching inbox:', err);
        return res.status(500).render('500');
    }
});

/**
 * This code fetch all the out coming emails form db (of that users)
 * It does not check if the user deleted the email
 * TODO: this is used SESSION!
 */
// app.get('/outbox', isAuthenticated, async (req, res) => {
//     const currentUser = req.session.user.id;
//     const page = parseInt(req.query.page) || 1;
//     const limit = 5;
//     const offset = (page - 1) * limit;
//
//     try {
//         const [emails] = await pool.query(
//             `SELECT e.id, u.full_name AS recipient_name, e.subject, e.created_at
//             FROM emails e
//             JOIN users u ON e.receiver_id = u.id
//             WHERE e.sender_id = ?
//             ORDER BY e.created_at DESC
//             LIMIT ? OFFSET ?`,
//             [currentUser, limit, offset]
//         );
//
//         const [countResult] = await pool.query(
//             `SELECT COUNT(*) AS count
//             FROM emails
//             WHERE sender_id = ?`,
//             [currentUser]
//         );
//
//         const totalEmails = countResult[0].count;
//         const totalPages = Math.ceil(totalEmails / limit);
//
//         return res.render('outbox', { user: req.session.user, emails: emails, currentPage: page, pages: totalPages });
//     } catch (err) {
//         console.error('Error fetching outbox:', err);
//         return res.status(500).render('500');
//     }
// });

app.get('/outbox', isAuthenticated, async (req, res) => {
    const user = req.signedCookies[COOKIE_NAME];
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const [emails] = await pool.query(
            `SELECT e.id, u.full_name AS recipient_name, e.subject, e.created_at
             FROM emails e
             JOIN users u ON e.receiver_id = u.id
             WHERE e.sender_id = ? AND e.deleted_by_sender = FALSE
             ORDER BY e.created_at DESC
             LIMIT ? OFFSET ?`,
            [user.id, limit, offset]
        );

        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS count
             FROM emails
             WHERE sender_id = ? AND deleted_by_sender = FALSE`,
            [user.id]
        );

        const totalEmails = countResult[0].count;
        const totalPages = Math.ceil(totalEmails / limit);

        return res.render('outbox', { user: user.email, emails, currentPage: page, pages: totalPages });
    } catch (err) {
        console.error('Error fetching outbox:', err);
        return res.status(500).render('500');
    }
});

app.get('/compose', isAuthenticated, async (req, res) => {
    const loggedInUser = req.signedCookies[COOKIE_NAME];
    try {
        const [users] = await pool.query('SELECT id, full_name FROM users WHERE id != ?', [loggedInUser.id]);
        return res.render('compose', { user: loggedInUser.email, users, loggedInUser: loggedInUser.id });
    } catch (err) {
        console.error('Error fetching users for compose:', err);
        return res.status(500).render('500');
    }
});

app.post('/compose', isAuthenticated, async (req, res) => {
    const { receiver_id, subject, body } = req.body;
    const user = req.signedCookies[COOKIE_NAME];
    const sender_id = req.signedCookies[COOKIE_NAME].id;
    const savingPath = path.join(__dirname, req.attachment.name)
    const attachmentPath = req.attachment ? savingPath : null;

    try {
        await pool.query(
            `INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path) VALUES (?, ?, ?, ?, ?)`,
            [sender_id, receiver_id, subject || '(no subject)', body, attachmentPath]
        );
        return res.render('compose', { user: user.email, success: 'Email sent successfully!' });
    } catch (err) {
        console.error('Error sending email:', err);
        return res.render('compose', { user: user.email, err: 'Server error, unable to send email.' });
    }
});

app.post('/send-email', isAuthenticated, upload.single('attachment'), async (req, res) => {
    const { recipient, subject, body } = req.body;
    const loggedInUser = req.signedCookies[COOKIE_NAME].email;
    const sender_id = req.signedCookies[COOKIE_NAME].id;

    try {
        const [existingUser] = await pool.query(`SELECT id FROM users WHERE email = ?`, [recipient]);

        if (!existingUser.length) {
            return res.status(400).render('compose',{ user: loggedInUser, err: 'Recipient not found' });
        }

        const receiver_id = existingUser[0].id;
        const attachmentPath = req.file ? req.file.path : null;

        await pool.query(
            `INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path) VALUES (?, ?, ?, ?, ?)`,
            [sender_id, receiver_id, subject || '(no subject)', body, attachmentPath]
        );

        return res.render('compose', { user: loggedInUser, success: 'Email sent successfully!' });
    } catch (err) {
        console.error('Error sending email:', err);
        return res.render('compose', { user: loggedInUser, err: 'Server error, unable to send email.' });
    }
});

/**
 * This code removed email completely from database when user click delete
 * ==> Both won't be able to see that email again
 * TODO: this is used SESSION!
 * */
// app.post('/delete-emails', isAuthenticated, async (req, res) => {
//     const { emailIds } = req.body;
//
//     if (!emailIds || !Array.isArray(emailIds)) {
//         return res.status(400).send({ err: 'Invalid email IDs' });
//     }
//
//     try {
//         await pool.query(
//             `DELETE FROM emails WHERE id IN (?) AND (sender_id = ? OR receiver_id = ?)`,
//             [emailIds, req.session.user.id, req.session.user.id]
//         );
//         return res.send({ message: 'Emails deleted successfully' });
//     } catch (err) {
//         console.error('Error deleting emails:', err);
//         return res.status(500).render('500');
//     }
// });

app.post('/delete-emails', isAuthenticated, async (req, res) => {
    const { emailIds } = req.body;
    const userId = req.signedCookies[COOKIE_NAME].id;

    if (!emailIds || !Array.isArray(emailIds)) {
        return res.status(400).send({ err: 'Invalid email IDs' });
    }

    try {
        await pool.query(
            `UPDATE emails
             SET deleted_by_sender = CASE WHEN sender_id = ? THEN TRUE ELSE deleted_by_sender END,
                 deleted_by_receiver = CASE WHEN receiver_id = ? THEN TRUE ELSE deleted_by_receiver END
             WHERE id IN (?) AND (sender_id = ? OR receiver_id = ?)`,
            [userId, userId, emailIds, userId, userId]
        );

        return res.send({ message: 'Emails deleted successfully' });
    } catch (err) {
        console.error('Error deleting emails:', err);
        return res.status(500).render('500');
    }
});

/**
 * This code still allows user to access deleted emails
 * TODO: this is used SESSION!
 */
// app.get('/emails/:id', isAuthenticated, async (req, res) => {
//     const emailId = req.params.id;
//     const userId = req.session.user.id;
//
//     try {
//         const [result] = await pool.query(
//             `SELECT e.*, u1.full_name as sender, u2.full_name as receiver
//             FROM emails e
//             JOIN users u1 ON e.sender_id = u1.id
//             JOIN users u2 ON e.receiver_id = u2.id
//             WHERE e.id = ? AND (e.sender_id = ? OR e.receiver_id = ?)`,
//             [emailId, userId, userId]
//         );
//
//         if (result.length === 0) return res.status(404).send('Email not found');
//         const email_details = result[0];
//         const sender_id = email_details.sender_id;
//
//         const [sender] = await pool.query(
//             `SELECT * FROM users WHERE id = ?`,
//             [sender_id]
//         );
//
//         const sender_name = sender[0].full_name;
//         const attachmentPath = email_details.attachment_path;
//
//         console.log(attachmentPath);
//         return res.render('emailDetail', { sender_name, email: email_details, attachmentPath });
//     } catch (err) {
//         console.error('Error fetching email details:', err);
//         return res.status(500).render('500');
//     }
// });

app.get('/emails/:id', isAuthenticated, async (req, res) => {
    const emailId = req.params.id;
    const user = req.signedCookies[COOKIE_NAME];
    const userId = req.signedCookies[COOKIE_NAME].id;

    try {
        const [result] = await pool.query(
            `SELECT e.*, u1.full_name as sender, u2.full_name as receiver
             FROM emails e
             JOIN users u1 ON e.sender_id = u1.id
             JOIN users u2 ON e.receiver_id = u2.id
             WHERE e.id = ? AND (e.sender_id = ? OR e.receiver_id = ?)
               AND ((e.receiver_id = ? AND e.deleted_by_receiver = FALSE) OR
                    (e.sender_id = ? AND e.deleted_by_sender = FALSE))`,
            [emailId, userId, userId, userId, userId]
        );

        if (result.length === 0) return res.status(404).render('404');

        const emailDetails = result[0];
        const senderId = emailDetails.sender_id;

        const [sender] = await pool.query(`SELECT * FROM users WHERE id = ?`, [senderId]);
        const senderName = sender[0].full_name;

        return res.render('emailDetail', { user: user.email, sender_name: senderName, email: emailDetails, attachmentPath: emailDetails.attachment_path });
    } catch (err) {
        console.error('Error fetching email details:', err);
        return res.status(500).render('500');
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
            return res.status(404).render('404');
        }

        const filePart = result[0].attachment_path;
        return res.download(filePart);
    } catch (err) {
        console.error('Error downloading file:', err);
        return res.status(500).render('500');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    return res.render('signin', { loggedOut: 'Logged out successfully' });
});

app.get('/signup', (req, res) => {
    return res.render('signup', { layout: false, title: "Create New Account" });
});

app.get('/signin', (req, res) => {
    return res.render('signin', { title: 'Sign In' });
})

/**
 * Test 401 error page
 */
app.get('/access_denied', (req, res) => {
    return res.render('401');
})

/**
 * Test 404 error page
 */
app.get('/not_found', (req, res) => {
    return res.render('404');
})

/**
 * Test 500 error page
 */
app.get('/server_error', (req, res) => {
    return res.render('500');
})

const PORT = 8000;
app.listen(PORT, (err) => {
    if (err) console.error('Error in server setup');
    console.info('________________________________')
    console.info('Server listening on Port', PORT);
    console.info('________________________________')
});

module.exports = app;
