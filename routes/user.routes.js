import express from "express";
import {
  getMe,
  login,
  logoutUser,
  registerUser,
  verifyUser,
  forgotPassword,
  resetPassword,
} from "../controllers/user.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/verify/:token", verifyUser);
router.post("/login", login);
router.get("/profile", isLoggedIn, getMe);
router.get("/logout", isLoggedIn, logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
