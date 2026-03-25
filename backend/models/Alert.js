/**
 * Alert Model
 * Stores triggered threshold breach events.
 * Used for audit trail, push notification history, and dashboard alert feed.
 */

const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "high_temperature",
        "low_temperature",
        "high_humidity",
        "high_co2",
        "overcrowding",
        "device_offline",
        "high_power",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    message: {
      type: String,
      required: true,
    },
    value: {
      type: Number, // The sensor value that triggered the alert
    },
    threshold: {
      type: Number, // The threshold that was breached
    },
    // Has a human acknowledged this alert in the dashboard?
    acknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: {
      type: Date,
    },
    // Was a push notification sent for this alert?
    notificationSent: {
      type: Boolean,
      default: false,
    },
    // Resolved = sensor reading came back to normal range
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

alertSchema.index({ roomId: 1, createdAt: -1 });
alertSchema.index({ acknowledged: 1, resolved: 1 });

module.exports = mongoose.model("Alert", alertSchema);
