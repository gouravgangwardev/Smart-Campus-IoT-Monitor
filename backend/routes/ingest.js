/**
 * IoT Data Ingest Route
 * POST /api/ingest
 *
 * This is the core endpoint called by:
 *   1. Raspberry Pi / ESP32 edge devices on campus (via X-Device-Key header)
 *   2. AWS IoT Core Rule Action (HTTP action forwarding MQTT messages here)
 *
 * Flow:
 *   Device sends reading → validate → store SensorReading → update Room.currentState
 *   → broadcast via Socket.IO → return 201
 *
 * Device payload example:
 * {
 *   "roomId": "64abc...",
 *   "deviceId": "RPI-CS101-01",
 *   "temperature": 28.4,
 *   "humidity": 65,
 *   "co2": 820,
 *   "lightLux": 340,
 *   "occupancy": 23,
 *   "powerWatts": 1450,
 *   "acStatus": true,
 *   "lightsStatus": true,
 *   "rssi": -72,
 *   "batteryPercent": 88
 * }
 */

const router = require("express").Router();
const Joi = require("joi");
const SensorReading = require("../models/SensorReading");
const Room = require("../models/Room");
const { authenticateDevice } = require("../middleware/auth");

// Validate incoming device payload
const readingSchema = Joi.object({
  roomId: Joi.string().length(24).required(),
  deviceId: Joi.string().max(64).required(),
  temperature: Joi.number().min(-10).max(60).optional(),
  humidity: Joi.number().min(0).max(100).optional(),
  co2: Joi.number().min(300).max(5000).optional(),
  lightLux: Joi.number().min(0).optional(),
  occupancy: Joi.number().integer().min(0).optional(),
  powerWatts: Joi.number().min(0).optional(),
  acStatus: Joi.boolean().optional(),
  lightsStatus: Joi.boolean().optional(),
  rssi: Joi.number().optional(),
  batteryPercent: Joi.number().min(0).max(100).optional(),
  // Allow device to send its own timestamp (ISO 8601); default to now
  timestamp: Joi.date().iso().max("now").optional(),
});

router.post("/", authenticateDevice, async (req, res) => {
  // ── 1. Validate payload ───────────────────────────────────────────────────
  const { error, value } = readingSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    roomId,
    deviceId,
    temperature,
    humidity,
    co2,
    lightLux,
    occupancy,
    powerWatts,
    acStatus,
    lightsStatus,
    rssi,
    batteryPercent,
    timestamp,
  } = value;

  try {
    // ── 2. Verify room exists ─────────────────────────────────────────────────
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found." });

    // ── 3. Persist sensor reading ─────────────────────────────────────────────
    const reading = await SensorReading.create({
      roomId,
      deviceId,
      timestamp: timestamp || new Date(),
      temperature,
      humidity,
      co2,
      lightLux,
      occupancy,
      powerWatts,
      acStatus,
      lightsStatus,
      rssi,
      batteryPercent,
    });

    // ── 4. Update Room.currentState (denormalised live view) ──────────────────
    // Only update fields that were included in this reading (not all devices
    // send all metrics — e.g., a door counter only sends occupancy).
    const stateUpdate = { "currentState.lastUpdated": reading.timestamp };
    if (temperature != null)  stateUpdate["currentState.temperature"]  = temperature;
    if (humidity    != null)  stateUpdate["currentState.humidity"]     = humidity;
    if (co2         != null)  stateUpdate["currentState.co2"]          = co2;
    if (lightLux    != null)  stateUpdate["currentState.lightLux"]     = lightLux;
    if (occupancy   != null)  stateUpdate["currentState.occupancy"]    = occupancy;
    if (powerWatts  != null)  stateUpdate["currentState.powerWatts"]   = powerWatts;
    if (acStatus    != null)  stateUpdate["currentState.acStatus"]     = acStatus;
    if (lightsStatus!= null)  stateUpdate["currentState.lightsStatus"] = lightsStatus;

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      { $set: stateUpdate },
      { new: true }
    );

    // ── 5. Broadcast via Socket.IO (dashboard gets live update) ───────────────
    const io = req.app.get("io");
    if (io) {
      // Emit to all clients subscribed to this room's feed
      io.to(`room_${roomId}`).emit("sensor_update", {
        roomId,
        reading: {
          temperature,
          humidity,
          co2,
          lightLux,
          occupancy,
          powerWatts,
          acStatus,
          lightsStatus,
          timestamp: reading.timestamp,
        },
        currentState: updatedRoom.currentState,
      });

      // Also emit to global dashboard feed (for overview page)
      io.emit("global_update", {
        roomId,
        roomName: room.name,
        building: room.building,
        occupancy: occupancy ?? room.currentState.occupancy,
        temperature: temperature ?? room.currentState.temperature,
        co2: co2 ?? room.currentState.co2,
        timestamp: reading.timestamp,
      });
    }

    res.status(201).json({
      message: "Reading stored.",
      readingId: reading._id,
    });
  } catch (err) {
    console.error("[INGEST] Error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
