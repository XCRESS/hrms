import mongoose from "mongoose";


const employeeSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
        },
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
        },
        maritalStatus: {
            type: String,
            enum: ["single", "married", "divorced"],
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: Number,
            required: true,
            unique: true,
            minlength: 10,
            maxlength: 10,
        },
        address: {
            type: String,
        },
        aadhaarNumber: {
            type: Number,
            required: true,
            unique: true,
            minlength: 12,
            maxlength: 12,
        },
        panNumber: {
            type: String,
            required: true,
            unique: true,
            minlength: 10,
            maxlength: 10,
        },
        fatherName: {
            type: String,
        },
        motherName: {
            type: String,
        },
        fatherPhone: {
            type: Number,
            minlength: 10,
            maxlength: 10,
        },
        motherPhone: {
            type: Number,
            minlength: 10,
            maxlength: 10,
        },
        officeAddress: {
            type: String,
            enum: ["SanikColony", "Indore", "N.F.C."],
            required: true,  
        },
        companyName: {
            type: String,
            enum: ["Indra Financial Services Limited", "COSMOS INVESTIFIASSET MANAGEMENT LLP", "SENSIBLE TAX ADVISORY LLP"],
            required: true,
        },
        department: {
            type: String,
            required: true,
        },
        position: {
            type: String,
            required: true,
        },

        paymentMode: {
            type: String,
            enum: ["Bank Transfer", "Cheque", "Cash"],
            required: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        bankAccountNumber: {
            type: String,
            required: true,
        },
        bankIFSCCode: {
            type: String,
            required: true,
        },
        employmentType: {
            type: String,
            enum: ["fulltime", "intern", "remote"],
            required: true,
        },
        reportingSupervisor:{
            type: String,
            required: true,
        },
        joiningDate: {
            type: Date, 
            required: true,
        },
        emergencyContactNumber: {
            type: Number,
            required: true,
            minlength: 10,
            maxlength: 10,
        },
        emergencyContactName: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        profilePicture: {
            type: String,
            default: null,
        },
        
    },{timestamps: true}
)

// Performance indexes for common queries
employeeSchema.index({ employeeId: 1 }); // Unique employee lookup
employeeSchema.index({ isActive: 1, firstName: 1, lastName: 1 }); // Active employees list
employeeSchema.index({ isActive: 1, department: 1 }); // Department-wise active employees
// Email index already exists due to unique: true in schema definition
employeeSchema.index({ joiningDate: 1 }); // Date-based filtering

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
