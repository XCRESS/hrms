import jwt from "jsonwebtoken";

export const isLoggedIn = (req, res, next) => {
  try {
    console.log("Cookies:", req.cookies);
    const token = req.cookies?.token;

    console.log("Token Found:", token ? "YES" : "NO");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    console.log("Authenticated user:", req.user);
    next();
  } catch (error) {
    console.log("Auth middleware failure:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};