import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.model.js";
import Employee from "../models/Employee.model.js";
import { generateToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, employeeId } = req.body;
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ValidationError("User already exists");
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const userData = {
    name,
    email,
    password: hashedPassword,
    role
  };
  
  if (role === "employee") {
    if (!employeeId) {
      throw new ValidationError("Employee ID is required for employee users");
    }
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      throw new NotFoundError("Employee not found for given employeeId");
    }
    
    userData.employee = employee._id;
    userData.employeeId = employee.employeeId;
  }
  
  const user = await User.create(userData);
  res.status(201).json({ success: true, message: "User registered successfully", user });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ValidationError("Invalid credentials");
  }
  
  const tokenPayload = {
    id: user._id,
    role: user.role,
    name: user.name,
    email: user.email
  };
  
  if (user.employee) {
    tokenPayload.employee = user.employee;
  }
  if (user.employeeId) {
    tokenPayload.employeeId = user.employeeId;
  }
  
  const token = generateToken(tokenPayload);
  res.json({ success: true, message: "Login successful", token });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  
  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
  await user.save();
  
  res.json({
    success: true,
    message: "Password reset token generated. Use this token to reset your password within the next hour.",
    resetToken
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new ValidationError("Invalid or expired token");
  }
  
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  
  res.json({ success: true, message: "Password has been reset successfully" });
});

export const updateEmployeeId = asyncHandler(async (req, res) => {
  const { userId, employeeId } = req.body;
  
  if (!userId || !employeeId) {
    throw new ValidationError("User ID and Employee ID are required");
  }
  
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  
  const employee = await Employee.findOne({ employeeId });
  if (!employee) {
    throw new NotFoundError("Employee not found");
  }
  
  user.employee = employee._id;
  user.employeeId = employee.employeeId;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: "User successfully linked to employee profile",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee: user.employee,
      employeeId: user.employeeId
    }
  });
});

export const findUsersWithMissingEmployeeId = asyncHandler(async (req, res) => {
  // Find users with the role "employee" but no employee or employeeId
  const users = await User.find({
    role: "employee",
    $or: [
      { employee: { $exists: false } },
      { employee: null },
      { employeeId: { $exists: false } },
      { employeeId: null },
      { employeeId: "" }
    ]
  });
  
  res.status(200).json({
    success: true,
    count: users.length,
    users: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }))
  });
});

export const getUserByEmployeeId = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const decodedEmployeeId = decodeURIComponent(employeeId);
  
  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    throw new NotFoundError("Employee not found for this employeeId");
  }
  
  const user = await User.findOne({ employee: employee._id });
  if (!user) {
    throw new NotFoundError("User not found for this employeeId");
  }
  
  res.json({ userId: user._id, employee: user.employee });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().populate("employee");
  res.json({ users });
});