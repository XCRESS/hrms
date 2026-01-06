/**
 * Salary Structure Model - TypeScript + Mongoose
 * Employee salary components and gross salary calculation
 */

import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Earnings sub-schema interface
 */
export interface IEarnings {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  lta: number;
  specialAllowance: number;
  mobileAllowance: number;
}

/**
 * Salary Structure Document interface
 */
export interface ISalaryStructureDoc extends mongoose.Document {
  employee: mongoose.Types.ObjectId;
  employeeId: string;
  earnings: IEarnings;
  grossSalary: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  annualGrossSalary: number;
  hraPercentage: number;
}

const earningsSchema = new Schema<IEarnings>(
  {
    basic: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative'],
    },
    hra: {
      type: Number,
      default: 0,
      min: [0, 'HRA cannot be negative'],
    },
    conveyance: {
      type: Number,
      default: 0,
      min: [0, 'Conveyance allowance cannot be negative'],
    },
    medical: {
      type: Number,
      default: 0,
      min: [0, 'Medical allowance cannot be negative'],
    },
    lta: {
      type: Number,
      default: 0,
      min: [0, 'LTA cannot be negative'],
    },
    specialAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Special allowance cannot be negative'],
    },
    mobileAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Mobile allowance cannot be negative'],
    },
  },
  { _id: false }
);

const salaryStructureSchema = new Schema<ISalaryStructureDoc>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
    },
    earnings: {
      type: earningsSchema,
      required: [true, 'Earnings details are required'],
    },
    grossSalary: {
      type: Number,
      default: 0,
      min: [0, 'Gross salary cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Pre-save hook: Calculate gross salary automatically
 */
salaryStructureSchema.pre('save', function (next) {
  this.grossSalary =
    this.earnings.basic +
    this.earnings.hra +
    this.earnings.conveyance +
    this.earnings.medical +
    this.earnings.lta +
    this.earnings.specialAllowance +
    this.earnings.mobileAllowance;
  next();
});

/**
 * Virtual: Calculate annual gross salary
 */
salaryStructureSchema.virtual('annualGrossSalary').get(function (this: ISalaryStructureDoc) {
  return this.grossSalary * 12;
});

/**
 * Virtual: Calculate HRA percentage of basic
 */
salaryStructureSchema.virtual('hraPercentage').get(function (this: ISalaryStructureDoc) {
  if (this.earnings.basic === 0) return 0;
  return Math.round((this.earnings.hra / this.earnings.basic) * 100);
});

// Indexes for performance
salaryStructureSchema.index({ isActive: 1 });
salaryStructureSchema.index({ employee: 1 }, { unique: true });

/**
 * Extend model with static methods
 */
interface ISalaryStructureModel extends Model<ISalaryStructureDoc> {
  findActive(): Promise<ISalaryStructureDoc[]>;
  findByEmployee(employeeId: mongoose.Types.ObjectId): Promise<ISalaryStructureDoc | null>;
}

/**
 * Static method: Find active salary structures
 */
salaryStructureSchema.static('findActive', function () {
  return this.find({ isActive: true }).populate(
    'employee',
    'firstName lastName employeeId department'
  );
});

/**
 * Static method: Find by employee ObjectId
 */
salaryStructureSchema.static('findByEmployee', function (employeeId: mongoose.Types.ObjectId) {
  return this.findOne({ employee: employeeId, isActive: true });
});

const SalaryStructure = mongoose.model<ISalaryStructureDoc, ISalaryStructureModel>(
  'SalaryStructure',
  salaryStructureSchema
);

export default SalaryStructure;
