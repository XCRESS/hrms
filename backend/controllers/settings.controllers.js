import Settings from "../models/Settings.model.js";
import Employee from "../models/Employee.model.js";
import Department from "../models/Department.model.js";
import SchedulerService from "../services/schedulerService.js";
import { formatResponse } from "../utils/response.js";

// Helper function to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    const { attendance, notifications, general } = req.body;
    
    // Validate that at least one setting type is provided
    if (!attendance && !notifications && !general) {
      return res.status(400).json(formatResponse(false, "At least one settings section is required"));
    }
    
    let settings = await Settings.findOne({ scope: "global" });
    
    if (!settings) {
      // Create new global settings
      const newSettings = {
        scope: "global",
        lastUpdatedBy: req.user && req.user._id ? req.user._id : null
      };
      
      if (attendance) newSettings.attendance = attendance;
      if (notifications) newSettings.notifications = notifications;
      if (general) newSettings.general = general;
      
      settings = new Settings(newSettings);
    } else {
      // Update existing global settings
      if (attendance) {
        settings.attendance = { ...settings.attendance, ...attendance };
      }
      if (notifications) {
        settings.notifications = { ...settings.notifications, ...notifications };
      }
      if (general) {
        settings.general = { ...settings.general, ...general };
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
    const { attendance, general } = req.body;
    
    if (!department) {
      return res.status(400).json(formatResponse(false, "Department parameter is required"));
    }
    
    // Frontend sends 24-hour format already, no conversion needed
    
    let settings = await Settings.findOne({ scope: "department", department });
    
    if (!settings) {
      // Create new department settings
      const newSettings = {
        scope: "department",
        department,
        lastUpdatedBy: req.user && req.user._id ? req.user._id : null
      };
      if (attendance) newSettings.attendance = attendance;
      if (general) newSettings.general = general;
      
      settings = new Settings(newSettings);
    } else {
      // Update existing department settings
      if (attendance) {
        settings.attendance = { ...settings.attendance, ...attendance };
      }
      if (general) {
        settings.general = { ...settings.general, ...general };
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

// Get list of departments from Department model
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .select('name')
      .sort({ name: 1 })
      .lean();
    
    const departmentNames = departments.map(dept => dept.name);
    
    res.json(formatResponse(true, "Departments retrieved successfully", { departments: departmentNames }));
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching departments", error.message));
  }
};

// Get departments with statistics and employee lists
export const getDepartmentStats = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const employees = await Employee.find(
          { department: dept.name, isActive: true },
          { firstName: 1, lastName: 1, employeeId: 1, email: 1, joiningDate: 1 }
        ).sort({ firstName: 1, lastName: 1 });
        
        return {
          _id: dept._id,
          name: dept.name,
          isActive: dept.isActive,
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt,
          employeeCount: employees.length,
          employees: employees
        };
      })
    );
    
    // Sort by employee count (descending) then by name
    departmentStats.sort((a, b) => {
      if (b.employeeCount !== a.employeeCount) {
        return b.employeeCount - a.employeeCount;
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json(formatResponse(true, "Department statistics retrieved successfully", { departments: departmentStats }));
  } catch (error) {
    console.error("Error fetching department stats:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching department statistics", error.message));
  }
};

// Add a new department
export const addDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json(formatResponse(false, "Department name is required"));
    }
    
    const trimmedName = name.trim();

    // Check if department already exists (case-insensitive)
    const existingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
      isActive: true
    });
    
    if (existingDepartment) {
      return res.status(409).json(formatResponse(false, "Department already exists", { existingName: existingDepartment.name }));
    }
    
    // Create department in Department model
    const department = await Department.create({ name: trimmedName });
    
    res.json(formatResponse(true, "Department created successfully", { 
      _id: department._id,
      name: department.name,
      isActive: department.isActive,
      createdAt: department.createdAt,
      employeeCount: 0
    }));
  } catch (error) {
    console.error("Error adding department:", error);
    
    // Handle mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(409).json(formatResponse(false, "Department already exists"));
    }
    
    res.status(500).json(formatResponse(false, "Server error while adding department", error.message));
  }
};

