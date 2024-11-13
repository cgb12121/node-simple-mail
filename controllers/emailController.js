class EmailController {
    constructor(emailService) {
        this.emailService = emailService;
    }

    async getInbox(req, res) {
        try {
            const user = req.signedCookies[COOKIE_NAME];
            const page = parseInt(req.query.page) || 1;
            const limit = 5;

            const result = await this.emailService.getInboxEmails(user.id, page, limit);

            return res.render('inbox', {
                user: user.full_name,
                emails: result.emails,
                currentPage: result.currentPage,
                pages: result.totalPages
            });
        } catch (err) {
            console.error('Error fetching inbox:', err);
            return res.status(500).render('500');
        }
    }
}

module.exports = EmailController; 