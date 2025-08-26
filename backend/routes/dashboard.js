import express from "express";
import { getAdminDashboardSummary, getTodayAlerts } from "../controllers/dashboard.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// GET /api/dashboard/admin (for frontend compatibility)
router.get("/admin", authMiddleware(["admin", "hr"]), getAdminDashboardSummary);

// GET /api/dashboard/admin-summary
// Provides summary data for the admin/hr dashboard
router.get("/admin-summary", authMiddleware(["admin", "hr"]), getAdminDashboardSummary);

// GET /api/dashboard/alerts
// Gets today's birthday and milestone alerts
router.get("/alerts", authMiddleware(["admin", "hr", "employee"]), getTodayAlerts);

export default router; 