const mysql = require('mysql2/promise');

// const DB_CONFIG = {
//     user: 'root',
//     password: '123456',
//     host: 'localhost',
//     port: 3306
// };

const DB_CONFIG = {
    user: 'wpr',
    password: 'fit2024',
    host: 'localhost',
    port: 3306
};

const DB_NAME = 'wpr2201040016';

const pool = mysql.createPool(DB_CONFIG);

async function createDatabase(connection) {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    await connection.query(`USE ${DB_NAME}`);
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
                    deleted_by_sender BOOLEAN DEFAULT FALSE,
                    deleted_by_receiver BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (sender_id) REFERENCES users(id),
                    FOREIGN KEY (receiver_id) REFERENCES users(id)
                );
            `
        }
    ];

    for (const table of tables) {
        await connection.query(table.sql);
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
    }

    if (emailCount === 0) {
        const sampleEmailsSql = `
            INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path, deleted_by_sender, deleted_by_receiver) VALUES
            (1, 2, 'Project Update', 'The latest project details are attached. Please review and share your thoughts.', null, false, false),
            (1, 3, 'Weekly Meeting', 'Reminder: Our weekly meeting is scheduled for tomorrow at 10 AM.', null, false, false),
            (2, 1, 'Status Report', 'Here is the status report for last week’s activities. Let me know if you have questions.', null, false, false),
            (2, 3, 'Client Feedback', 'The client provided feedback on the last demo. Details are in the document attached.', null, false, false),
            (3, 1, 'Team Building Event', 'Join us for a team-building event this Friday evening.', null, false, false),
            (3, 2, 'Urgent: Password Change', 'Please change your password to ensure account security.', null, false, false),
            (1, 2, 'Budget Approval', 'Please review the budget document and approve by EOD.', null, false, false),
            (1, 3, 'New Project Kickoff', 'Let’s schedule a meeting to discuss the kickoff for the new project.', null, false, false),
            (2, 1, 'Invoice for October', 'Attached is the invoice for the services provided in October.', null, false, false),
            (3, 2, 'Performance Review', 'Please prepare for your annual performance review next week.', null, false, false),
            (1, 2, 'Holiday Schedule', 'The holiday schedule for next year is attached. Plan accordingly.', null, false, false),
            (1, 3, 'System Downtime Notification', 'Our system will undergo maintenance this weekend.', null, false, false),
            (2, 1, 'Revised Contract', 'Please review the revised contract and send your feedback.', null, false, false),
            (3, 2, 'Monthly Newsletter', 'Here’s the monthly newsletter for your information.', null, false, false),
            (1, 2, 'Meeting Minutes', 'Find the minutes from our last meeting attached.', null, false, false),
            (1, 3, 'Quarterly Review', 'Prepare your materials for the upcoming quarterly review.', null, false, false),
            (2, 1, 'Client Meeting Follow-Up', 'Follow-up on our last client meeting. Let’s discuss next steps.', null, false, false),
            (3, 2, 'Upcoming Deadline', 'A friendly reminder: project deadline is approaching.', null, false, false),
            (1, 2, 'Feedback Request', 'Please share your feedback on the recent project.', null, false, false),
            (2, 3, 'Reminder: Tax Filing', 'Friendly reminder to file your taxes by the due date.', null, false, false),
            (3, 1, 'Happy Holidays!', 'Wishing you a joyful holiday season!', null, false, false),
            (1, 3, 'Security Alert', 'There has been a login attempt from an unknown location. Please verify.', null, false, false),
            (1, 2, 'Product Launch Update', 'The new product launch is on track. Here’s the latest update.', null, false, false),
            (2, 3, 'Annual Report', 'The annual report is now available. Review and let us know your thoughts.', null, false, false),
            (3, 1, 'Survey: Employee Satisfaction', 'We’d love your feedback in our employee satisfaction survey.', null, false, false),
            (1, 2, 'New Office Policies', 'Attached are the new office policies effective next month.', null, false, false),
            (1, 3, 'Birthday Wishes', 'Happy Birthday! Wishing you a wonderful year ahead!', null, false, false),
            (2, 1, 'System Update Notification', 'Our system will be updated tonight. Expect a brief downtime.', null, false, false),
            (3, 2, 'Follow-Up: Workshop', 'Thank you for attending the workshop. Please fill out the feedback form.', null, false, false),
            (1, 2, 'Welcome New Employee', 'Please welcome our newest team member.', null, false, false),
            (2, 3, 'Performance Bonus Update', 'Performance bonus details have been updated. Check your portal for more.', null, false, false),
            (3, 1, 'Annual Training Reminder', 'Mandatory training sessions will begin next week.', null, false, false),
            (1, 3, 'Password Reset Instructions', 'Follow the link to reset your password.', null, false, false),
            (2, 1, 'Invitation to Webinar', 'You’re invited to a webinar on industry trends. Register now.', null, false, false),
            (3, 2, 'Corporate Social Responsibility Initiative', 'Join us in making a difference this holiday season.', null, false, false),
            (1, 2, 'Project Milestone Achieved', 'Congratulations on reaching a project milestone!', null, false, false),
            (2, 3, 'Monthly Sales Report', 'Attached is the sales report for last month.', null, false, false),
            (3, 1, 'Vendor Agreement Renewal', 'The vendor agreement is up for renewal. Review and approve.', null, false, false),
            (1, 3, 'Travel Policy Update', 'Please review the updated travel policies before your next trip.', null, false, false),
            (2, 1, 'Team Appreciation', 'Great job team on completing the project ahead of schedule!', null, false, false),
            (3, 2, 'Office Relocation Update', 'Our office relocation is scheduled for next quarter.', null, false, false);
        `;

        await connection.query(sampleEmailsSql);
    }
}

async function setupDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();

        await createDatabase(connection);
        await createTables(connection);
        await insertSampleData(connection);
    } catch (err) {
        console.error('Error during database setup: ', err);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

setupDatabase().catch(console.error);

module.exports = pool;


