const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    port: 3306
};

// const DB_CONFIG = {
//     host: 'localhost',
//     user: 'wpr',
//     password: 'fit2024',
//     port: 3306
// };

const DB_NAME = 'wpr2201040016';

const pool = mysql.createPool(DB_CONFIG);

async function createDatabase(connection) {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    await connection.query(`USE ${DB_NAME}`);
    console.log(`Database '${DB_NAME}' is ready`);
}

async function createTables(connection) {
    const tables = [
        {
            name: 'users',
            sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    full_name VARCHAR(255),
                    email VARCHAR(255) UNIQUE,
                    password VARCHAR(255)
                );
            `
        },
        {
            name: 'emails',
            sql: `
                CREATE TABLE IF NOT EXISTS emails (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT,
                    receiver_id INT,
                    subject VARCHAR(255),
                    body TEXT,
                    attachment_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users(id),
                    FOREIGN KEY (receiver_id) REFERENCES users(id)
                );
            `
        }
    ];

    for (const table of tables) {
        await connection.query(table.sql);
        console.log(`${table.name} table created or already exists`);
    }
}

async function insertSampleData(connection) {
    const [userRows] = await connection.query('SELECT COUNT(*) AS count FROM users');
    const userCount = userRows[0].count;

    const [emailRows] = await connection.query('SELECT COUNT(*) AS count FROM emails');
    const emailCount = emailRows[0].count;

    if (userCount === 0) {
        const sampleUsersSql = `
            INSERT INTO users (full_name, email, password) VALUES
            ('UserOne', 'a@a.com', '123'),
            ('UserTwo', 'b@b.com', 'password1'),
            ('UserThree', 'c@c.com', 'password2');
        `;
        await connection.query(sampleUsersSql);
        console.log('Sample users inserted');
    } else {
        console.log('Users table already contains data, skipping sample users insertion');
    }

    if (emailCount === 0) {
        const sampleEmailsSql = `
            INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path) VALUES
            (1, 2, 'Hello from UserOne', 'This is a test email', null),
            (2, 1, 'Re: Hello from UserOne', 'This is a reply to your test email', null),
            (3, 1, 'Greetings from UserThree', 'Another test email', null),
            (1, 3, 'Meeting Reminder', 'Don’t forget our meeting tomorrow', null),
            (1, 2, 'Check This Out', 'Here’s something interesting', null),
            (2, 3, 'Hello UserThree', 'Just reaching out', null),
            (3, 2, 'Update Required', 'Please update your info', null),
            (2, 1, 'Follow-Up', 'Following up on our previous conversation', null);
        `;
        await connection.query(sampleEmailsSql);
        console.log('Sample emails inserted');
    } else {
        console.log('Emails table already contains data, skipping sample emails insertion');
    }
}

async function setupDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to the database');

        await createDatabase(connection);
        await createTables(connection);
        await insertSampleData(connection);
    } catch (err) {
        console.error('Error during database setup:', err);
    } finally {
        if (connection) {
            connection.release();
            console.log('Connection released');
        }
    }
}

setupDatabase().catch(console.error);

module.exports = pool;


