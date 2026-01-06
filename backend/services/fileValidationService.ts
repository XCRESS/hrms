interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

class FileValidationService {
  validateFile(file: Express.Multer.File | undefined): ValidationResult {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push('File type not supported. Please use JPEG, PNG, GIF, or PDF files');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new FileValidationService();
