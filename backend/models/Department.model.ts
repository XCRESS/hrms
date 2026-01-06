/**
 * Department Model - TypeScript + Mongoose
 * Department master data for employee assignment
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface IDepartmentDoc extends Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartmentDoc>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ isActive: 1 });

const Department = mongoose.model<IDepartmentDoc>('Department', departmentSchema);

export default Department;
