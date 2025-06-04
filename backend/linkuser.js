// migrate-link-users-employees.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Update these paths if your models are elsewhere
import User from "./models/User.model.js";
import Employee from "./models/Employee.model.js";
import Attendance from "./models/Attendance.model.js";

// 1. Connect to MongoDB
const MONGO_URI = process.env.MONGO_URL || "mongodb://localhost:27017/YOUR_DB_NAME";
await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

console.log("Connected to MongoDB");

// 2. Link Users to Employees
async function linkUsersToEmployees() {
  const users = await User.find({ role: "employee", employeeId: { $exists: true, $ne: "" } });
  let linked = 0, notFound = 0;
  for (const user of users) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    if (employee) {
      user.employee = employee._id;
      await user.save();
      linked++;
    } else {
      console.warn(`No Employee found for user ${user.email} (employeeId: ${user.employeeId})`);
      notFound++;
    }
  }
  console.log(`Linked ${linked} users to employees. ${notFound} users had no matching employee.`);
}

// 3. Migrate Attendance Records
async function migrateAttendance() {
  const records = await Attendance.find({ userId: { $exists: true } });
  let migrated = 0, skipped = 0;
  for (const record of records) {
    const user = await User.findById(record.userId);
    if (user && user.employee) {
      record.employee = user.employee;
      await record.save();
      migrated++;
    } else {
      skipped++;
    }
  }
  // Optionally, remove userId field from all attendance records
  await Attendance.updateMany({ userId: { $exists: true } }, { $unset: { userId: "" } });
  console.log(`Migrated ${migrated} attendance records. Skipped ${skipped} (no linked employee).`);
}

// 4. Run migration
async function runMigration() {
  try {
    await linkUsersToEmployees();
    await migrateAttendance();
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();