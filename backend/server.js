/**
 * Smart Campus IoT Monitor - Main Server
 * Entry point for the Express + Socket.IO backend
 *
 * Architecture:
 *   HTTP REST API  → Express routes
 *   Real-time data → Socket.IO
 *   IoT ingestion  → /api/ingest endpoint (called by edge devices / AWS IoT Rule)
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");

const connectDB = require("./config/database");
const { initFirebase } = require("./config/firebase");
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const sensorRoutes = require("./routes/sensors");
const alertRoutes = require("./routes/alerts");
const analyticsRoutes = require("./routes/analytics");
const ingestRoutes = require("./routes/ingest");
const { generateHourlyReport } = require("./utils/reportGenerator");
const { checkAlertThresholds } = require("./utils/alertEngine");

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO setup (real-time dashboard updates) ───────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Attach io instance to app so routes can emit events
app.set("io", io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter — protects ingest endpoint from rogue devices
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  message: { error: "Too many requests, slow down." },
});
app.use("/api/", limiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ingest", ingestRoutes); // IoT device data ingestion endpoint

// Health check — used by AWS ELB / monitoring
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Socket.IO connection handler ────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Client subscribes to a specific room's live feed
  socket.on("subscribe_room", (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`[WS] ${socket.id} subscribed to room_${roomId}`);
  });

  socket.on("unsubscribe_room", (roomId) => {
    socket.leave(`room_${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ─── Scheduled Jobs ───────────────────────────────────────────────────────────
// Generate hourly energy report and push to AWS S3
cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Generating hourly energy report...");
  try {
    await generateHourlyReport();
    console.log("[CRON] Hourly report uploaded to S3.");
  } catch (err) {
    console.error("[CRON] Report generation failed:", err.message);
  }
});

// Check alert thresholds every 2 minutes
cron.schedule("*/2 * * * *", async () => {
  try {
    const triggered = await checkAlertThresholds(io);
    if (triggered > 0) {
      console.log(`[CRON] ${triggered} alert(s) triggered.`);
    }
  } catch (err) {
    console.error("[CRON] Alert check failed:", err.message);
  }
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  initFirebase();
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Smart Campus API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
    console.log(`   WebSocket   : enabled`);
    console.log(`   Cron jobs   : active\n`);
  });
}

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});

module.exports = { app, io };
