import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  // Attendance Configuration
  attendance: {
    // Time settings in 24-hour format (HH:MM) for backend calculations
    lateThreshold: {
      type: String,
      default: "09:55",
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      description: "Time after which arrival is considered late (24-hour format)"
    },
    workStartTime: {
      type: String,
      default: "09:00",
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      description: "Standard work start time (24-hour format)"
    },
    workEndTime: {
      type: String,
      default: "18:00",
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      description: "Standard work end time (24-hour format)"
    },
    halfDayEndTime: {
      type: String,
      default: "13:00",
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      description: "End time for half-day work (24-hour format)"
    },
    lateArrivalTime: {
      type: String,
      default: "10:15",
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      description: "Time after which arrival is considered significantly late (24-hour format)"
    },
    
    // Work hours thresholds
    minimumWorkHours: {
      type: Number,
      default: 4,
      min: 0,
      max: 24,
      description: "Minimum hours required for attendance"
    },
    fullDayHours: {
      type: Number,
      default: 8,
      min: 0,
      max: 24,
      description: "Hours required for full day attendance"
    },
    halfDayHours: {
      type: Number,
      default: 4,
      min: 0,
      max: 24,
      description: "Hours required for half day attendance"
    },
    
    // Working days configuration
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      description: "Working days of the week (0=Sunday, 1=Monday, etc.)"
    },
    nonWorkingDays: {
      type: [Number],
      default: [0], // Sunday
      description: "Non-working days of the week (0=Sunday, 1=Monday, etc.)"
    },
    
    // Saturday configuration
    saturdayWorkType: {
      type: String,
      enum: ["full", "half"],
      default: "full",
      description: "Saturday work policy: full-day or half-day"
    }
  },

  // Scope Configuration
  scope: {
    type: String,
    enum: ["global", "department"],
    default: "global",
    description: "Scope of these settings"
  },
  
  // Department-specific settings
  department: {
    type: String,
    description: "Department these settings apply to (if scope is department)"
  },

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  
  version: {
    type: String,
    default: "1.0.0",
    description: "Settings schema version"
  }
}, {
  timestamps: true,
  collection: "settings"
});

// Indexes for better performance
settingsSchema.index({ scope: 1, department: 1 }, { unique: true, sparse: true });
settingsSchema.index({ scope: 1 }, { unique: true, partialFilterExpression: { scope: "global" } });
settingsSchema.index({ lastUpdatedBy: 1 });

// Ensure only one global settings document and validate department
settingsSchema.pre('save', function(next) {
  if (this.scope === 'global') {
    this.department = undefined;
  } else if (this.scope === 'department' && !this.department) {
    return next(new Error('Department is required when scope is department'));
  }
  next();
});

// Helper method to convert 24-hour time to decimal hours for calculations
settingsSchema.statics.timeToDecimal = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
};

// Helper method to convert decimal hours to 24-hour format
settingsSchema.statics.decimalToTime24 = function(decimal) {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${formattedHours}:${formattedMinutes}`;
};

// Helper method to convert 24-hour format to 12-hour format for frontend display
settingsSchema.statics.time24To12 = function(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  
  let displayHours = hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) {
    displayHours = 12;
  } else if (hours > 12) {
    displayHours = hours - 12;
  }
  
  const formattedHours = displayHours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${formattedHours}:${formattedMinutes} ${period}`;
};

// Helper method to convert 12-hour format to 24-hour format from frontend
settingsSchema.statics.time12To24 = function(time12) {
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  const formattedHours = hour24.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${formattedHours}:${formattedMinutes}`;
};

// Static method to get global settings or create default if not exists
settingsSchema.statics.getGlobalSettings = async function() {
  let settings = await this.findOne({ scope: "global" });
  
  if (!settings) {
    // Create default global settings with complete structure
    settings = new this({ 
      scope: "global",
      attendance: {
        lateThreshold: "09:55",
        workStartTime: "09:00",
        workEndTime: "18:00",
        halfDayEndTime: "13:00",
        lateArrivalTime: "10:15",
        minimumWorkHours: 4,
        fullDayHours: 8,
        halfDayHours: 4,
        workingDays: [1, 2, 3, 4, 5, 6],
        nonWorkingDays: [0],
        saturdayWorkType: "full"
      },
      lastUpdatedBy: null
    });
    await settings.save();
  }
  
  return settings;
};

// Method to get settings for a specific department
settingsSchema.statics.getDepartmentSettings = async function(department) {
  return await this.findOne({ scope: "department", department });
};

// Method to get effective settings (department > global)
settingsSchema.statics.getEffectiveSettings = async function(department = null) {
  const globalSettings = await this.getGlobalSettings();
  let effectiveSettings = globalSettings.toObject();
  
  // Override with department settings if available
  if (department) {
    const departmentSettings = await this.getDepartmentSettings(department);
    if (departmentSettings) {
      effectiveSettings = this.mergeSettings(effectiveSettings, departmentSettings.toObject());
    }
  }
  
  return effectiveSettings;
};

// Helper method to merge settings objects
settingsSchema.statics.mergeSettings = function(base, override) {
  const result = { ...base };
  
  Object.keys(override).forEach(key => {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') {
      return; // Skip metadata fields
    }
    
    if (override[key] !== null && override[key] !== undefined) {
      if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.mergeSettings(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
  });
  
  return result;
};

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;