/**
 * User Model - TypeScript + Mongoose
 * Authentication and role-based access control
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type { IUser, UserRole } from '../types/index.js';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'hr', 'employee'] as UserRole[],
        message: 'Role must be one of: admin, hr, employee',
      },
      default: 'employee',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    employeeId: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Remove password from JSON responses
        delete ret.password;
        delete ret.resetPasswordToken;
        return ret;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

/**
 * Instance method: Check if user has specific role
 */
userSchema.methods.hasRole = function (role: UserRole): boolean {
  return this.role === role;
};

/**
 * Instance method: Check if user has admin or HR role
 */
userSchema.methods.isAdminOrHR = function (): boolean {
  return this.role === 'admin' || this.role === 'hr';
};

/**
 * Static method: Find user by email
 */
userSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Static method: Find active users by role
 */
userSchema.statics.findActiveByRole = function (role: UserRole): Promise<IUser[]> {
  return this.find({ role, isActive: true });
};

// Add custom methods to IUser interface
declare module '../types/index.js' {
  interface IUser {
    hasRole(role: UserRole): boolean;
    isAdminOrHR(): boolean;
  }
}

// Add custom static methods to the model
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findActiveByRole(role: UserRole): Promise<IUser[]>;
}

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
