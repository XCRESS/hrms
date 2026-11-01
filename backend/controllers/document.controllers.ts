import type { UploadDocumentInput } from '../validators/hr.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Request, Response, NextFunction } from 'express';
import EmployeeDocument from '../models/EmployeeDocument.model.js';
import Employee from '../models/Employee.model.js';
import s3Service from '../services/s3Service.js';
import fileValidationService from '../services/fileValidationService.js';
import multer from 'multer';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '../utils/uploadLimits.js';
import logger from '../utils/logger.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response.js';
import { canAccessEmployee, ownsEmployeeRecord, paramValue } from '../utils/helpers.js';
import type { IAuthRequest } from '../types/index.js';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

/**
 * Turns multer's own errors into the standard JSON error shape.
 *
 * Without this, an oversized upload rejects inside `upload.single()` before any
 * handler runs, so the client received an unhandled error rather than a message
 * naming the limit. Wrapping it keeps the limit defined in exactly one place —
 * the client does not need its own copy of the number to report the problem.
 */
export const handleUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('document')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? `File size exceeds ${MAX_UPLOAD_MB}MB limit`
        : err.message;
      res.status(400).json(formatErrorResponse(message));
      return;
    }
    if (err) {
      logger.error({ err }, 'Document upload failed');
      res.status(500).json(formatErrorResponse('Upload failed'));
      return;
    }
    next();
  });
};

interface MulterRequest extends IAuthRequest {
  file?: Express.Multer.File;
}

export const uploadDocument = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { employeeId, documentType } = req.body as UploadDocumentInput;
  const file = req.file;

  if (!file) {
    res.status(400).json(formatErrorResponse('No file uploaded'));
    return;
  }

  if (!employeeId) {
    res.status(400).json(formatErrorResponse('Employee ID is required'));
    return;
  }

  if (!canAccessEmployee(req.user, employeeId)) {
    res.status(403).json(formatErrorResponse('Access forbidden'));
    return;
  }

  // Simple validation
  const validation = fileValidationService.validateFile(file);
  if (!validation.isValid) {
    res.status(400).json(
      formatErrorResponse(
        'File validation failed',
        undefined,
        validation.errors.map((message) => ({ field: 'document', message }))
      )
    );
    return;
  }

  const employee = await Employee.findOne({ employeeId }).select('_id employeeId').lean();
  if (!employee) {
    res.status(404).json(formatErrorResponse('Employee not found'));
    return;
  }

  const isProfilePicture = documentType === 'profile_picture';

  // Delete existing file if it exists
  const existingDoc = await EmployeeDocument.findOne({ employee: employee._id, documentType });
  if (existingDoc) {
    await s3Service.deleteFile(existingDoc.s3Url);
    await EmployeeDocument.findByIdAndDelete(existingDoc._id);
  }

  // Upload new file
  const uploadResult = await s3Service.uploadFile(file, employee.employeeId, isProfilePicture);

  // Save to database
  const document = new EmployeeDocument({
    employee: employee._id,
    employeeId: employee.employeeId,
    documentType: documentType || 'document',
    fileName: file.originalname,
    s3Url: uploadResult.url,
  });

  await document.save();

  // Update profile picture in Employee model
  if (isProfilePicture) {
    await Employee.updateOne({ _id: employee._id }, { profilePicture: uploadResult.url });
  }

  res.status(201).json(formatSuccessResponse('File uploaded successfully', { document }));
});

export const getEmployeeDocuments = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);
  if (!canAccessEmployee(req.user, employeeId)) {
    res.status(403).json(formatErrorResponse('Access forbidden'));
    return;
  }
  const employee = await Employee.findOne({ employeeId }).select('_id').lean();
  const documents = employee ? await EmployeeDocument.find({ employee: employee._id }).lean() : [];
  res.json(formatSuccessResponse('Documents retrieved successfully', { documents }));
});

export const deleteDocument = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const id = paramValue(req.params.id);
  const document = await EmployeeDocument.findById(id);

  if (!document) {
    res.status(404).json(formatErrorResponse('Document not found'));
    return;
  }

  if (!ownsEmployeeRecord(req.user, document.employee)) {
    res.status(403).json(formatErrorResponse('Access forbidden'));
    return;
  }

  // Delete from S3
  await s3Service.deleteFile(document.s3Url);

  // Remove profile picture from Employee model if needed
  if (document.documentType === 'profile_picture') {
    await Employee.updateOne({ _id: document.employee }, { profilePicture: null });
  }

  // Delete from database
  await EmployeeDocument.findByIdAndDelete(id);

  res.json(formatSuccessResponse('Document deleted successfully'));
});
