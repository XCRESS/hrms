import { Router, type Request, type Response, type NextFunction } from "express";
import { checkIn, checkOut, getAttendance, getMissingCheckouts, getMyAttendance, getTodayAttendanceWithAbsents, getAdminAttendanceRange, getEmployeeAttendanceWithAbsents, updateAttendanceRecord } from "../controllers/attendance.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = Router();

// Middleware to prevent caching of attendance data
const noCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
};

// Employee can check in and out
router.post("/checkin", authMiddleware(), checkIn);
router.post("/checkout", authMiddleware(), checkOut);

// Get missing checkouts for regularization reminders
router.get("/missing-checkouts", authMiddleware(), noCacheMiddleware, getMissingCheckouts);

// Get attendance records (employees can only see their own)
router.get("/", authMiddleware(), noCacheMiddleware, getAttendance);
router.get("/records", authMiddleware(), noCacheMiddleware, getAttendance);

// Employee-specific attendance with pagination
router.get("/my", authMiddleware(), noCacheMiddleware, getMyAttendance);

// Admin/HR: Get today's attendance for all employees (including absent ones)
router.get("/today-with-absents", authMiddleware(), noCacheMiddleware, getTodayAttendanceWithAbsents);

// Admin/HR: Get attendance data for a date range - optimized for AdminAttendanceTable
router.get("/admin-range", authMiddleware(), noCacheMiddleware, getAdminAttendanceRange);

// Get employee attendance with absent days included
router.get("/employee-with-absents", authMiddleware(), noCacheMiddleware, getEmployeeAttendanceWithAbsents);

// HR/Admin: Update attendance record
router.put("/update/:recordId", authMiddleware(), updateAttendanceRecord);

export default router;
