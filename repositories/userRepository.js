class UserRepository {
    constructor(pool) {
        this.pool = pool;
    }

    async findByEmail(email) {
        const [users] = await this.pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return users[0];
    }

    async create(name, email, hashedPassword) {
        const [result] = await this.pool.query(
            'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        return result;
    }

    async findAllExcept(userId) {
        const [users] = await this.pool.query(
            'SELECT id, full_name FROM users WHERE id != ?',
            [userId]
        );
        return users;
    }
}

export default UserRepository; 