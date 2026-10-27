/**
 * Company Model - TypeScript + Mongoose
 * Legal entities employees are employed by; the name and address head salary slips.
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ICompanyDoc extends Document {
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompanyDoc>(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Company address cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Case-insensitive uniqueness. Employee.companyName stores the exact string,
// so lookups by name stay plain equality.
companySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Company = mongoose.model<ICompanyDoc>('Company', companySchema);

export default Company;
