import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true
        },
        documentType: {
            type: String,
            required: true
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