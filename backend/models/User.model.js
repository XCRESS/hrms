import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "hr", "employee"], default: "employee" },
        isActive: { type: Boolean, default: true },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        employeeId: { type: String },
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date }
    },{timestamps: true}
    
);

const User = mongoose.model("User", userSchema);

export default User;
