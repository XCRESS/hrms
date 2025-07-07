import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.model.js";
import Employee from "../models/Employee.model.js";

const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader)
        return res.status(401).json({ success: false, message: "Access Denied: No Token Provided" });
      
      const token = authHeader.split(" ")[1];
      if (!token)
        return res.status(401).json({ success: false, message: "Access Denied: Invalid Authorization Format" });
      
      const decoded = verifyToken(token);
      
      // Fetch complete user data to ensure we have all necessary fields
      const user = await User.findById(decoded.id || decoded._id);
      
      if (!user) {
        return res.status(401).json({ success: false, message: "Access Denied: User not found" });
      }
      
      // Set user data in request for controllers to use
      req.user = user;
      
      // If allowedRoles is specified, check user permissions
      if (allowedRoles.length) {
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ success: false, message: "Access Forbidden: Insufficient Permissions" });
        }
      }
      
      // For employees, we should still allow access even if employeeId is missing
      // This is because some employees might not have an associated ID yet
      if (user.role === "employee") {
        // Only check if the user is active, don't block based on missing employeeId
        const userExists = await User.findOne({ 
          _id: user._id,
          isActive: true
        });
        
        if (!userExists) {
          return res.status(403).json({ success: false, message: "Access Forbidden: Invalid user ID or inactive account" });
        }
        
        // If employeeId is missing, add a warning in the request object but don't block access
        if (!user.employeeId) {
          req.missingEmployeeId = true;
          console.warn(`User ${user._id} has role 'employee' but no employeeId`);
        }
      }
      
      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      return res.status(401).json({ 
        success: false, 
        message: err.message || "Invalid Token",
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      });
    }
  };
};

export default authMiddleware;