class EmailRepository {
    constructor(pool) {
        this.pool = pool;
    }

    async findInboxEmails(userId, limit, offset) {
        const [emails] = await this.pool.query(
            `SELECT e.id, e.subject, e.created_at, u1.full_name AS sender_name
             FROM emails e
             JOIN users u1 ON e.sender_id = u1.id
             WHERE e.receiver_id = ? AND e.deleted_by_receiver = FALSE
             ORDER BY e.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return emails;
    }

    async findOutboxEmails(userId, limit, offset) {
        const [emails] = await this.pool.query(
            `SELECT e.id, u.full_name AS recipient_name, e.subject, e.created_at
             FROM emails e
             JOIN users u ON e.receiver_id = u.id
             WHERE e.sender_id = ? AND e.deleted_by_sender = FALSE
             ORDER BY e.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return emails;
    }

    async createEmail(senderId, receiverId, subject, body, attachmentPath) {
        const [result] = await this.pool.query(
            `INSERT INTO emails (sender_id, receiver_id, subject, body, attachment_path) 
             VALUES (?, ?, ?, ?, ?)`,
            [senderId, receiverId, subject, body, attachmentPath]
        );
        return result;
    }

    async countInboxEmails(userId) {
        const [result] = await this.pool.query(
            `SELECT COUNT(*) AS count
             FROM emails
             WHERE receiver_id = ? AND deleted_by_receiver = FALSE`,
            [userId]
        );
        return result[0].count;
    }
}

export default EmailRepository;