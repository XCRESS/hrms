import { Router } from "express";
import {
  getGlobalSettings,
  updateGlobalSettings,
  getDepartmentSettings,
  updateDepartmentSettings,
  deleteDepartmentSettings,
  getEffectiveSettings,
  getDepartments
} from "../controllers/settings.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Global settings routes (HR/Admin only)
router.get("/global", authMiddleware(["admin", "hr"]), getGlobalSettings);
router.put("/global", authMiddleware(["admin", "hr"]), updateGlobalSettings);

// Department settings routes (HR/Admin only)
router.get("/department/:department", authMiddleware(["admin", "hr"]), getDepartmentSettings);
router.put("/department/:department", authMiddleware(["admin", "hr"]), updateDepartmentSettings);
router.delete("/department/:department", authMiddleware(["admin", "hr"]), deleteDepartmentSettings);

// Effective settings (merged department + global) - can be used by all roles
router.get("/effective", authMiddleware(["admin", "hr", "employee"]), getEffectiveSettings);

// Utility routes
router.get("/departments/list", authMiddleware(["admin", "hr"]), getDepartments);

export default router;