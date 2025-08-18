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

// Enhanced MongoDB connection with retry logic and better error handling
const connectToMongoDB = async () => {
  const mongoUrl = process.env.MONGO_URL;
  
  if (!mongoUrl) {
    console.error('MONGO_URL environment variable is not set');
    process.exit(1);
  }
  
  // Use the MongoDB URL as-is (Atlas connection strings don't require database name)
  const dbUrl = mongoUrl;
  
  console.log('Connecting to MongoDB...');
  
  const connectionOptions = {
    // Connection pool settings for better performance
    maxPoolSize: 10, // Maximum number of connections in pool
    serverSelectionTimeoutMS: 30000, // Increased timeout for better stability
    socketTimeoutMS: 45000, // How long to wait for a response
    connectTimeoutMS: 30000, // Increased connection timeout
    heartbeatFrequencyMS: 10000, // How often to check connection health
    
    // Buffer settings for better performance
    bufferCommands: false, // Disable mongoose buffering
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Additional stability options
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 5000
  };
  
  try {
    await mongoose.connect(dbUrl, connectionOptions);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectToMongoDB();
    }, 5000);
  }
};

// Initial connection attempt
connectToMongoDB();

// Enhanced connection event listeners for monitoring
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected - attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

mongoose.connection.on('reconnectFailed', () => {
  console.error('MongoDB reconnection failed');
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
  console.log(`HRMS Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
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
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});