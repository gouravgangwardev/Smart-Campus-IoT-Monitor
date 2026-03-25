/**
 * Room Model
 * Represents a physical space on campus (classroom, lab, library section, etc.)
 * Each room has multiple associated sensors.
 */

const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g. "CS Lab 101", "Main Library - Hall A"
    },
    building: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    roomType: {
      type: String,
      enum: ["classroom", "lab", "library", "cafeteria", "office", "corridor"],
      default: "classroom",
    },
    // Thresholds used by the alert engine
    thresholds: {
      maxTemperature: { type: Number, default: 32 }, // °C
      minTemperature: { type: Number, default: 18 }, // °C
      maxHumidity: { type: Number, default: 70 },    // %
      maxCO2: { type: Number, default: 1000 },        // ppm — ASHRAE standard
      maxOccupancy: { type: Number },                 // defaults to capacity
    },
    // Current live state — updated on every ingest
    currentState: {
      occupancy: { type: Number, default: 0 },
      temperature: { type: Number, default: null },
      humidity: { type: Number, default: null },
      co2: { type: Number, default: null },
      lightLux: { type: Number, default: null },
      powerWatts: { type: Number, default: null },
      acStatus: { type: Boolean, default: false },
      lightsStatus: { type: Boolean, default: false },
      lastUpdated: { type: Date, default: null },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: occupancy percentage
roomSchema.virtual("occupancyPercent").get(function () {
  if (!this.capacity) return 0;
  return Math.round((this.currentState.occupancy / this.capacity) * 100);
});

// Virtual: is the room overcrowded
roomSchema.virtual("isCrowded").get(function () {
  return this.currentState.occupancy >= this.capacity * 0.9;
});

module.exports = mongoose.model("Room", roomSchema);
