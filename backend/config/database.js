/**
 * MongoDB connection using Mongoose
 * Uses Atlas URI in production, local MongoDB in development
 */

const mongoose = require("mongoose");

const connectDB = async () => {
  const uri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_campus_iot";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] MongoDB connected → ${mongoose.connection.host}`);
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected. Retrying...");
  });
};

module.exports = connectDB;
