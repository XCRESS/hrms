import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { submitInquirySchema, updateInquirySchema } from "../validators/hr.schemas.js";
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
router.post("/", authMiddleware(), validateBody(submitInquirySchema), submitInquiry);
router.get("/my", authMiddleware(), getMyInquiries);

// Admin/HR only routes
router.get("/all", authMiddleware(["admin", "hr"]), getAllInquiries);
router.patch("/:inquiryId", authMiddleware(["admin", "hr"]), validateBody(updateInquirySchema), updateInquiry);

export default router;
