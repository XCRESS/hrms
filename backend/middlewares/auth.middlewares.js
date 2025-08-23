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
      
      // Fetch complete user data with isActive check in single query
      const user = await User.findOne({ 
        _id: decoded.id || decoded._id,
        isActive: true 
      });
      
      if (!user) {
        return res.status(401).json({ success: false, message: "Access Denied: User not found or inactive" });
      }
      
      // Set user data in request for controllers to use
      req.user = user;
      
      // If allowedRoles is specified, check user permissions
      if (allowedRoles.length) {
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ success: false, message: "Access Forbidden: Insufficient Permissions" });
        }
      }
      
      // For employees, check if their Employee profile is active
      if (user.role === "employee" && user.employeeId) {
        // Single query to check if employee profile is active
        const employee = await Employee.findOne({ 
          employeeId: user.employeeId,
          isActive: true 
        });
        
        if (!employee) {
          return res.status(403).json({ 
            success: false, 
            message: "Access Forbidden: Employee account is deactivated. Please contact HR." 
          });
        }
      } else if (user.role === "employee" && !user.employeeId) {
        // If employeeId is missing, add a warning in the request object but don't block access
        req.missingEmployeeId = true;
        console.warn(`User ${user._id} has role 'employee' but no employeeId`);
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