import { Router } from "express";
import { createEmployee, getEmployees, updateEmployee, getProfile, getEmployeeById, toggleEmployeeStatus } from "../controllers/employee.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { updateEmployeeId } from "../controllers/user.controllers.js";

const router: Router = Router();
router.post("/create", authMiddleware(["admin", "hr"]), createEmployee);
router.get("/", authMiddleware(["admin", "hr"]), getEmployees);
router.put("/update/:id", authMiddleware(["admin", "hr"]), updateEmployee);
router.put("/toggle-status/:id", authMiddleware(["admin", "hr"]), toggleEmployeeStatus);
router.get("/profile", authMiddleware(["admin", "hr", "employee"]), getProfile);
router.get("/:id", authMiddleware(["admin", "hr"]), getEmployeeById);
router.post("/link", authMiddleware(["admin", "hr"]), updateEmployeeId);

export default router;
