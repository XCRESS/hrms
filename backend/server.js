import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://hrms-jx26.vercel.app",
  "https://hr.intakesense.com"
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employee.js";
import attendanceRoutes from "./routes/attendance.js";
import holidayRoutes from "./routes/holiday.js";
import leaveRoutes from "./routes/leave.js";
import helpRoutes from "./routes/help.js";
import userRoutes from "./routes/user.js";
import regularizationRoutes from "./routes/regularization.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import announcementRoutes from "./routes/announcement.routes.js";

// API health check endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HRMS API is working!',
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/users", userRoutes);
app.use("/api/regularization", regularizationRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/announcements", announcementRoutes);

app.get('/', (req, res) => {
  res.send('HRMS API is working!')
})

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));