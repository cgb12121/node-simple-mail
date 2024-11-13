import { Router } from 'express';
const router = Router();
import auth from '../middleware/auth';
const { isAuthenticated } = auth;

export default (emailController) => {
    router.get('/inbox', isAuthenticated, emailController.getInbox.bind(emailController));
    router.get('/outbox', isAuthenticated, emailController.getOutbox.bind(emailController));
    return router;
}; 