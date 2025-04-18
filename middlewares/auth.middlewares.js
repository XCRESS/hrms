import { verifyToken } from "../utils/jwt.js";

const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Access Denied: No Token Provided" });
    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyToken(token);
      if (allowedRoles.length && !allowedRoles.includes(decoded.role))
        return res.status(403).json({ message: "Access Forbidden: Insufficient Permissions" });
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(400).json({ message: "Invalid Token" });
    }
  };
};

export default authMiddleware;