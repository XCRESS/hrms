import { Router } from "express";
import { register, login } from "../controllers/user.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.schemas.js";

const router: Router = Router();
// Only an admin can register new users.
router.post("/register", authMiddleware(["admin", "hr"]), validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);

export default router;
