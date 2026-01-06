/**
 * Salary Slip Model - TypeScript + Mongoose
 * Monthly salary slip generation with tax calculation
 */

import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Custom Deduction interface
 */
export interface ICustomDeduction {
  name: string;
  amount: number;
}

/**
 * Earnings interface (embedded object)
 */
export interface ISalaryEarnings {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  lta: number;
  specialAllowance: number;
  mobileAllowance: number;
}

/**
 * Deductions interface (embedded object)
 */
export interface ISalaryDeductions {
  incomeTax: number;
  customDeductions: ICustomDeduction[];
}

/**
 * Tax Regime type
 */
export type TaxRegime = 'old' | 'new';

/**
 * Salary Slip Status type
 */
export type SalarySlipStatus = 'draft' | 'finalized';

/**
 * Salary Slip Document interface
 */
export interface ISalarySlipDoc extends mongoose.Document {
  employee: mongoose.Types.ObjectId;
  employeeId: string;
  month: number;
  year: number;
  earnings: ISalaryEarnings;
  deductions: ISalaryDeductions;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  netSalaryInWords: string;
  taxRegime: TaxRegime;
  enableTaxDeduction: boolean;
  createdBy: mongoose.Types.ObjectId;
  status: SalarySlipStatus;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateIncomeTax(annualSalary: number, regime: TaxRegime): number;
  calculateNewRegimeTax(annualSalary: number): number;
  calculateOldRegimeTax(annualSalary: number): number;
  convertToWords(amount: number): string;
  finalize(): Promise<ISalarySlipDoc>;
}

const salarySlipSchema = new Schema<ISalarySlipDoc>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2020, 'Year must be 2020 or later'],
    },
    earnings: {
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
        min: [0, 'Conveyance cannot be negative'],
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
    deductions: {
      incomeTax: {
        type: Number,
        default: 0,
        min: [0, 'Income tax cannot be negative'],
      },
      customDeductions: [
        {
          name: {
            type: String,
            required: [true, 'Deduction name is required'],
            trim: true,
          },
          amount: {
            type: Number,
            required: [true, 'Deduction amount is required'],
            min: [0, 'Deduction amount cannot be negative'],
          },
        },
      ],
    },
    grossSalary: {
      type: Number,
      default: 0,
      min: [0, 'Gross salary cannot be negative'],
    },
    totalDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Total deductions cannot be negative'],
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    netSalaryInWords: {
      type: String,
      default: 'Zero Rupees Only',
    },
    taxRegime: {
      type: String,
      enum: {
        values: ['old', 'new'],
        message: 'Tax regime must be either "old" or "new"',
      },
      default: 'new',
    },
    enableTaxDeduction: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'finalized'],
        message: 'Status must be either "draft" or "finalized"',
      },
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: Calculate gross salary, tax, and net salary
 */
salarySlipSchema.pre('save', function (next) {
  try {
    const earnings = this.earnings;
    this.grossSalary =
      earnings.basic +
      earnings.hra +
      earnings.conveyance +
      earnings.medical +
      earnings.lta +
      earnings.specialAllowance +
      earnings.mobileAllowance;

    // Ensure deductions object exists
    if (!this.deductions) {
      this.deductions = { incomeTax: 0, customDeductions: [] };
    }

    // Calculate custom deductions total first
    const customDeductionsTotal = (this.deductions.customDeductions || []).reduce(
      (sum, deduction) => sum + deduction.amount,
      0
    );

    // Calculate income tax only if tax deduction is enabled
    if (this.enableTaxDeduction) {
      // Calculate taxable income (gross salary minus custom deductions)
      const taxableMonthlyIncome = this.grossSalary - customDeductionsTotal;
      const annualTaxableIncome = Math.max(0, taxableMonthlyIncome * 12);

      // Calculate income tax based on selected regime on taxable income
      this.deductions.incomeTax = this.calculateIncomeTax(annualTaxableIncome, this.taxRegime) / 12;
    } else {
      // Set income tax to 0 if tax deduction is disabled
      this.deductions.incomeTax = 0;
    }

    // Calculate total deductions (custom deductions already calculated above)
    this.totalDeductions = this.deductions.incomeTax + customDeductionsTotal;
    this.netSalary = this.grossSalary - this.totalDeductions;

    // Convert net salary to words
    this.netSalaryInWords = this.convertToWords(this.netSalary);

    next();
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error in SalarySlip pre-save');
    next(err);
  }
});

/**
 * Method to calculate income tax
 */
salarySlipSchema.methods.calculateIncomeTax = function (
  this: ISalarySlipDoc,
  annualSalary: number,
  regime: TaxRegime = 'new'
): number {
  if (regime === 'new') {
    return this.calculateNewRegimeTax(annualSalary);
  } else {
    return this.calculateOldRegimeTax(annualSalary);
  }
};

/**
 * New tax regime calculation (FY 2025-26)
 */
