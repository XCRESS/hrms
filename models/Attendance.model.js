import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        date: {
            type: Date,
            required: true,
        },
        checkin: {
            type: Date,
            required: true,
        },
        checkout: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["present", "absent", "half-day"],
            default: "absent",
            required: true,
        },
    },
    { timestamps: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;