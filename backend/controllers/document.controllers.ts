import type { Request, Response } from 'express';
import EmployeeDocument from '../models/EmployeeDocument.model.js';
import Employee from '../models/Employee.model.js';
import s3Service from '../services/s3Service.js';
import fileValidationService from '../services/fileValidationService.js';
import multer from 'multer';
import logger from '../utils/logger.js';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadDocument = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, documentType = 'document' } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    if (!employeeId) {
      res.status(400).json({ message: 'Employee ID is required' });
      return;
    }

    // Simple validation
    const validation = fileValidationService.validateFile(file);
    if (!validation.isValid) {
      res.status(400).json({
        message: 'File validation failed',
        errors: validation.errors,
      });
      return;
    }

    const isProfilePicture = documentType === 'profile_picture';

    // Delete existing file if it exists
    const existingDoc = await EmployeeDocument.findOne({ employeeId, documentType });
    if (existingDoc) {
      await s3Service.deleteFile(existingDoc.s3Url);
      await EmployeeDocument.findByIdAndDelete(existingDoc._id);
    }

    // Upload new file
    const uploadResult = await s3Service.uploadFile(file, employeeId, isProfilePicture);

    // Save to database
    const document = new EmployeeDocument({
      employeeId,
      documentType: documentType || 'document',
      fileName: file.originalname,
      s3Url: uploadResult.url,
    });

    await document.save();

    // Update profile picture in Employee model
    if (isProfilePicture) {
      await Employee.findOneAndUpdate({ employeeId }, { profilePicture: uploadResult.url });
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      document,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Upload error');
    res.status(500).json({ message: 'Failed to upload file' });
  }
};

export const getEmployeeDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const documents = await EmployeeDocument.find({ employeeId });
    res.json({ documents });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Get documents error');
    res.status(500).json({ message: 'Failed to get documents' });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await EmployeeDocument.findById(id);

    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    // Delete from S3
    await s3Service.deleteFile(document.s3Url);

    // Remove profile picture from Employee model if needed
    if (document.documentType === 'profile_picture') {
      await Employee.findOneAndUpdate({ employeeId: document.employeeId }, { profilePicture: null });
    }

    // Delete from database
    await EmployeeDocument.findByIdAndDelete(id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Delete error');
    res.status(500).json({ message: 'Failed to delete document' });
  }
};
