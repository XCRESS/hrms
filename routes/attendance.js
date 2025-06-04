import { Router } from "express";
import { checkIn, checkOut, getAttendance } from "../controllers/attendance.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Employee can check in and out
router.post("/checkin", authMiddleware(), checkIn);
router.post("/checkout", authMiddleware(), checkOut);

// Get attendance records (employees can only see their own)
router.get("/", authMiddleware(), getAttendance);

export default router;