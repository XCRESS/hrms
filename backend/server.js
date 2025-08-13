import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { autoInvalidateMiddleware, getCacheInvalidationStats } from "./utils/cacheInvalidation.js";

dotenv.config();
const app = express();
app.use(express.json());

// 🚀 Add cache auto-invalidation middleware for performance optimization
app.use(autoInvalidateMiddleware);

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

// Optimized MongoDB connection with connection pooling
console.log('🔄 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URL, {
  // Connection pool settings for better performance
  maxPoolSize: 10, // Maximum number of connections in pool
  serverSelectionTimeoutMS: 10000, // How long to try selecting a server (increased for stability)
  socketTimeoutMS: 45000, // How long to wait for a response
  connectTimeoutMS: 10000, // How long to wait for initial connection
  family: 4, // Use IPv4, skip trying IPv6
  
  // Buffer settings for better performance (fixed deprecated options)
  bufferCommands: false, // Disable mongoose buffering
  
  // Retry settings
  retryWrites: true,
  retryReads: true
})
.then(() => {
  console.log("✅ MongoDB connected with optimized connection pool");
  console.log(`📊 Connection pool size: 10`);
  console.log('🚀 Database optimization indexes will be created automatically');
})
.catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
  console.error('❌ Check your MONGO_URL environment variable');
  console.error('❌ Ensure MongoDB Atlas allows connections from your IP');
  process.exit(1); // Exit on connection failure
});

// Connection event listeners for monitoring
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB');
});

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
import activityRoutes from "./routes/activity.js";
import dashboardRoutes from "./routes/dashboard.js";
import taskReportRoutes from "./routes/taskReport.routes.js";
import salarySlipRoutes from "./routes/salarySlip.routes.js";
import salaryStructureRoutes from "./routes/salaryStructure.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import healthRoutes from "./routes/health.js";

// API health check endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HRMS API is working!',
    timestamp: new Date().toISOString()
  });
});

// 📊 Performance monitoring endpoint
app.get('/api/performance/cache-stats', (req, res) => {
  try {
    const stats = getCacheInvalidationStats();
    
    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: {
        ...stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/users", userRoutes);
app.use("/api/regularizations", regularizationRoutes); // Fixed: plural form
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/task-reports", taskReportRoutes); // Fixed: plural form with dash
app.use("/api/salary-slips", salarySlipRoutes);
app.use("/api/salary-structures", salaryStructureRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/health", healthRoutes);

app.get('/', (req, res) => {
  res.send('HRMS API is working!')
})

const PORT = process.env.PORT || 4000;

// Add graceful error handling for server startup
const server = app.listen(PORT, () => {
  console.log(`🚀 HRMS Server running on port ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📊 Performance Stats: http://localhost:${PORT}/api/performance/cache-stats`);
  console.log('✅ Phase 1 Performance Optimizations Active!');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the existing server or use a different port.`);
  } else {
    console.error('❌ Server startup error:', err.message);
  }
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('📴 Server closed');
    mongoose.connection.close(false, () => {
      console.log('📴 MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('⌨️ Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('📴 Server closed');
    mongoose.connection.close(false, () => {
      console.log('📴 MongoDB connection closed');
      process.exit(0);
    });
  });
});