salarySlipSchema.methods.calculateNewRegimeTax = function (
  this: ISalarySlipDoc,
  annualSalary: number
): number {
  // Standard deduction for salaried employees
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualSalary - standardDeduction);

  let tax = 0;

  // New regime tax slabs for FY 2025-26 as per Budget 2025
  if (taxableIncome <= 400000) {
    tax = 0;
  } else if (taxableIncome <= 800000) {
    tax = (taxableIncome - 400000) * 0.05;
  } else if (taxableIncome <= 1200000) {
    tax = 400000 * 0.05 + (taxableIncome - 800000) * 0.1;
  } else if (taxableIncome <= 1600000) {
    tax = 400000 * 0.05 + 400000 * 0.1 + (taxableIncome - 1200000) * 0.15;
  } else if (taxableIncome <= 2000000) {
    tax = 400000 * 0.05 + 400000 * 0.1 + 400000 * 0.15 + (taxableIncome - 1600000) * 0.2;
  } else if (taxableIncome <= 2400000) {
    tax =
      400000 * 0.05 +
      400000 * 0.1 +
      400000 * 0.15 +
      400000 * 0.2 +
      (taxableIncome - 2000000) * 0.25;
  } else {
    tax =
      400000 * 0.05 +
      400000 * 0.1 +
      400000 * 0.15 +
      400000 * 0.2 +
      400000 * 0.25 +
      (taxableIncome - 2400000) * 0.3;
  }

  // Apply enhanced rebate under Section 87A (up to Rs. 60,000 for income up to Rs. 12,00,000)
  if (taxableIncome <= 1200000) {
    tax = Math.max(0, tax - 60000);
  }

  // Add health and education cess (4%)
  tax = tax * 1.04;

  return Math.max(0, tax);
};

/**
 * Old tax regime calculation (FY 2025-26)
 */
salarySlipSchema.methods.calculateOldRegimeTax = function (
  this: ISalarySlipDoc,
  annualSalary: number
): number {
  // Standard deduction for salaried employees in old regime
  const standardDeduction = 50000;
  let taxableIncome = Math.max(0, annualSalary - standardDeduction);

  // Assume some basic deductions (this can be customized)
  const section80CDeduction = Math.min(150000, taxableIncome * 0.1); // Assuming 10% for 80C
  taxableIncome = Math.max(0, taxableIncome - section80CDeduction);

  let tax = 0;

  // Old regime tax slabs
  if (taxableIncome <= 250000) {
    tax = 0;
  } else if (taxableIncome <= 500000) {
    tax = (taxableIncome - 250000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    tax = 250000 * 0.05 + (taxableIncome - 500000) * 0.2;
  } else {
    tax = 250000 * 0.05 + 500000 * 0.2 + (taxableIncome - 1000000) * 0.3;
  }

  // Apply rebate under Section 87A (up to Rs. 12,500 for income up to Rs. 5,00,000)
  if (taxableIncome <= 500000) {
    tax = Math.max(0, tax - 12500);
  }

  // Add health and education cess (4%)
  tax = tax * 1.04;

  return Math.max(0, tax);
};

/**
 * Method to convert number to words (Indian currency format)
 */
salarySlipSchema.methods.convertToWords = function (this: ISalarySlipDoc, amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertThreeDigit(num: number): string {
    let result = '';
    if (num >= 100) {
      const hundredDigit = ones[Math.floor(num / 100)];
      if (hundredDigit) {
        result += hundredDigit + ' Hundred ';
      }
      num %= 100;
    }
    if (num >= 20) {
      const tenDigit = tens[Math.floor(num / 10)];
      if (tenDigit) {
        result += tenDigit + ' ';
      }
      num %= 10;
    } else if (num >= 10) {
      const teenDigit = teens[num - 10];
      if (teenDigit) {
        result += teenDigit + ' ';
      }
      num = 0;
    }
    if (num > 0) {
      const oneDigit = ones[num];
      if (oneDigit) {
        result += oneDigit + ' ';
      }
    }
    return result;
  }

  if (amount === 0) return 'Zero Rupees Only';

  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';

  if (rupees >= 10000000) {
    result += convertThreeDigit(Math.floor(rupees / 10000000)) + 'Crore ';
    rupees %= 10000000;
  }
  if (rupees >= 100000) {
    result += convertThreeDigit(Math.floor(rupees / 100000)) + 'Lakh ';
    rupees %= 100000;
  }
  if (rupees >= 1000) {
    result += convertThreeDigit(Math.floor(rupees / 1000)) + 'Thousand ';
    rupees %= 1000;
  }
  if (rupees > 0) {
    result += convertThreeDigit(rupees);
  }

  result += 'Rupees';

  if (paise > 0) {
    result += ' and ' + convertThreeDigit(paise) + 'Paise';
  }

  result += ' Only';
  return result.trim();
};

/**
 * Instance method: Finalize salary slip
 */
salarySlipSchema.methods.finalize = function (this: ISalarySlipDoc): Promise<ISalarySlipDoc> {
  this.status = 'finalized';
  return this.save();
};

// Indexes for performance
salarySlipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salarySlipSchema.index({ status: 1 });
salarySlipSchema.index({ createdAt: -1 });

/**
 * Extend model with static methods
 */
interface ISalarySlipModel extends Model<ISalarySlipDoc> {
  findByEmployee(employeeId: mongoose.Types.ObjectId): Promise<ISalarySlipDoc[]>;
  findByMonthYear(month: number, year: number): Promise<ISalarySlipDoc[]>;
  findFinalized(year?: number, month?: number): Promise<ISalarySlipDoc[]>;
}

/**
 * Static method: Find salary slips by employee
 */
salarySlipSchema.static('findByEmployee', function (employeeId: mongoose.Types.ObjectId) {
  return this.find({ employee: employeeId }).sort({ year: -1, month: -1 });
});

/**
 * Static method: Find salary slips by month and year
 */
salarySlipSchema.static('findByMonthYear', function (month: number, year: number) {
  return this.find({ month, year }).populate('employee', 'firstName lastName employeeId');
});

/**
 * Static method: Find finalized salary slips
 */
salarySlipSchema.static('findFinalized', function (year?: number, month?: number) {
  const query: Record<string, unknown> = { status: 'finalized' };
  if (year) query.year = year;
  if (month) query.month = month;
  return this.find(query).populate('employee', 'firstName lastName employeeId department');
});

const SalarySlip = mongoose.model<ISalarySlipDoc, ISalarySlipModel>('SalarySlip', salarySlipSchema);

export default SalarySlip;
