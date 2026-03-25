/**
 * Analytics Routes
 * GET /api/analytics/occupancy-heatmap    - hourly avg occupancy per room
 * GET /api/analytics/energy-summary       - daily energy consumption
 * GET /api/analytics/environment/:roomId  - env trends for a room over time
 * GET /api/analytics/campus-overview      - snapshot of all rooms
 * GET /api/analytics/reports              - list S3 reports
 * GET /api/analytics/reports/:key         - get presigned URL for a report
 */

const router = require("express").Router();
const moment = require("moment");
const SensorReading = require("../models/SensorReading");
const Room = require("../models/Room");
const { authenticate, authorize } = require("../middleware/auth");
const { listReports, getPresignedUrl } = require("../config/aws");

router.use(authenticate);

// ─── Campus overview: current state of every room ────────────────────────────
router.get("/campus-overview", async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }).select(
      "name building floor capacity roomType currentState"
    );

    const overview = rooms.map((r) => ({
      id: r._id,
      name: r.name,
      building: r.building,
      floor: r.floor,
      capacity: r.capacity,
      roomType: r.roomType,
      occupancy: r.currentState.occupancy,
      occupancyPercent: Math.round((r.currentState.occupancy / r.capacity) * 100),
      temperature: r.currentState.temperature,
      co2: r.currentState.co2,
      powerWatts: r.currentState.powerWatts,
      lastUpdated: r.currentState.lastUpdated,
      status: getStatus(r),
    }));

    res.json({ overview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Occupancy heatmap: average occupancy by hour of day, per room ────────────
router.get("/occupancy-heatmap", async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const since = moment().subtract(days, "days").toDate();

  try {
    const pipeline = [
      { $match: { timestamp: { $gte: since }, occupancy: { $exists: true } } },
      {
        $group: {
          _id: {
            roomId: "$roomId",
            hour: { $hour: "$timestamp" },
          },
          avgOccupancy: { $avg: "$occupancy" },
          maxOccupancy: { $max: "$occupancy" },
        },
      },
      {
        $group: {
          _id: "$_id.roomId",
          hourlyData: {
            $push: {
              hour: "$_id.hour",
              avg: { $round: ["$avgOccupancy", 1] },
              max: "$maxOccupancy",
            },
          },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      {
        $project: {
          roomId: "$_id",
          roomName: "$room.name",
          building: "$room.building",
          capacity: "$room.capacity",
          hourlyData: 1,
        },
      },
    ];

    const result = await SensorReading.aggregate(pipeline);
    res.json({ days, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Energy summary: total kWh per room per day ───────────────────────────────
router.get("/energy-summary", async (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const since = moment().subtract(days, "days").startOf("day").toDate();

  try {
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: since },
          powerWatts: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            roomId: "$roomId",
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
          },
          // Average watts over the day's readings; multiply by 24h = Wh → /1000 = kWh
          // Note: this is an estimate based on sampled data
          avgWatts: { $avg: "$powerWatts" },
          readingCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          estimatedKwh: {
            $round: [{ $divide: [{ $multiply: ["$avgWatts", 24] }, 1000] }, 2],
          },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id.roomId",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      {
        $project: {
          date: "$_id.date",
          roomId: "$_id.roomId",
          roomName: "$room.name",
          building: "$room.building",
          avgWatts: { $round: ["$avgWatts", 1] },
          estimatedKwh: 1,
          readingCount: 1,
        },
      },
      { $sort: { date: -1 } },
    ];

    const result = await SensorReading.aggregate(pipeline);
    res.json({ days, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Environment trends for a specific room ───────────────────────────────────
router.get("/environment/:roomId", async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 168); // max 7 days
  const since = moment().subtract(hours, "hours").toDate();

  try {
    const readings = await SensorReading.find(
      {
        roomId: req.params.roomId,
        timestamp: { $gte: since },
      },
      "timestamp temperature humidity co2 lightLux occupancy powerWatts"
    ).sort({ timestamp: 1 });

    res.json({ roomId: req.params.roomId, hours, readings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── List S3 reports (admin/facility only) ────────────────────────────────────
router.get("/reports", authorize("admin", "facility"), async (req, res) => {
  const prefix = req.query.prefix || `reports/${moment().format("YYYY")}/`;
  try {
    const reports = await listReports(prefix);
    res.json({ reports });
  } catch (err) {
    // S3 might not be configured in dev mode
    res.json({ reports: [], note: "S3 not configured." });
  }
});

// ─── Get presigned URL for a specific report ─────────────────────────────────
router.get(
  "/reports/download",
  authorize("admin", "facility"),
  async (req, res) => {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Report key required." });
    try {
      const url = getPresignedUrl(decodeURIComponent(key));
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Helper: compute room health status ──────────────────────────────────────
function getStatus(room) {
  const s = room.currentState;
  const t = room.thresholds;
  if (!s.lastUpdated) return "offline";
  const ageMinutes = (Date.now() - new Date(s.lastUpdated)) / 60000;
  if (ageMinutes > 10) return "stale";
  if (
    (s.temperature && s.temperature > t.maxTemperature) ||
    (s.co2 && s.co2 > t.maxCO2) ||
    (s.occupancy && s.occupancy >= room.capacity)
  )
    return "warning";
  return "ok";
}

module.exports = router;
