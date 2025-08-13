import Settings from "../models/Settings.model.js";
import Employee from "../models/Employee.model.js";
import { formatResponse } from "../utils/response.js";

// Get global settings
export const getGlobalSettings = async (req, res) => {
  try {
    const settings = await Settings.getGlobalSettings();
    
    if (!settings) {
      return res.status(404).json(formatResponse(false, "No global settings found"));
    }
    
    res.json(formatResponse(true, "Global settings retrieved successfully", settings.toObject()));
  } catch (error) {
    console.error("❌ Error fetching global settings:", error);
    console.error("❌ Stack trace:", error.stack);
    res.status(500).json(formatResponse(false, "Server error while fetching settings", error.message));
  }
};

// Update global settings
export const updateGlobalSettings = async (req, res) => {
  try {
    const { attendance } = req.body;
    
    // Validate attendance data
    if (!attendance) {
      return res.status(400).json(formatResponse(false, "Attendance settings are required"));
    }
    
    let settings = await Settings.findOne({ scope: "global" });
    
    if (!settings) {
      // Create new global settings
      settings = new Settings({
        scope: "global",
        attendance,
        lastUpdatedBy: req.user && req.user._id ? req.user._id : null
      });
    } else {
      // Update existing global settings
      if (attendance) {
        settings.attendance = { ...settings.attendance, ...attendance };
      }
      settings.lastUpdatedBy = req.user && req.user._id ? req.user._id : settings.lastUpdatedBy;
    }
    
    const savedSettings = await settings.save();
    
    // Send 24-hour format for consistency
    res.json(formatResponse(true, "Global settings updated successfully", savedSettings.toObject()));
  } catch (error) {
    console.error("❌ Error updating global settings:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error name:", error.name);
    
    if (error.code === 11000) {
      // Duplicate key error
      res.status(409).json(formatResponse(false, "Settings conflict. Please refresh and try again.", error.message));
    } else if (error.name === 'ValidationError') {
      res.status(400).json(formatResponse(false, "Invalid settings data", error.message));
    } else {
      res.status(500).json(formatResponse(false, "Server error while updating settings", error.message));
    }
  }
};

// Get department settings
export const getDepartmentSettings = async (req, res) => {
  try {
    const { department } = req.params;
    
    if (!department) {
      return res.status(400).json(formatResponse(false, "Department parameter is required"));
    }
    
    const settings = await Settings.findOne({ scope: "department", department });
    
    if (!settings) {
      return res.status(404).json(formatResponse(false, "Department settings not found"));
    }
    
    // Send 24-hour format for HTML time inputs
    res.json(formatResponse(true, "Department settings retrieved successfully", settings.toObject()));
  } catch (error) {
    console.error("Error fetching department settings:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching department settings", error.message));
  }
};

// Update or create department settings
export const updateDepartmentSettings = async (req, res) => {
  try {
    const { department } = req.params;
    const { attendance } = req.body;
    
    if (!department) {
      return res.status(400).json(formatResponse(false, "Department parameter is required"));
    }
    
    // Frontend sends 24-hour format already, no conversion needed
    
    let settings = await Settings.findOne({ scope: "department", department });
    
    if (!settings) {
      // Create new department settings
      settings = new Settings({
        scope: "department",
        department,
        attendance,
        lastUpdatedBy: req.user && req.user._id ? req.user._id : null
      });
    } else {
      // Update existing department settings
      if (attendance) {
        settings.attendance = { ...settings.attendance, ...attendance };
      }
      settings.lastUpdatedBy = req.user && req.user._id ? req.user._id : settings.lastUpdatedBy;
    }
    
    await settings.save();
    
    // Send 24-hour format for consistency
    res.json(formatResponse(true, "Department settings updated successfully", settings.toObject()));
  } catch (error) {
    console.error("Error updating department settings:", error);
    res.status(500).json(formatResponse(false, "Server error while updating department settings", error.message));
  }
};

// Delete department settings (falls back to global)
export const deleteDepartmentSettings = async (req, res) => {
  try {
    const { department } = req.params;
    
    if (!department) {
      return res.status(400).json(formatResponse(false, "Department parameter is required"));
    }
    
    const deleted = await Settings.findOneAndDelete({ scope: "department", department });
    
    if (!deleted) {
      return res.status(404).json(formatResponse(false, "Department settings not found"));
    }
    
    res.json(formatResponse(true, "Department settings deleted successfully. Will use global settings."));
  } catch (error) {
    console.error("Error deleting department settings:", error);
    res.status(500).json(formatResponse(false, "Server error while deleting department settings", error.message));
  }
};

// Get effective settings for a department (merges department + global)
export const getEffectiveSettings = async (req, res) => {
  try {
    const { department } = req.query;
    
    const effectiveSettings = await Settings.getEffectiveSettings(department);
    
    // Send 24-hour format for HTML time inputs
    res.json(formatResponse(true, "Effective settings retrieved successfully", effectiveSettings));
  } catch (error) {
    console.error("Error fetching effective settings:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching effective settings", error.message));
  }
};

// Get list of departments from employees
export const getDepartments = async (req, res) => {
  try {
    const departments = await Employee.distinct("department", { isActive: true });
    
    res.json(formatResponse(true, "Departments retrieved successfully", { departments }));
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching departments", error.message));
  }
};

export default {
  getGlobalSettings,
  updateGlobalSettings,
  getDepartmentSettings,
  updateDepartmentSettings,
  deleteDepartmentSettings,
  getEffectiveSettings,
  getDepartments
};