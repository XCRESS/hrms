import { Router } from "express";
import { findUsersWithMissingEmployeeId, getUserByEmployeeId, getAllUsers, deleteUser } from "../controllers/user.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = Router();

// Route to find users with missing employee IDs - admin only
router.get("/missing-employee-id", authMiddleware(["admin", "hr"]), findUsersWithMissingEmployeeId);

// Route to get user by employee ID - admin only
router.get("/by-employee-id/:employeeId", authMiddleware(["admin", "hr"]), getUserByEmployeeId);

// Route to get all users - admin/hr only
router.get("/", authMiddleware(["admin", "hr"]), getAllUsers);

// Route to delete an orphaned (unlinked) user account
router.delete("/:userId", authMiddleware(["admin", "hr"]), deleteUser);

export default router;
