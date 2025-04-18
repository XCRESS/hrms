import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "hr", "employee"], default: "employee" },
        isActive: { type: Boolean, default: true },
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date },
        createdAt: { type: Date, default: Date.now }  
    },{timestamps: true}
    
);

const User = mongoose.model("User", userSchema);

export default User;
