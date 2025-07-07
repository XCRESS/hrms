import express from "express";
import {
  createOrUpdateSalarySlip,
  getSalarySlip,
  getEmployeeSalarySlips,
  getAllSalarySlips,
  deleteSalarySlip,
  getTaxCalculation,
  updateSalarySlipStatus,
  bulkUpdateSalarySlipStatus
} from "../controllers/salarySlip.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// Get tax calculation preview (HR/Admin only)
router.get("/tax-calculation", authMiddleware(["admin", "hr"]), getTaxCalculation);

// Create or update salary slip (HR/Admin only)
router.post("/", authMiddleware(["admin", "hr"]), createOrUpdateSalarySlip);

// Get all salary slips with filters (HR/Admin only)
router.get("/", authMiddleware(["admin", "hr"]), getAllSalarySlips);

// Get specific salary slip by employee, month, year
router.get("/:employeeId/:month/:year", authMiddleware(["admin", "hr", "employee"]), getSalarySlip);

// Get all salary slips for a specific employee
router.get("/employee/:employeeId", authMiddleware(["admin", "hr", "employee"]), getEmployeeSalarySlips);

// Update salary slip status (publish/unpublish) (HR/Admin only)
router.put("/:employeeId/:month/:year/status", authMiddleware(["admin", "hr"]), updateSalarySlipStatus);

// Bulk update salary slip status (HR/Admin only)
router.put("/bulk/status", authMiddleware(["admin", "hr"]), bulkUpdateSalarySlipStatus);

// Delete salary slip (HR/Admin only)
router.delete("/:employeeId/:month/:year", authMiddleware(["admin", "hr"]), deleteSalarySlip);

export default router; 