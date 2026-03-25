/**
 * SensorReading Model
 * Time-series document for each batch of readings from a room's sensor cluster.
 * Optimised for range queries (indexed on roomId + timestamp).
 *
 * In production, this collection should use MongoDB's Time Series Collection
 * feature for efficient compression and querying:
 *   db.createCollection("sensorreadings", {
 *     timeseries: { timeField: "timestamp", metaField: "roomId", granularity: "seconds" }
 *   })
 */

const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    // Device that submitted this reading (MAC address or device ID)
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Environmental sensors
    temperature: {
      type: Number,    // Celsius
      min: -10,
      max: 60,
    },
    humidity: {
      type: Number,    // % relative humidity
      min: 0,
      max: 100,
    },
    co2: {
      type: Number,    // ppm
      min: 300,
      max: 5000,
    },
    lightLux: {
      type: Number,    // lux
      min: 0,
    },
    // Occupancy sensor (PIR + ultrasonic fusion)
    occupancy: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Power monitoring (smart plug / clamp meter)
    powerWatts: {
      type: Number,
      min: 0,
    },
    // Actuator states (reported back from device)
    acStatus: {
      type: Boolean,
      default: false,
    },
    lightsStatus: {
      type: Boolean,
      default: false,
    },
    // Signal quality from the IoT device
    rssi: {
      type: Number, // dBm — lower is worse
    },
    batteryPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    // Don't add createdAt/updatedAt — we use timestamp field directly
    timestamps: false,
  }
);

// Compound index for efficient "last N readings for room X" queries
sensorReadingSchema.index({ roomId: 1, timestamp: -1 });

// TTL index — auto-delete raw readings after 90 days (keep aggregates on S3)
sensorReadingSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 3600 }
);

module.exports = mongoose.model("SensorReading", sensorReadingSchema);
