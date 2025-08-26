import EmployeeDocument from "../models/EmployeeDocument.model.js";
import Employee from "../models/Employee.model.js";
import { uploadFileToS3, deleteFileFromS3 } from "../services/s3Service.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpg, jpeg, png, gif) and PDFs are allowed'));
        }
    }
});

export const uploadDocument = async (req, res) => {
    try {
        const { employeeId, documentType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const fileExtension = file.originalname.split('.').pop();
        const s3Key = `documents/${employeeId}/${documentType}/${Date.now()}.${fileExtension}`;

        const s3Url = await uploadFileToS3(file, s3Key);

        // Delete existing document of same type if exists
        const existingDoc = await EmployeeDocument.findOne({ employeeId, documentType });
        if (existingDoc) {
            const oldKey = existingDoc.s3Url.split('.amazonaws.com/')[1];
            await deleteFileFromS3(oldKey);
            await EmployeeDocument.findByIdAndDelete(existingDoc._id);
        }

        const document = new EmployeeDocument({
            employeeId,
            documentType,
            fileName: file.originalname,
            s3Url
        });

        await document.save();

        // If it's a profile picture, update the Employee model
        if (documentType === 'profile_picture') {
            await Employee.findOneAndUpdate(
                { employeeId },
                { profilePicture: s3Url }
            );
        }

        res.status(201).json({
            message: "Document uploaded successfully",
            document
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEmployeeDocuments = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const decodedEmployeeId = decodeURIComponent(employeeId);
        console.log('Fetching documents for employee:', decodedEmployeeId);
        const documents = await EmployeeDocument.find({ employeeId: decodedEmployeeId });
        console.log('Found documents:', documents.length);
        res.json({ documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await EmployeeDocument.findById(id);
        
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const s3Key = document.s3Url.split('.amazonaws.com/')[1];
        await deleteFileFromS3(s3Key);

        // If it's a profile picture, remove from Employee model
        if (document.documentType === 'profile_picture') {
            await Employee.findOneAndUpdate(
                { employeeId: document.employeeId },
                { profilePicture: null }
            );
        }

        await EmployeeDocument.findByIdAndDelete(id);

        res.json({ message: "Document deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};