import { Router } from "express";
import { createHoliday, getHolidays } from "../controllers/holiday.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();
router.post("/", authMiddleware(["admin", "hr"]), createHoliday);
router.get("/", authMiddleware(["admin", "hr"]), getHolidays);

export default router;