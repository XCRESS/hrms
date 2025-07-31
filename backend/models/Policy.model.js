import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['General', 'HR', 'IT', 'Security', 'Leave', 'Attendance', 'Code of Conduct', 'Safety', 'Other'],
    default: 'General'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
  version: {
    type: Number,
    default: 1
  },
  acknowledgmentRequired: {
    type: Boolean,
    default: false
  },
  targetAudience: {
    type: String,
    enum: ['All Employees', 'HR Only', 'Management Only', 'IT Team', 'Specific Departments'],
    default: 'All Employees'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Index for better query performance
policySchema.index({ title: 1 });
policySchema.index({ category: 1 });
policySchema.index({ isActive: 1 });
policySchema.index({ effectiveDate: -1 });
policySchema.index({ createdAt: -1 });

// Virtual for checking if policy is currently effective
policySchema.virtual('isEffective').get(function() {
  const now = new Date();
  const effective = this.effectiveDate <= now;
  const notExpired = !this.expiryDate || this.expiryDate > now;
  return this.isActive && effective && notExpired;
});

// Static method to get active policies
policySchema.statics.getActivePolicies = function(options = {}) {
  const { category, targetAudience, limit = 10, skip = 0 } = options;
  
  let query = { isActive: true };
  
  // Add current date filter for effective policies
  const now = new Date();
  query.effectiveDate = { $lte: now };
  query.$or = [
    { expiryDate: null },
    { expiryDate: { $gt: now } }
  ];
  
  if (category) query.category = category;
  if (targetAudience) query.targetAudience = targetAudience;
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('lastUpdatedBy', 'firstName lastName')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method to check if policy needs acknowledgment
policySchema.methods.needsAcknowledgment = function() {
  return this.acknowledgmentRequired && this.isEffective;
};

const Policy = mongoose.model('Policy', policySchema);

export default Policy;