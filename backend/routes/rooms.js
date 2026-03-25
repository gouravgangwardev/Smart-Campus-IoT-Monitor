/**
 * Room Routes
 * GET    /api/rooms           - list all rooms (student can access)
 * GET    /api/rooms/:id       - single room with live state
 * POST   /api/rooms           - create room (admin only)
 * PUT    /api/rooms/:id       - update room (admin only)
 * DELETE /api/rooms/:id       - deactivate room (admin only)
 */

const router = require("express").Router();
const Joi = require("joi");
const Room = require("../models/Room");
const { authenticate, authorize } = require("../middleware/auth");

// All routes require login
router.use(authenticate);

// ─── GET all rooms ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.building) filter.building = req.query.building;
    if (req.query.type) filter.roomType = req.query.type;

    const rooms = await Room.find(filter).sort({ building: 1, name: 1 });
    res.json({ count: rooms.length, rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single room ──────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found." });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST create room (admin only) ───────────────────────────────────────────
router.post("/", authorize("admin"), async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    building: Joi.string().required(),
    floor: Joi.number().integer().required(),
    capacity: Joi.number().integer().min(1).required(),
    roomType: Joi.string()
      .valid("classroom", "lab", "library", "cafeteria", "office", "corridor")
      .default("classroom"),
    thresholds: Joi.object({
      maxTemperature: Joi.number(),
      minTemperature: Joi.number(),
      maxHumidity: Joi.number(),
      maxCO2: Joi.number(),
      maxOccupancy: Joi.number(),
    }).optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const room = await Room.create(value);
    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT update room (admin only) ────────────────────────────────────────────
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ error: "Room not found." });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE (soft-delete) room (admin only) ──────────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await Room.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Room deactivated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
