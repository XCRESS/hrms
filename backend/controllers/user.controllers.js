import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.model.js";
import Employee from "../models/Employee.model.js";
import { generateToken } from "../utils/jwt.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role, employeeId } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name,
      email,
      password: hashedPassword,
      role
    };
    if (role === "employee") {
      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required for employee users" });
      }
      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json({ message: "Employee not found for given employeeId" });
      }
      userData.employee = employee._id;
      userData.employeeId = employee.employeeId;
    }
    const user = await User.create(userData);
    res.status(201).json({ success: true, message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
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
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
    await user.save();
    res.json({
      success: true,
      message:
        "Password reset token generated. Use this token to reset your password within the next hour.",
      resetToken
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to process forgot password", error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ success: true,message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed", error: err.message });
  }
};

export const updateEmployeeId = async (req, res) => {
  try {
    const { userId, employeeId } = req.body;
    if (!userId || !employeeId) {
      return res.status(400).json({ success: false, message: "User ID and Employee ID are required" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    user.employee = employee._id;
    user.employeeId = employee.employeeId;
    await user.save();
    return res.status(200).json({
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
  } catch (error) {
    console.error("Error updating employee ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update employee ID",
      error: error.message
    });
  }
};

export const findUsersWithMissingEmployeeId = async (req, res) => {
  try {
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
    return res.status(200).json({
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
  } catch (error) {
    console.error("Error finding users with missing employee IDs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to find users with missing employee IDs",
      error: error.message
    });
  }
};

export const getUserByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const decodedEmployeeId = decodeURIComponent(employeeId);
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found for this employeeId" });
    }
    const user = await User.findOne({ employee: employee._id });
    if (!user) {
      return res.status(404).json({ message: "User not found for this employeeId" });
    }
    res.json({ userId: user._id, employee: user.employee });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user by employeeId", error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("employee");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};