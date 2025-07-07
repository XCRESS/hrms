import express from "express";
import { getActivityFeed } from "../controllers/activity.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// GET /api/activity (root route for frontend compatibility)
router.get("/", authMiddleware(["admin", "hr", "employee"]), getActivityFeed);

// GET /api/activity/feed
// All authenticated users can access their activity feed
router.get("/feed", authMiddleware(["admin", "hr", "employee"]), getActivityFeed);

export default router; 