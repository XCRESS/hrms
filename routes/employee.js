import { Router } from "express";
import { createEmployee, getEmployees, updateEmployee } from "../controllers/employee.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();
router.post("/create", authMiddleware(["admin", "hr"]), createEmployee);
router.get("/", authMiddleware(["admin", "hr"]), getEmployees);
router.put("/:id", authMiddleware(["admin", "hr"]), updateEmployee);

export default router;