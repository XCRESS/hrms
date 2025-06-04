import express from "express";
import { requestRegularization, getMyRegularizations, getAllRegularizations, reviewRegularization } from "../controllers/regularization.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// Employee: submit a regularization request
router.post("/request", authMiddleware(["employee", "hr", "admin"]), requestRegularization);

// Employee: get own regularization requests
router.get("/my", authMiddleware(["employee", "hr", "admin"]), getMyRegularizations);

// HR/Admin: get all regularization requests
router.get("/all", authMiddleware(["hr", "admin"]), getAllRegularizations);

// HR/Admin: review (approve/reject) a request
router.post("/:id/review", authMiddleware(["hr", "admin"]), reviewRegularization);

export default router; 