import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/zodValidation.middleware.js";
import {
  createWFHRequestSchema,
  reviewWFHRequestSchema,
} from "../validators/request.schemas.js";
import {
  createWFHRequest,
  getMyWFHRequests,
  getWFHRequests,
  reviewWFHRequest,
} from "../controllers/wfhRequest.controllers.js";

const router: Router = Router();

router.post("/", authMiddleware(), validateBody(createWFHRequestSchema), createWFHRequest);
router.get("/my", authMiddleware(), getMyWFHRequests);
router.get("/", authMiddleware(["admin", "hr"]), getWFHRequests);
router.patch(
  "/:requestId/status",
  authMiddleware(["admin", "hr"]),
  validateBody(reviewWFHRequestSchema),
  reviewWFHRequest
);

export default router;
