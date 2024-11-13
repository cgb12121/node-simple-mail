import { compare, hash } from 'bcrypt';
import { PASSWORD_MIN_LENGTH } from '../config/constants';

class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async login(email, password) {
        const user = await this.userRepository.findByEmail(email);
        
        if (user && await compare(password, user.password)) {
            return user;
        }
        return null;
    }

    async register(name, email, password, rePassword) {
        const validationErrors = this.validateRegistration(name, email, password, rePassword);
        if (Object.keys(validationErrors).length > 0) {
            return { errors: validationErrors };
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            return { errors: { email: 'Email already used' } };
        }

        const hashedPassword = await hash(password, 10);
        await this.userRepository.create(name, email, hashedPassword);
        return { success: true };
    }

    validateRegistration(name, email, password, rePassword) {
        const errors = {};
        if (!name) errors.name = "You must fill in your name";
        if (!email) errors.email = "You must fill in your email";
        if (!password) errors.password = "You must fill in your password";
        if (password && password.length < PASSWORD_MIN_LENGTH) {
            errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
        }
        if (password !== rePassword) {
            errors.rePassword = "Passwords do not match";
        }
        return errors;
    }
}

export default AuthService; 