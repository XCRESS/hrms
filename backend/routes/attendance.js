import { Router } from "express";
import { checkIn, checkOut, getAttendance, getMissingCheckouts, getMyAttendance, getTodayAttendanceWithAbsents, getAdminAttendanceRange, getEmployeeAttendanceWithAbsents, updateAttendanceRecord } from "../controllers/attendance.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Employee can check in and out
router.post("/checkin", authMiddleware(), checkIn);
router.post("/checkout", authMiddleware(), checkOut);

// Get missing checkouts for regularization reminders
router.get("/missing-checkouts", authMiddleware(), getMissingCheckouts);

// Get attendance records (employees can only see their own)
router.get("/", authMiddleware(), getAttendance);
router.get("/records", authMiddleware(), getAttendance);

// Employee-specific attendance with pagination
router.get("/my", authMiddleware(), getMyAttendance);

// Admin/HR: Get today's attendance for all employees (including absent ones)
router.get("/today-with-absents", authMiddleware(), getTodayAttendanceWithAbsents);

// Admin/HR: Get attendance data for a date range - optimized for AdminAttendanceTable
router.get("/admin-range", authMiddleware(), getAdminAttendanceRange);

// Get employee attendance with absent days included
router.get("/employee-with-absents", authMiddleware(), getEmployeeAttendanceWithAbsents);

// HR/Admin: Update attendance record
router.put("/update/:recordId", authMiddleware(), updateAttendanceRecord);

export default router;