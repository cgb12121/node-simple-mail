const { COOKIE_NAME } = require('../config/constants');

class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await this.authService.login(email, password);

            if (user) {
                res.cookie(COOKIE_NAME, {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name
                }, {
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000,
                    signed: true
                });
                return res.redirect('/inbox');
            }

            return res.status(401).render('signin', { err: 'Invalid credentials' });
        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).render('500');
        }
    }

    async register(req, res) {
        try {
            const { name, email, password, rePassword } = req.body;
            const result = await this.authService.register(name, email, password, rePassword);

            if (result.errors) {
                return res.status(400).render('signup', result.errors);
            }

            return res.render('signup', { signedUp: 'Account created successfully!' });
        } catch (err) {
            console.error('Registration error:', err);
            return res.status(500).render('500');
        }
    }

    logout(req, res) {
        res.clearCookie(COOKIE_NAME);
        return res.render('signin', { loggedOut: 'Logged out successfully' });
    }
}

module.exports = AuthController; 