import Employee from "../models/Employee.model.js";
import Department from "../models/Department.model.js";

export const createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      gender,
      dateOfBirth,
      maritalStatus,
      email,
      phone,
      address,
      aadhaarNumber,
      panNumber,
      fatherName,
      motherName,
      fatherPhone,
      motherPhone,
      officeAddress,
      companyName,
      department,
      position,
      paymentMode,
      bankName,
      bankAccountNumber,
      bankIFSCCode,
      employmentType,
      reportingSupervisor,
      joiningDate,
      emergencyContactName,
      emergencyContactNumber,
    } = req.body;
    
    // check if employeeId already exists
    const existingEmployee = await Employee.findOne({
      $or: [
        { employeeId },
        { email },
        { aadhaarNumber },
        { panNumber },
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({
        message: "Employee already exists with same employee ID, email, Aadhaar number, or PAN number."
      });
    }

    // Validate department if provided
    if (department && department.trim()) {
      const departmentExists = await Department.findOne({ 
        name: department.trim(), 
        isActive: true 
      });
      
      if (!departmentExists) {
        return res.status(400).json({
          message: `Department '${department}' does not exist. Please select from available departments.`
        });
      }
    }

    // creating employee
    const employee = await Employee.create({
      employeeId,
      firstName,
      lastName,
      gender,
      dateOfBirth,
      maritalStatus,
      email,
      phone,
      address,
      aadhaarNumber,
      panNumber,
      fatherName,
      motherName,
      fatherPhone,
      motherPhone,
      officeAddress,
      companyName,
      department,
      position,
      paymentMode,
      bankName,
      bankAccountNumber,
      bankIFSCCode,
      employmentType,
      reportingSupervisor,
      joiningDate,
      emergencyContactName,
      emergencyContactNumber
    });
    res.status(201).json({ message: "Employee created", employee });
  } catch (err) {
    console.error('Employee creation error:', err);
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: err.errors ? Object.values(err.errors).map(e => e.message) : err.message,
      });
    }
    // Duplicate key error
    if (err.code === 11000) {
      const fields = Object.keys(err.keyValue).join(', ');
      return res.status(400).json({
        message: `Duplicate value for field(s): ${fields}`,
        fields: err.keyValue,
      });
    }
    // Other errors
    res.status(500).json({
      message: "Employee creation failed",
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
  }
};

// get all employees (with optional status filter)
export const getEmployees = async (req, res) => {
  try {
    const { status } = req.query; // 'active', 'inactive', or undefined for all
    let filter = {};
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    // If status is undefined, get all employees
    
    const employees = await Employee.find(filter).select('-__v').sort({ createdAt: -1 });
    const employeeList = employees.map(employee => ({
      _id: employee._id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      bankName: employee.bankName,
      bankAccountNumber: employee.bankAccountNumber,
      panNumber: employee.panNumber,
      joiningDate: employee.joiningDate,
      companyName: employee.companyName,
      isActive: employee.isActive,
    }));
    res.json({ employees: employeeList });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch employees", error: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if employee exists
    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Validate department if it's being updated
    if (updateData.department && updateData.department.trim()) {
      const departmentExists = await Department.findOne({ 
        name: updateData.department.trim(), 
        isActive: true 
      });
      
      if (!departmentExists) {
        return res.status(400).json({
          message: `Department '${updateData.department}' does not exist. Please select from available departments.`
        });
      }
    }

    // Update employee
    const employee = await Employee.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true 
    });
    
    res.json({ message: "Employee updated successfully", employee });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const employeeId = req.user.employeeId;
    
    // First attempt - search by email
    let employee = await Employee.findOne({ email: userEmail });
    
    // Second attempt - if not found by email, try by employeeId
    if (!employee && employeeId) {
      employee = await Employee.findOne({ employeeId: employeeId });
    }
    
    // If user is an employee but their profile doesn't exist in the Employee collection
    if (!employee && req.user.role === "employee") {
      // Return basic profile from User collection instead of 404
      return res.status(200).json({
        success: true,
        message: "Basic profile retrieved from user account",
        firstName: req.user.name.split(' ')[0] || req.user.name,
        lastName: req.user.name.split(' ').slice(1).join(' ') || '',
        email: req.user.email,
        employeeId: req.user.employeeId,
        // Include placeholder values for required fields
        position: "Not specified",
        department: "Not assigned",
        // Flag to indicate this is a partial profile
        isPartialProfile: true
      });
    }
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Profile not found"
      });
    }
    
    res.status(200).json({
      success: true,
      ...employee.toObject()
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching profile", 
      error: err.message 
    });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch employee", error: err.message });
  }
};

// Toggle employee active status
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Toggle the isActive status
    employee.isActive = !employee.isActive;
    await employee.save();
    
    // If employee is being deactivated, unlink from user account
    if (!employee.isActive) {
      // Import User model to unlink the employee
      const User = (await import("../models/User.model.js")).default;
      
      // Find and unlink the user account
      const user = await User.findOne({ employeeId: employee.employeeId });
      if (user) {
        user.employeeId = null;
        user.employee = null;
        await user.save();
        console.log(`Unlinked user ${user.email} from deactivated employee ${employee.employeeId}`);
      }
    }
    
    res.json({
      message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: `${employee.firstName} ${employee.lastName}`,
        isActive: employee.isActive
      }
    });
  } catch (err) {
    console.error('Toggle employee status error:', err);
    res.status(500).json({ message: "Failed to toggle employee status", error: err.message });
  }
};
