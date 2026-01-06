import { Router } from "express";
import { getTaskReports, getMyTaskReports, submitTaskReport } from "../controllers/taskReport.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import type { IAuthRequest } from "../types/index.js";
import type { Response } from "express";

const router: Router = Router();

// Submit a standalone task report
router.post("/submit", authMiddleware(), submitTaskReport);

// Get task reports - returns appropriate reports based on user role
router.get("/", authMiddleware(), async (req: IAuthRequest, res: Response) => {
  // If user is admin/hr, return all task reports, otherwise return their own task reports
  if (req.user?.role === 'admin' || req.user?.role === 'hr') {
    return getTaskReports(req, res);
  } else {
    return getMyTaskReports(req, res);
  }
});

// Employee can get their own task reports
router.get("/my", authMiddleware(), getMyTaskReports);

// HR/Admin can get all task reports with filters
router.get("/all", authMiddleware(["admin", "hr"]), getTaskReports);

export default router;
