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
      officeAddress,
      department,
      position,
      salary,
      paymentMode,
      bankName,
      bankAccountNumber,
      bankIFSCCode,
      employementType,
      reportingSupervisor,
      joiningDate,
    } = req.body;
    
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
      officeAddress,
      department,
      position,
      salary,
      paymentMode,
      bankName,
      bankAccountNumber,
      bankIFSCCode,
      employementType,
      reportingSupervisor,
      joiningDate
    });
    res.status(201).json({ message: "Employee created", employee });
  } catch (err) {
    res.status(500).json({ message: "Employee creation failed", error: err.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().populate("userId", "name email");
    res.json({ employees });
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