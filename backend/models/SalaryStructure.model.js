import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
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
  grossSalary: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

// Calculate gross salary before saving
salaryStructureSchema.pre('save', function(next) {
  const earnings = this.earnings;
  this.grossSalary = earnings.basic + earnings.hra + earnings.conveyance + 
                    earnings.medical + earnings.lta + earnings.specialAllowance + 
                    earnings.mobileAllowance;
  next();
});

// Add indexes for better performance
salaryStructureSchema.index({ isActive: 1 });

const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);

export default SalaryStructure; 