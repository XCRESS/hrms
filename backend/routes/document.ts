import express, { type Router } from "express";
import { uploadDocument, getEmployeeDocuments, deleteDocument, upload } from "../controllers/document.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post("/upload", authMiddleware(), upload.single('document'), uploadDocument);
router.get("/employee/:employeeId", authMiddleware(), getEmployeeDocuments);
router.delete("/:id", authMiddleware(), deleteDocument);

export default router;
