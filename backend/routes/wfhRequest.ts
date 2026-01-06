import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createWFHRequest,
  getMyWFHRequests,
  getWFHRequests,
  reviewWFHRequest,
} from "../controllers/wfhRequest.controllers.js";

const router: Router = Router();

router.post("/", authMiddleware(), createWFHRequest);
router.get("/my", authMiddleware(), getMyWFHRequests);
router.get("/", authMiddleware(["admin", "hr"]), getWFHRequests);
router.patch(
  "/:requestId/status",
  authMiddleware(["admin", "hr"]),
  reviewWFHRequest
);

export default router;
