class FileValidationService {
    validateFile(file) {
        const errors = [];

        if (!file) {
            errors.push('No file provided');
            return { isValid: false, errors };
        }

        // Basic size check - 10MB max
        if (file.size > 10 * 1024 * 1024) {
            errors.push('File size exceeds 10MB limit');
        }

        // Basic file type check
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
            errors.push('File type not supported. Please use JPEG, PNG, GIF, or PDF files');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default new FileValidationService();