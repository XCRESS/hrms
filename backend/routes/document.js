import express from "express";
import { uploadDocument, getEmployeeDocuments, deleteDocument, upload } from "../controllers/document.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.post("/upload", authMiddleware(), upload.single('document'), uploadDocument);
router.get("/employee/:employeeId", authMiddleware(), getEmployeeDocuments);
router.delete("/:id", authMiddleware(), deleteDocument);

export default router;