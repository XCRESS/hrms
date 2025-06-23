import { Router } from "express";
import { checkIn, checkOut, getAttendance, getMissingCheckouts, getMyAttendance } from "../controllers/attendance.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Employee can check in and out
router.post("/checkin", authMiddleware(), checkIn);
router.post("/checkout", authMiddleware(), checkOut);

// Get attendance records (employees can only see their own)
router.get("/", authMiddleware(), getAttendance);
router.get("/records", authMiddleware(), getAttendance);

// Employee-specific attendance with pagination
router.get("/my", authMiddleware(), getMyAttendance);

// Get missing checkouts for reminder purposes
router.get("/missing-checkouts", authMiddleware(), getMissingCheckouts);

export default router;