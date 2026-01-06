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
router.post("/", authMiddleware(["admin", "hr"]), createOfficeLocation);
router.put(
  "/:locationId",
  authMiddleware(["admin", "hr"]),
  updateOfficeLocation
);
router.delete(
  "/:locationId",
  authMiddleware(["admin", "hr"]),
  deleteOfficeLocation
);

export default router;
