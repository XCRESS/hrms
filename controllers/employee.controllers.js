import Employee from "../models/Employee.model.js";
import User from "../models/User.model.js";

export const createEmployee = async (req, res) => {
  try {
    const {
      userId,
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
    
    // check if user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // check if user employee already created
    const exists = await Employee.findOne({ userId });
    if (exists) return res.status(400).json({ message: "Employee already created for this user" });

    // creating employee
    const employee = await Employee.create({
      userId,
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