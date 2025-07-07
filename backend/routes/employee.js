import { Router } from "express";
import { createEmployee, getEmployees, updateEmployee, getProfile, getEmployeeById } from "../controllers/employee.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";
import { updateEmployeeId } from "../controllers/user.controllers.js";

const router = Router();
router.post("/create", authMiddleware(["admin", "hr"]), createEmployee);
router.get("/", authMiddleware(["admin", "hr"]), getEmployees);
router.put("/update/:id", authMiddleware(["admin", "hr"]), updateEmployee);
router.get("/profile", authMiddleware(["admin", "hr", "employee"]), getProfile);
router.get("/:id", authMiddleware(["admin", "hr"]), getEmployeeById);
router.post("/link", authMiddleware(["admin", "hr"]), updateEmployeeId);

export default router;