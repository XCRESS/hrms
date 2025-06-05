import { Router } from "express";
import {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday
} from "../controllers/holiday.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Admin/HR can create holidays
router.post("/", authMiddleware(["admin", "hr"]), createHoliday);

// All authenticated users can view holidays (employee, hr, admin)
router.get("/", authMiddleware(["admin", "hr", "employee"]), getHolidays);

// Admin/HR can update a specific holiday
router.put("/:id", authMiddleware(["admin", "hr"]), updateHoliday);

// Admin/HR can delete a specific holiday
router.delete("/:id", authMiddleware(["admin", "hr"]), deleteHoliday);

export default router;