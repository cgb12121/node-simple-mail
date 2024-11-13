import { COOKIE_NAME } from '../config/constants';

const isAuthenticated = (req, res, next) => {
    if (req.signedCookies[COOKIE_NAME]) {
        return next();
    }
    return res.status(403).render('403');
};

export default {
    isAuthenticated
}; 