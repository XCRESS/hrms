import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true
        },
        documentType: {
            type: String,
            required: true,
            enum: ["aadhaar", "pan", "10th_marksheet", "12th_marksheet", "college_marksheet", "profile_picture"]
        },
        fileName: {
            type: String,
            required: true
        },
        s3Url: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

const EmployeeDocument = mongoose.model("EmployeeDocument", employeeDocumentSchema);

export default EmployeeDocument;