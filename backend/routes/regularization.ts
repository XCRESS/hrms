import express, { type Router } from "express";
import {
  requestRegularization,
  getMyRegularizations,
  getAllRegularizations,
  reviewRegularization,
  bulkReviewRegularizations,
} from "../controllers/regularization.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody, validateQuery } from "../middlewares/zodValidation.middleware.js";
import {
  createRegularizationSchema,
  reviewRegularizationSchema,
  requestListQuerySchema,
  bulkRequestStatusSchema,
} from "../validators/request.schemas.js";
import type { IAuthRequest } from "../types/index.js";
import type { Response, NextFunction } from "express";

const router: Router = express.Router();

// Employee: submit a regularization request
router.post("/request", authMiddleware(["employee", "hr", "admin"]), validateBody(createRegularizationSchema), requestRegularization);

// Employee: get own regularization requests
router.get("/my", authMiddleware(["employee", "hr", "admin"]), getMyRegularizations);

// Get regularizations - returns appropriate regularizations based on user role
router.get("/", authMiddleware(["employee", "hr", "admin"]), validateQuery(requestListQuerySchema), (req: IAuthRequest, res: Response, next: NextFunction) => {
  const handler = req.user?.role === 'admin' || req.user?.role === 'hr' ? getAllRegularizations : getMyRegularizations;
  handler(req, res, next);
});

// HR/Admin: get all regularization requests
router.get("/all", authMiddleware(["hr", "admin"]), validateQuery(requestListQuerySchema), getAllRegularizations);

// Must precede /:id/review, or the param route swallows "bulk-review".
router.post("/bulk-review", authMiddleware(["hr", "admin"]), validateBody(bulkRequestStatusSchema), bulkReviewRegularizations);

// HR/Admin: review (approve/reject) a request
router.post("/:id/review", authMiddleware(["hr", "admin"]), validateBody(reviewRegularizationSchema), reviewRegularization);

export default router;
