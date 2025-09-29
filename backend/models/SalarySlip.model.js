import mongoose from "mongoose";

const salarySlipSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  earnings: {
    basic: {
      type: Number,
      required: true,
      min: 0
    },
    hra: {
      type: Number,
      default: 0,
      min: 0
    },
    conveyance: {
      type: Number,
      default: 0,
      min: 0
    },
    medical: {
      type: Number,
      default: 0,
      min: 0
    },
    lta: {
      type: Number,
      default: 0,
      min: 0
    },
    specialAllowance: {
      type: Number,
      default: 0,
      min: 0
    },
    mobileAllowance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  deductions: {
    incomeTax: {
      type: Number,
      default: 0,
      min: 0
    },
    customDeductions: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  },
  grossSalary: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  netSalaryInWords: {
    type: String,
    default: 'Zero Rupees Only'
  },
  taxRegime: {
    type: String,
    enum: ["old", "new"],
    default: "new"
  },
  enableTaxDeduction: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["draft", "finalized"],
    default: "draft"
  }
}, { timestamps: true });

// Calculate gross salary and tax before saving
salarySlipSchema.pre('save', function(next) {
  try {
    const earnings = this.earnings;
    this.grossSalary = earnings.basic + earnings.hra + earnings.conveyance + 
                      earnings.medical + earnings.lta + earnings.specialAllowance + 
                      earnings.mobileAllowance;
    
    // Ensure deductions object exists
    if (!this.deductions) {
      this.deductions = { incomeTax: 0, customDeductions: [] };
    }
    
    // Calculate custom deductions total first
    const customDeductionsTotal = (this.deductions.customDeductions || []).reduce((sum, deduction) => sum + deduction.amount, 0);
    
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
    console.error('Error in SalarySlip pre-save hook:', error);
    next(error);
  }
});

// Method to calculate income tax
salarySlipSchema.methods.calculateIncomeTax = function(annualSalary, regime = 'new') {
  if (regime === 'new') {
    return this.calculateNewRegimeTax(annualSalary);
  } else {
    return this.calculateOldRegimeTax(annualSalary);
  }
};

// New tax regime calculation (FY 2024-25)
salarySlipSchema.methods.calculateNewRegimeTax = function(annualSalary) {
  // Standard deduction for salaried employees
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualSalary - standardDeduction);
  
  let tax = 0;
  
  // New regime tax slabs for FY 2024-25
  if (taxableIncome <= 300000) {
    tax = 0;
  } else if (taxableIncome <= 700000) {
    tax = (taxableIncome - 300000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    tax = 400000 * 0.05 + (taxableIncome - 700000) * 0.10;
  } else if (taxableIncome <= 1200000) {
    tax = 400000 * 0.05 + 300000 * 0.10 + (taxableIncome - 1000000) * 0.15;
  } else if (taxableIncome <= 1500000) {
    tax = 400000 * 0.05 + 300000 * 0.10 + 200000 * 0.15 + (taxableIncome - 1200000) * 0.20;
  } else {
    tax = 400000 * 0.05 + 300000 * 0.10 + 200000 * 0.15 + 300000 * 0.20 + (taxableIncome - 1500000) * 0.30;
  }
  
  // Apply rebate under Section 87A (up to Rs. 25,000 for income up to Rs. 7,00,000)
  if (taxableIncome <= 700000) {
    tax = Math.max(0, tax - 25000);
  }
  
  // Add health and education cess (4%)
  tax = tax * 1.04;
  
  return Math.max(0, tax);
};

// Old tax regime calculation (FY 2024-25)
salarySlipSchema.methods.calculateOldRegimeTax = function(annualSalary) {
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
    tax = 250000 * 0.05 + (taxableIncome - 500000) * 0.20;
  } else {
    tax = 250000 * 0.05 + 500000 * 0.20 + (taxableIncome - 1000000) * 0.30;
  }
  
  // Apply rebate under Section 87A (up to Rs. 12,500 for income up to Rs. 5,00,000)
  if (taxableIncome <= 500000) {
    tax = Math.max(0, tax - 12500);
  }
  
  // Add health and education cess (4%)
  tax = tax * 1.04;
  
  return Math.max(0, tax);
};

// Method to convert number to words
salarySlipSchema.methods.convertToWords = function(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertThreeDigit(num) {
    let result = '';
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      num = 0;
    }
    if (num > 0) {
      result += ones[num] + ' ';
    }
    return result;
  }

  if (amount === 0) return 'Zero Rupees Only';
  
  let rupees = Math.floor(amount);
  let paise = Math.round((amount - rupees) * 100);
  
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

// Ensure unique salary slip per employee per month/year
salarySlipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const SalarySlip = mongoose.model("SalarySlip", salarySlipSchema);

export default SalarySlip; 