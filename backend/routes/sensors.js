/**
 * Sensor Routes
 * GET /api/sensors/:roomId/latest   - most recent reading for a room
 * GET /api/sensors/:roomId/history  - paginated reading history
 */

const router = require("express").Router();
const SensorReading = require("../models/SensorReading");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// Latest reading for a room
router.get("/:roomId/latest", async (req, res) => {
  try {
    const reading = await SensorReading.findOne({ roomId: req.params.roomId })
      .sort({ timestamp: -1 })
      .lean();

    if (!reading) return res.status(404).json({ error: "No readings found." });
    res.json({ reading });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Paginated reading history
router.get("/:roomId/history", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  try {
    const readings = await SensorReading.find({ roomId: req.params.roomId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await SensorReading.countDocuments({
      roomId: req.params.roomId,
    });

    res.json({ total, page, limit, readings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
