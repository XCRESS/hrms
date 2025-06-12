import { Router } from "express";
import { getTaskReports } from "../controllers/taskReport.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// HR/Admin can get task reports with filters
router.get("/", authMiddleware(["admin", "hr"]), getTaskReports);

export default router; 