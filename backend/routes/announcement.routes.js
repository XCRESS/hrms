import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// Create a new announcement
// POST /api/announcements
router.post("/", authMiddleware(["admin", "hr"]), createAnnouncement);

// Get all announcements (filtered by role/status in controller)
// GET /api/announcements
router.get("/", authMiddleware(["admin", "hr", "employee"]), getAnnouncements);

// Get a single announcement by ID (access controlled in controller)
// GET /api/announcements/:id
router.get("/:id", authMiddleware(["admin", "hr", "employee"]), getAnnouncementById);

// Update an announcement
// PUT /api/announcements/:id
router.put("/:id", authMiddleware(["admin", "hr"]), updateAnnouncement);

// Delete an announcement
// DELETE /api/announcements/:id
router.delete("/:id", authMiddleware(["admin", "hr"]), deleteAnnouncement);

export default router; 