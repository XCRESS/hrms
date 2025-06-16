import Employee from "../models/Employee.model.js";

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

// get all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().select('employeeId firstName lastName department position isActive _id');
    const employeeList = employees.map(employee => ({
      _id: employee._id,
      employeeId: employee.employeeId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      position: employee.position,
      isActive: employee.isActive,
    }));
    res.json({ employees: employeeList });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch employees", error: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Employee updated", employee });
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
