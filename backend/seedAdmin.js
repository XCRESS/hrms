import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.model.js";

dotenv.config();

const createAdmin = async () => {
  try {
    const adminEmail = "veshant@cosmosfin.com";
    // Check if an admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("Admin already exists:", existingAdmin.email);
      process.exit();
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash("admin123", 10);
    // Create admin user
    const admin = await User.create({
      name: "Veshant",
      email: adminEmail,
      password: hashedPassword,
      role: "admin"
    });
    console.log("Admin created successfully:", admin);
    process.exit();
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB connected. Seeding admin...");
    createAdmin();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });