import { Router } from "express";
import { createEmployee, getEmployees, updateEmployee, getProfile } from "../controllers/employee.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();
router.post("/create", authMiddleware(["admin", "hr"]), createEmployee);
router.get("/", authMiddleware(["admin", "hr"]), getEmployees);
router.put("/update/:id", authMiddleware(["admin", "hr"]), updateEmployee);
router.get("/profile", authMiddleware(["admin", "hr", "employee"]), getProfile);

export default router;