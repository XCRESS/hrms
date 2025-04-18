import { Router } from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/user.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();
// Only an admin can register new users.
router.post("/register", authMiddleware(["admin"]), register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;