// Rename a department
export const renameDepartment = async (req, res) => {
  try {
    const { oldName } = req.params;
    const { newName } = req.body;
    
    if (!oldName || !newName || !newName.trim()) {
      return res.status(400).json(formatResponse(false, "Both old and new department names are required"));
    }
    
    const trimmedNewName = newName.trim();

    // Check if new name already exists (case-insensitive)
    const conflictingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedNewName)}$`, 'i') },
      isActive: true
    });
    
    if (conflictingDepartment && conflictingDepartment.name !== oldName) {
      return res.status(409).json(formatResponse(false, "Department name already exists", { existingName: conflictingDepartment.name }));
    }
    
    // Find department to rename
    const department = await Department.findOne({ name: oldName, isActive: true });
    if (!department) {
      return res.status(404).json(formatResponse(false, "Department not found", { requestedName: oldName }));
    }
    
    // Update department name
    await Department.findByIdAndUpdate(department._id, { name: trimmedNewName });
    
    // Update all employees with the old department name
    const employeeUpdateResult = await Employee.updateMany(
      { department: oldName, isActive: true },
      { $set: { department: trimmedNewName } }
    );
    
    // Update department-specific settings if they exist
    const settingsUpdateResult = await Settings.updateMany(
      { scope: "department", department: oldName },
      { $set: { department: trimmedNewName } }
    );
    
    res.json(formatResponse(true, "Department renamed successfully", {
      oldName,
      newName: trimmedNewName,
      employeesUpdated: employeeUpdateResult.modifiedCount,
      settingsUpdated: settingsUpdateResult.modifiedCount
    }));
  } catch (error) {
    console.error("Error renaming department:", error);
    res.status(500).json(formatResponse(false, "Server error while renaming department", error.message));
  }
};

// Delete a department  
export const deleteDepartment = async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json(formatResponse(false, "Department name is required"));
    }
    
    // Find department to delete
    const department = await Department.findOne({ name, isActive: true });
    if (!department) {
      return res.status(404).json(formatResponse(false, "Department not found", { requestedName: name }));
    }
    
    // Count employees that will be affected
    const employeeCount = await Employee.countDocuments({ department: name, isActive: true });
    
    // Properly delete department
    await Department.findByIdAndDelete(department._id);
    
    // Remove department from all employees (set to null)
    const employeeUpdateResult = await Employee.updateMany(
      { department: name, isActive: true },
      { $unset: { department: 1 } }
    );
    
    // Delete department-specific settings
    const settingsDeleteResult = await Settings.deleteMany({
      scope: "department",
      department: name
    });
    
    res.json(formatResponse(true, "Department deleted successfully", {
      departmentName: name,
      employeesUpdated: employeeUpdateResult.modifiedCount,
      settingsDeleted: settingsDeleteResult.deletedCount,
      affectedEmployees: employeeCount
    }));
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json(formatResponse(false, "Server error while deleting department", error.message));
  }
};

// Assign employee to department
export const assignEmployeeToDepartment = async (req, res) => {
  try {
    const { departmentName } = req.params;
    const { employeeId } = req.body;
    
    if (!departmentName || !employeeId) {
      return res.status(400).json(formatResponse(false, "Department name and employee ID are required"));
    }
    
    // Check if department exists
    const department = await Department.findOne({ name: departmentName, isActive: true });
    if (!department) {
      return res.status(404).json(formatResponse(false, "Department not found"));
    }
    
    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }
    
    const oldDepartment = employee.department;
    
    // Update employee department
    await Employee.findByIdAndUpdate(employee._id, { department: departmentName });
    
    res.json(formatResponse(true, "Employee assigned to department successfully", {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      oldDepartment: oldDepartment || null,
      newDepartment: departmentName
    }));
  } catch (error) {
    console.error("Error assigning employee to department:", error);
    res.status(500).json(formatResponse(false, "Server error while assigning employee", error.message));
  }
};

// Get available employees for department assignment
export const getAvailableEmployees = async (req, res) => {
  try {
    const { departmentName } = req.params;
    
    // Get all employees
    const allEmployees = await Employee.find(
      { isActive: true },
      { employeeId: 1, firstName: 1, lastName: 1, email: 1, department: 1 }
    ).sort({ firstName: 1, lastName: 1 });
    
    // Separate employees in current department vs others
    const employeesInDepartment = allEmployees.filter(emp => emp.department === departmentName);
    const employeesInOtherDepartments = allEmployees.filter(emp => emp.department && emp.department !== departmentName);
    const employeesWithoutDepartment = allEmployees.filter(emp => !emp.department);
    
    res.json(formatResponse(true, "Available employees retrieved successfully", {
      departmentName,
      employeesInDepartment,
      employeesInOtherDepartments,
      employeesWithoutDepartment,
      totals: {
        inDepartment: employeesInDepartment.length,
        inOtherDepartments: employeesInOtherDepartments.length,
        withoutDepartment: employeesWithoutDepartment.length,
        total: allEmployees.length
      }
    }));
  } catch (error) {
    console.error("Error fetching available employees:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching employees", error.message));
  }
};

// Reschedule daily HR attendance report
export const rescheduleDailyHrAttendanceReport = async (req, res) => {
  try {
    await SchedulerService.scheduleDailyHrAttendanceReport();

    res.json(formatResponse(true, "Daily HR attendance report job rescheduled successfully"));
  } catch (error) {
    console.error("❌ Error rescheduling daily HR attendance report:", error);
    res.status(500).json(formatResponse(false, "Failed to reschedule daily HR attendance report", error.message));
  }
};

// Test daily HR attendance report (send immediately)
export const testDailyHrAttendanceReport = async (req, res) => {
  try {
    // Send report immediately to all configured HR emails
    await SchedulerService.sendDailyHrAttendanceReport();

    res.json(formatResponse(true, "Daily HR attendance report sent successfully. Check HR email inboxes."));
  } catch (error) {
    console.error("❌ Error testing daily HR attendance report:", error);
    res.status(500).json(formatResponse(false, "Failed to send test report", error.message));
  }
};

export default {
  getGlobalSettings,
  updateGlobalSettings,
  getDepartmentSettings,
  updateDepartmentSettings,
  deleteDepartmentSettings,
  getEffectiveSettings,
  getDepartments,
  getDepartmentStats,
  addDepartment,
  renameDepartment,
  deleteDepartment,
  assignEmployeeToDepartment,
  getAvailableEmployees,
  rescheduleDailyHrAttendanceReport,
  testDailyHrAttendanceReport
};