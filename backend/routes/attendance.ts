import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { checkInSchema, checkOutSchema, geofenceCheckSchema, updateAttendanceRecordSchema } from "../validators/attendance.schemas.js";
import { Router, type Request, type Response, type NextFunction } from "express";
import { checkIn, checkOut, checkGeofence, getAttendance, getMissingCheckouts, getMyAttendance, getTodayAttendanceWithAbsents, getAdminAttendanceRange, getEmployeeAttendanceWithAbsents, updateAttendanceRecord } from "../controllers/attendance.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/access.middleware.js";

const router: Router = Router();

const HR_ONLY = authMiddleware(['admin', 'hr']);

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
router.post("/checkin", authMiddleware(), validateBody(checkInSchema), checkIn);
router.post("/checkout", authMiddleware(), validateBody(checkOutSchema), checkOut);
router.post("/geofence-check", authMiddleware(), validateBody(geofenceCheckSchema), checkGeofence);

// Get missing checkouts for regularization reminders
router.get("/missing-checkouts", authMiddleware(), noCacheMiddleware, getMissingCheckouts);

// Get attendance records (employees can only see their own)
router.get("/", authMiddleware(), noCacheMiddleware, getAttendance);
router.get("/records", authMiddleware(), noCacheMiddleware, getAttendance);

// Employee-specific attendance with pagination
router.get("/my", authMiddleware(), noCacheMiddleware, getMyAttendance);

const CAN_VIEW_ATTENDANCE = [authMiddleware(), requirePermission('attendance.view')];

router.get("/today-with-absents", CAN_VIEW_ATTENDANCE, noCacheMiddleware, getTodayAttendanceWithAbsents);
router.get("/admin-range", CAN_VIEW_ATTENDANCE, noCacheMiddleware, getAdminAttendanceRange);

// Get employee attendance with absent days included
router.get("/employee-with-absents", authMiddleware(), noCacheMiddleware, getEmployeeAttendanceWithAbsents);

// HR/Admin: Update attendance record
router.put("/update/:recordId", HR_ONLY, validateBody(updateAttendanceRecordSchema), updateAttendanceRecord);

export default router;
