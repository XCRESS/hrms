import { Router } from "express";
import { createHoliday, getHolidays } from "../controllers/holiday.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Admin/HR can create holidays
router.post("/", authMiddleware(["admin", "hr"]), createHoliday);

// All authenticated users can view holidays
router.get("/", authMiddleware(), getHolidays);

export default router;