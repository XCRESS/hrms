import express, { type Router } from "express";
import { validateBody } from "../middlewares/zodValidation.middleware.js";
import { confirmPasswordResetSchema, requestPasswordResetSchema } from "../validators/auth.schemas.js";
import { passwordResetIpLimiter, passwordResetRequestLimiter } from "../middlewares/rateLimit.middleware.js";
import { confirmPasswordReset, requestPasswordReset } from "../controllers/passwordReset.controllers.js";

const router: Router = express.Router();

router.post("/request", passwordResetIpLimiter, passwordResetRequestLimiter, validateBody(requestPasswordResetSchema), requestPasswordReset);
router.post("/confirm", passwordResetIpLimiter, validateBody(confirmPasswordResetSchema), confirmPasswordReset);

export default router;
