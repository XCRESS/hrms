import { Router } from "express";
import { requestLeave, getMyLeaves, getAllLeaves, updateLeaveStatus } from "../controllers/leave.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

// Employee can request and view their leaves
router.post("/request", authMiddleware(), requestLeave);
router.get("/my", authMiddleware(), getMyLeaves);

// Get leaves - returns appropriate leaves based on user role
router.get("/", authMiddleware(), async (req, res) => {
  // If user is admin/hr, return all leaves, otherwise return their own leaves
  if (req.user.role === 'admin' || req.user.role === 'hr') {
    return getAllLeaves(req, res);
  } else {
    return getMyLeaves(req, res);
  }
});

// Admin/HR can view all leaves and approve/reject
router.get("/all", authMiddleware(["admin", "hr"]), getAllLeaves);
router.put("/:leaveId/status", authMiddleware(["admin", "hr"]), updateLeaveStatus);

export default router; 