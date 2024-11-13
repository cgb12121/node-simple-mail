import { Router } from 'express';
const router = Router();

export default (authController) => {
    router.post('/login', authController.login.bind(authController));
    router.post('/register', authController.register.bind(authController));
    router.get('/logout', authController.logout.bind(authController));
    
    router.get('/signin', (req, res) => res.render('signin', { title: 'Sign In' }));
    router.get('/signup', (req, res) => res.render('signup', { title: 'Create New Account' }));

    return router;
}; 