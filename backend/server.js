import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { autoInvalidateMiddleware, getCacheInvalidationStats } from "./utils/cacheInvalidation.js";
import { globalErrorHandler } from "./utils/asyncHandler.js";

dotenv.config();
const app = express();

// CORS first
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

// Document upload route BEFORE JSON middleware
import documentRoutes from "./routes/document.js";
app.use("/api/documents", documentRoutes);

// JSON middleware for all other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🚀 Add cache auto-invalidation middleware for performance optimization
app.use(autoInvalidateMiddleware);

// Simple direct MongoDB connection
const connectToMongoDB = async () => {
  const mongoUrl = process.env.MONGO_URL;
  
  if (!mongoUrl) {
    console.error('MONGO_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

// Initial connection attempt
connectToMongoDB();

// Simple connection event listeners
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
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
import notificationTestRoutes from "./routes/notification.test.js";
import chatRoutes from "./routes/chat.routes.js";

// Notification Services
import NotificationService from "./services/notificationService.js";
import SchedulerService from "./services/schedulerService.js";

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
app.use("/api/notifications", notificationTestRoutes);
app.use("/api/chat", chatRoutes);
app.use("/health", healthRoutes);

app.get('/', (req, res) => {
  res.send('HRMS API is working!')
})

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;

// Initialize notification system
const initializeNotificationSystem = async () => {
  try {
    console.log('Initializing notification system...');
    
    // Initialize notification services
    await NotificationService.initialize();
    
    // Start scheduler for holiday reminders and milestone alerts
    SchedulerService.start();
    
    console.log('✓ Notification system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize notification system:', error);
    console.error('Server will continue without notifications');
  }
};

// Add graceful error handling for server startup
const server = app.listen(PORT, async () => {
  console.log(`HRMS Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  
  // Initialize notification system after server starts
  await initializeNotificationSystem();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the existing server or use a different port.`);
  } else {
    console.error('Server startup error:', err.message);
  }
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Stop notification services
  SchedulerService.stop();
  
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  // Stop notification services
  SchedulerService.stop();
  
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});