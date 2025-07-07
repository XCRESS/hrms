import { Router } from "express";
import { findUsersWithMissingEmployeeId, getUserByEmployeeId, getAllUsers } from "../controllers/user.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Route to find users with missing employee IDs - admin only
router.get("/missing-employee-id", authMiddleware(["admin", "hr"]), findUsersWithMissingEmployeeId);

// Route to get user by employee ID - admin only
router.get("/by-employee-id/:employeeId", authMiddleware(["admin", "hr"]), getUserByEmployeeId);

// Route to get all users - admin only
router.get("/", authMiddleware(["admin", "hr"]), getAllUsers);

export default router; 