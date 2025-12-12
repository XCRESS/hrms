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
    },
    
    // Saturday holiday configuration (which Saturdays are holidays)
    saturdayHolidays: {
      type: [Number],
      default: [], // No Saturday holidays by default - all Saturdays are working days
      validate: {
        validator: function(arr) {
          return arr.every(num => num >= 1 && num <= 4);
        },
        message: "Saturday holidays must be between 1-4 (1st, 2nd, 3rd, 4th)"
      },
      description: "Which Saturdays of the month are holidays (1=1st, 2=2nd, 3=3rd, 4=4th). Empty array means all Saturdays are working days."
    }
  },

  // Notification Configuration
  notifications: {
    // HR Contact Information  
    hrEmails: {
      type: [String],
      default: [],
      validate: {
        validator: function(arr) {
          return arr.every(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        },
        message: "All HR emails must be valid email addresses"
      }
    },
    hrPhones: {
      type: [String], 
      default: [],
      validate: {
        validator: function(arr) {
          return arr.every(phone => /^\+91[0-9]{10}$/.test(phone));
        },
        message: "All HR phones must be valid Indian numbers (+91xxxxxxxxxx)"
      }
    },
    
    // Channel Toggle Settings
    emailEnabled: { type: Boolean, default: true },
    whatsappEnabled: { type: Boolean, default: false },
    pushEnabled: { type: Boolean, default: true },
    
    // Holiday Reminder Configuration
    holidayReminderEnabled: { type: Boolean, default: true },
    holidayReminderDays: { type: Number, default: 1, min: 0, max: 7 },
    
    // Employee Milestone Alerts
    milestoneAlertsEnabled: { type: Boolean, default: true },
    milestoneTypes: {
      threeMonths: { type: Boolean, default: true },
      sixMonths: { type: Boolean, default: true },
      oneYear: { type: Boolean, default: true }
    },

    // Daily HR Attendance Report Configuration
    dailyHrAttendanceReport: {
      enabled: {
        type: Boolean,
        default: false,
        description: "Enable/disable daily attendance report to HR team"
      },
      sendTime: {
        type: String,
        default: "19:00",
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        description: "Time to send daily HR attendance report (IST, 24-hour format)"
      },
      includeAbsentees: {
        type: Boolean,
        default: true,
        description: "Include employees who did not check in"
      },
      subjectLine: {
        type: String,
        default: "Daily Attendance Report - {date}",
        maxlength: 200,
        description: "Email subject line template (use {date} placeholder)"
      }
    }
  },

  // General Configuration
  general: {
    // Location settings for check-in
    locationSetting: {
      type: String,
      enum: ["na", "optional", "mandatory"],
      default: "na",
      description: "Location requirement for check-in: na=no location fetch, optional=validate if provided, mandatory=require location"
    },
    
    // Task report settings for check-out  
    taskReportSetting: {
      type: String,
      enum: ["na", "optional", "mandatory"],
      default: "na", 
      description: "Task report requirement for check-out: na=direct checkout, optional=prompt after checkout, mandatory=required for checkout"
    },
    geofence: {
      enabled: {
        type: Boolean,
        default: true,
        description: "Toggle geo-fenced attendance enforcement"
      },
      enforceCheckIn: {
        type: Boolean,
        default: true,
        description: "Require employees to be inside geofence for check-in"
      },
      enforceCheckOut: {
        type: Boolean,
        default: true,
        description: "Require employees to be inside geofence for check-out"
      },
      defaultRadius: {
        type: Number,
        default: 100,
        min: 50,
        max: 1000,
        description: "Default radius in meters when creating office locations"
      },
      allowWFHBypass: {
        type: Boolean,
        default: true,
        description: "Allow Work From Home requests to bypass geofence"
      }
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
        minimumWorkHours: 4,
        fullDayHours: 8,
        workingDays: [1, 2, 3, 4, 5, 6],
        nonWorkingDays: [0],
        saturdayWorkType: "full",
        saturdayHolidays: []
      },
      notifications: {
        hrEmails: [],
        hrPhones: [],
        emailEnabled: true,
        whatsappEnabled: false,
        pushEnabled: true,
        holidayReminderEnabled: true,
        holidayReminderDays: 1,
        milestoneAlertsEnabled: true,
        milestoneTypes: {
          threeMonths: true,
          sixMonths: true,
          oneYear: true
        },
        dailyHrAttendanceReport: {
          enabled: false,
          sendTime: "19:00",
          includeAbsentees: true,
          subjectLine: "Daily Attendance Report - {date}"
        }
      },
      general: {
        locationSetting: "na",
        taskReportSetting: "na",
        geofence: {
          enabled: true,
          enforceCheckIn: true,
          enforceCheckOut: true,
          defaultRadius: 100,
          allowWFHBypass: true
        }
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