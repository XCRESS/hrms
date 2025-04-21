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
        officeAddress: {
            type: String,
            enum: ["SanikColony", "Indore", "Delhi"],
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
        salary: {
            type: Number,
            required: true,
        },
        paymentMode: {
            type: String,
            enum: ["bank transfer", "cheque", "cash"],
            required: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        bankAccountNumber: {
            type: Number,
            required: true,
        },
        bankIFSCCode: {
            type: String,
            required: true,
        },
        employmentType: {
            type: String,
            enum: ["full time", "intern"],
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
        isActive: {
            type: Boolean,
            default: true,
        },
        
    },{timestamps: true}
)

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
