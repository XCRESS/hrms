import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { createOfficeLocationSchema, updateOfficeLocationSchema } from "../validators/content.schemas.js";
import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  getOfficeLocations,
  getActiveOfficeLocations,
  createOfficeLocation,
  updateOfficeLocation,
  deleteOfficeLocation,
} from "../controllers/officeLocation.controllers.js";

const router: Router = Router();

router.get("/", authMiddleware(["admin", "hr"]), getOfficeLocations);
router.get("/active", authMiddleware(), getActiveOfficeLocations);
router.post("/", authMiddleware(["admin", "hr"]), validateBody(createOfficeLocationSchema), createOfficeLocation);
router.put(
  "/:locationId",
  authMiddleware(["admin", "hr"]),
  validateBody(updateOfficeLocationSchema),
  updateOfficeLocation
);
router.delete(
  "/:locationId",
  authMiddleware(["admin", "hr"]),
  deleteOfficeLocation
);

export default router;
