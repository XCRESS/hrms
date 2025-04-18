import { Router } from "express";
import { checkIn, checkOut } from "../controllers/attendance.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();
router.post("/checkin", authMiddleware(), checkIn);
router.post("/checkout", authMiddleware(), checkOut);

export default router;