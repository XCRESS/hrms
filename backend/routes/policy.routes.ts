import express, { type Router } from "express";
import {
  createPolicy,
  getAllPolicies,
  getActivePolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  permanentDeletePolicy,
  getPolicyStatistics
} from "../controllers/policy.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

// All routes require authentication
router.use(authMiddleware(['employee', 'hr', 'admin']));

// Get active policies (accessible to all authenticated users)
router.get("/active", getActivePolicies);

// Get policy statistics (HR/Admin only)
router.get("/statistics", authMiddleware(['hr', 'admin']), getPolicyStatistics);

// Create new policy (HR/Admin only)
router.post("/", authMiddleware(['hr', 'admin']), createPolicy);

// Get all policies with pagination and filters (HR/Admin only)
router.get("/", authMiddleware(['hr', 'admin']), getAllPolicies);

// Get policy by ID
router.get("/:id", getPolicyById);

// Update policy (HR/Admin only)
router.put("/:id", authMiddleware(['hr', 'admin']), updatePolicy);

// Delete policy (HR/Admin only)
router.delete("/:id", authMiddleware(['hr', 'admin']), deletePolicy);

// Permanently delete policy (HR/Admin only)
router.delete("/:id/permanent", authMiddleware(['hr', 'admin']), permanentDeletePolicy);

export default router;
