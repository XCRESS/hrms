import { Router } from "express";
import { requestLeave, getMyLeaves, getAllLeaves, updateLeaveStatus } from "../controllers/leave.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Employee can request and view their leaves
router.post("/request", authMiddleware(), requestLeave);
router.get("/my", authMiddleware(), getMyLeaves);

// Admin/HR can view all leaves and approve/reject
router.get("/all", authMiddleware(["admin", "hr"]), getAllLeaves);
router.put("/:leaveId/status", authMiddleware(["admin", "hr"]), updateLeaveStatus);

export default router; 