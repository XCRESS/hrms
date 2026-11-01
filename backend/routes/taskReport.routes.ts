import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { submitTaskReportSchema } from "../validators/content.schemas.js";
import { Router } from "express";
import { getTaskReports, getMyTaskReports, submitTaskReport } from "../controllers/taskReport.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import type { IAuthRequest } from "../types/index.js";
import type { Response, NextFunction } from "express";

const router: Router = Router();

// Submit a standalone task report
router.post("/submit", authMiddleware(), validateBody(submitTaskReportSchema), submitTaskReport);

// Get task reports - returns appropriate reports based on user role
router.get("/", authMiddleware(), (req: IAuthRequest, res: Response, next: NextFunction) => {
  const handler = req.user?.role === 'admin' || req.user?.role === 'hr' ? getTaskReports : getMyTaskReports;
  handler(req, res, next);
});

// Employee can get their own task reports
router.get("/my", authMiddleware(), getMyTaskReports);

// HR/Admin can get all task reports with filters
router.get("/all", authMiddleware(["admin", "hr"]), getTaskReports);

export default router;
