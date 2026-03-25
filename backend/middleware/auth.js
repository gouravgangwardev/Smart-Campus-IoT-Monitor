/**
 * Authentication & Authorization Middleware
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_prod";

/**
 * Verify JWT token and attach user to req.user
 */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

/**
 * Role-based access control factory
 * Usage: authorize("admin", "facility")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
};

/**
 * Device API key auth for IoT ingest endpoint
 * Devices send X-Device-Key header — checked against env var
 */
const authenticateDevice = (req, res, next) => {
  const key = req.headers["x-device-key"];
  if (!key || key !== process.env.DEVICE_INGEST_KEY) {
    return res.status(401).json({ error: "Invalid device key." });
  }
  next();
};

module.exports = { authenticate, authorize, authenticateDevice };
