import { formatResponse } from "../utils/response.js";
import { validateRequiredFields, sanitizeInput } from "../utils/helpers.js";

/**
 * Generic validation middleware factory
 * @param {Object} validationRules - Validation rules object
 * @returns {Function} Express middleware function
 */
export const validateRequest = (validationRules) => {
  return (req, res, next) => {
    const errors = {};
    
    // Check required fields
    if (validationRules.required) {
      const { isValid, missingFields } = validateRequiredFields(req.body, validationRules.required);
      if (!isValid) {
        errors.required = `Missing required fields: ${missingFields.join(', ')}`;
      }
    }
    
    // Validate email format
    if (validationRules.email && req.body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    // Validate phone number
    if (validationRules.phone && req.body.phone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(req.body.phone)) {
        errors.phone = 'Phone number must be 10 digits';
      }
    }
    
    // Validate password strength
    if (validationRules.password && req.body.password) {
      const password = req.body.password;
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }
    
    // Validate date format
    if (validationRules.date) {
      validationRules.date.forEach(field => {
        if (req.body[field]) {
          const date = new Date(req.body[field]);
          if (isNaN(date.getTime())) {
            errors[field] = `Invalid date format for ${field}`;
          }
        }
      });
    }
    
    // Validate numeric fields
    if (validationRules.numeric) {
      validationRules.numeric.forEach(field => {
        if (req.body[field] !== undefined) {
          const value = parseFloat(req.body[field]);
          if (isNaN(value) || value < 0) {
            errors[field] = `${field} must be a valid positive number`;
          }
        }
      });
    }
    
    // Validate enum fields
    if (validationRules.enum) {
      Object.keys(validationRules.enum).forEach(field => {
        if (req.body[field] && !validationRules.enum[field].includes(req.body[field])) {
          errors[field] = `${field} must be one of: ${validationRules.enum[field].join(', ')}`;
        }
      });
    }
    
    // Sanitize string inputs
    if (validationRules.sanitize) {
      validationRules.sanitize.forEach(field => {
        if (req.body[field]) {
          req.body[field] = sanitizeInput(req.body[field]);
        }
      });
    }
    
    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return res.status(400).json(formatResponse(false, 'Validation failed', null, errors));
    }
    
    next();
  };
};

// Pre-defined validation rules for common endpoints
export const validationRules = {
  login: {
    required: ['email', 'password'],
    email: true,
    sanitize: ['email']
  },
  
  register: {
    required: ['email', 'password', 'employeeId', 'role'],
    email: true,
    password: true,
    enum: {
      role: ['admin', 'hr', 'employee']
    },
    sanitize: ['email', 'employeeId']
  },
  
  createEmployee: {
    required: ['firstName', 'lastName', 'email', 'phone', 'department', 'designation'],
    email: true,
    phone: true,
    sanitize: ['firstName', 'lastName', 'email', 'department', 'designation']
  },
  
  updateEmployee: {
    email: true,
    phone: true,
    sanitize: ['firstName', 'lastName', 'email', 'department', 'designation']
  },
  
  createLeave: {
    required: ['leaveType', 'startDate', 'endDate', 'reason'],
    date: ['startDate', 'endDate'],
    enum: {
      leaveType: ['casual', 'sick', 'annual', 'maternity', 'paternity']
    },
    sanitize: ['reason']
  },
  
  createSalarySlip: {
    required: ['employeeId', 'month', 'year'],
    numeric: ['month', 'year', 'basicSalary'],
    sanitize: ['employeeId']
  },
  
  passwordReset: {
    required: ['name', 'email'],
    email: true,
    sanitize: ['name', 'email']
  },
  
  resetPassword: {
    required: ['resetToken', 'newPassword'],
    password: true,
    sanitize: ['resetToken']
  },
  
  createAnnouncement: {
    required: ['title', 'content', 'priority', 'targetAudience'],
    enum: {
      priority: ['low', 'medium', 'high', 'urgent'],
      targetAudience: ['all', 'hr', 'employees', 'management']
    },
    sanitize: ['title', 'content']
  },
  
  createHoliday: {
    required: ['name', 'date', 'type'],
    date: ['date'],
    enum: {
      type: ['public', 'optional', 'restricted']
    },
    sanitize: ['name', 'description']
  },
  
  checkIn: {
    required: ['location'],
    sanitize: ['location', 'notes']
  },
  
  createTaskReport: {
    required: ['taskTitle', 'description', 'hoursWorked', 'date'],
    numeric: ['hoursWorked'],
    date: ['date'],
    sanitize: ['taskTitle', 'description']
  }
};

// Middleware functions for specific endpoints
export const validateLogin = validateRequest(validationRules.login);
export const validateRegister = validateRequest(validationRules.register);
export const validateCreateEmployee = validateRequest(validationRules.createEmployee);
export const validateUpdateEmployee = validateRequest(validationRules.updateEmployee);
export const validateCreateLeave = validateRequest(validationRules.createLeave);
export const validateCreateSalarySlip = validateRequest(validationRules.createSalarySlip);
export const validatePasswordReset = validateRequest(validationRules.passwordReset);
export const validateResetPassword = validateRequest(validationRules.resetPassword);
export const validateCreateAnnouncement = validateRequest(validationRules.createAnnouncement);
export const validateCreateHoliday = validateRequest(validationRules.createHoliday);
export const validateCheckIn = validateRequest(validationRules.checkIn);
export const validateCreateTaskReport = validateRequest(validationRules.createTaskReport);