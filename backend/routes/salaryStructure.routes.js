import express from "express";
import {
  createOrUpdateSalaryStructure,
  getSalaryStructure,
  getAllSalaryStructures,
  deleteSalaryStructure,
  getEmployeesWithoutStructure
} from "../controllers/salaryStructure.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// All routes require authentication (HR/Admin only for salary structure management)
router.use(authMiddleware(['hr', 'admin']));

// Create or update salary structure
router.post("/", createOrUpdateSalaryStructure);

// Get all salary structures (with pagination and search)
router.get("/", getAllSalaryStructures);

// Get employees without salary structure
router.get("/employees-without-structure", getEmployeesWithoutStructure);

// Get salary structure by employee ID
router.get("/:employeeId", getSalaryStructure);

// Delete salary structure
router.delete("/:employeeId", deleteSalaryStructure);

export default router; 