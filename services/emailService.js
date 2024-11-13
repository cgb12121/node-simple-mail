class EmailService {
    constructor(emailRepository) {
        this.emailRepository = emailRepository;
    }

    async getInboxEmails(userId, page, limit) {
        const offset = (page - 1) * limit;
        const emails = await this.emailRepository.findInboxEmails(userId, limit, offset);
        const totalCount = await this.emailRepository.countInboxEmails(userId);
        
        return {
            emails,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit)
        };
    }

    async sendEmail(senderId, receiverId, subject, body, attachment) {
        const attachmentPath = attachment ? attachment.path : null;
        return await this.emailRepository.createEmail(
            senderId,
            receiverId,
            subject || '(no subject)',
            body,
            attachmentPath
        );
    }

    // ... other service methods
}

module.exports = EmailService; 