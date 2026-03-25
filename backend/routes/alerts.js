/**
 * Alert Routes
 * GET   /api/alerts           - list alerts (filterable)
 * GET   /api/alerts/:id       - single alert
 * PATCH /api/alerts/:id/acknowledge  - mark as acknowledged
 */

const router = require("express").Router();
const Alert = require("../models/Alert");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);

// ─── List alerts ──────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.roomId) filter.roomId = req.query.roomId;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.acknowledged !== undefined)
      filter.acknowledged = req.query.acknowledged === "true";
    if (req.query.resolved !== undefined)
      filter.resolved = req.query.resolved === "true";

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .populate("roomId", "name building")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Alert.countDocuments(filter),
    ]);

    res.json({ total, page, limit, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Single alert ────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id).populate(
      "roomId",
      "name building floor"
    );
    if (!alert) return res.status(404).json({ error: "Alert not found." });
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Acknowledge an alert ─────────────────────────────────────────────────────
router.patch(
  "/:id/acknowledge",
  authorize("admin", "facility"),
  async (req, res) => {
    try {
      const alert = await Alert.findByIdAndUpdate(
        req.params.id,
        {
          acknowledged: true,
          acknowledgedBy: req.user._id,
          acknowledgedAt: new Date(),
        },
        { new: true }
      );
      if (!alert) return res.status(404).json({ error: "Alert not found." });

      // Broadcast acknowledgement to dashboard
      const io = req.app.get("io");
      if (io) io.emit("alert_acknowledged", { alertId: alert._id });

      res.json({ alert });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
