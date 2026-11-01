/**
 * Employee Document Model - TypeScript + Mongoose
 * Employee document storage references (S3 URLs)
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type DocumentType =
  | 'Resume'
  | 'Offer Letter'
  | 'ID Proof'
  | 'Address Proof'
  | 'Education Certificate'
  | 'Experience Letter'
  | 'PAN Card'
  | 'Aadhaar Card'
  | 'Passport'
  | 'Bank Statement'
  | 'Other';

export interface IEmployeeDocumentDoc extends Document {
  employee?: mongoose.Types.ObjectId;
  employeeId: string;
  documentType: DocumentType | string;
  fileName: string;
  s3Url: string;
  fileSize?: number;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const employeeDocumentSchema = new Schema<IEmployeeDocumentDoc>(
  {
    // The link. Not required only so pre-backfill documents still save.
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    // Display label, kept in sync by services/employeeIdRename.ts. Never join on it.
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    s3Url: {
      type: String,
      required: [true, 'S3 URL is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      min: [0, 'File size cannot be negative'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
employeeDocumentSchema.index({ employee: 1, documentType: 1 });
employeeDocumentSchema.index({ createdAt: -1 });

const EmployeeDocument = mongoose.model<IEmployeeDocumentDoc>(
  'EmployeeDocument',
  employeeDocumentSchema
);

export default EmployeeDocument;
