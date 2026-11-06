import { Router } from "express";
import { findUsersWithMissingEmployeeId, getUserByEmployeeId, getAllUsers, deleteUser, updateUserRole } from "../controllers/user.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { updateUserRoleSchema } from "../validators/auth.schemas.js";

const router: Router = Router();

// Route to find users with missing employee IDs - admin only
router.get("/missing-employee-id", authMiddleware(["admin", "hr"]), findUsersWithMissingEmployeeId);

// Route to get user by employee ID - admin only
router.get("/by-employee-id/:employeeId", authMiddleware(["admin", "hr"]), getUserByEmployeeId);

// Route to get all users - admin/hr only
router.get("/", authMiddleware(["admin", "hr"]), getAllUsers);

router.put("/:userId/role", authMiddleware(["admin"]), validateBody(updateUserRoleSchema), updateUserRole);

// Route to delete an orphaned (unlinked) user account
router.delete("/:userId", authMiddleware(["admin", "hr"]), deleteUser);

export default router;
