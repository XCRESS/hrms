import { Router } from "express";
import {
  submitInquiry,
  getMyInquiries,
  getAllInquiries,
  updateInquiry
} from "../controllers/help.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = Router();

// Routes for all authenticated users
router.post("/", authMiddleware(), submitInquiry);
router.get("/my", authMiddleware(), getMyInquiries);

// Admin/HR only routes
router.get("/all", authMiddleware(["admin", "hr"]), getAllInquiries);
router.patch("/:inquiryId", authMiddleware(["admin", "hr"]), updateInquiry);

export default router;
