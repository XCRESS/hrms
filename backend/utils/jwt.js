import jwt from "jsonwebtoken";

export const generateToken = (payload) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
  } catch (error) {
    console.error("Token generation error:", error.message);
    throw new Error("Failed to generate authentication token");
  }
};

export const verifyToken = (token) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      console.error("Token verification error:", error.message);
      throw new Error("Failed to verify token");
    }
  }
};