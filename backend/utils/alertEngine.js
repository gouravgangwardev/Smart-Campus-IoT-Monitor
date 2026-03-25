/**
 * Alert Engine
 * Called every 2 minutes by cron job.
 * Checks current state of all active rooms against their thresholds.
 * Creates Alert documents and sends push notifications for new breaches.
 */

const Room = require("../models/Room");
const Alert = require("../models/Alert");
const User = require("../models/User");
const { sendPushNotification } = require("../config/firebase");

/**
 * Check all rooms and create alerts for any threshold breaches.
 * @param {Server} io - Socket.IO server instance for real-time alert broadcast
 * @returns {number} - count of alerts triggered
 */
const checkAlertThresholds = async (io) => {
  const rooms = await Room.find({ isActive: true });
  let triggered = 0;

  for (const room of rooms) {
    const s = room.currentState;
    const t = room.thresholds;

    // Skip rooms with no recent data (stale > 15 min)
    if (
      !s.lastUpdated ||
      Date.now() - new Date(s.lastUpdated) > 15 * 60 * 1000
    ) {
      continue;
    }

    const checks = [
      {
        condition: s.temperature > t.maxTemperature,
        type: "high_temperature",
        severity: s.temperature > t.maxTemperature + 5 ? "critical" : "warning",
        value: s.temperature,
        threshold: t.maxTemperature,
        message: `${room.name}: Temperature ${s.temperature}°C exceeds limit of ${t.maxTemperature}°C`,
      },
      {
        condition: s.temperature < t.minTemperature,
        type: "low_temperature",
        severity: "warning",
        value: s.temperature,
        threshold: t.minTemperature,
        message: `${room.name}: Temperature ${s.temperature}°C is below minimum of ${t.minTemperature}°C`,
      },
      {
        condition: s.humidity > t.maxHumidity,
        type: "high_humidity",
        severity: "warning",
        value: s.humidity,
        threshold: t.maxHumidity,
        message: `${room.name}: Humidity ${s.humidity}% exceeds ${t.maxHumidity}%`,
      },
      {
        condition: s.co2 > t.maxCO2,
        type: "high_co2",
        severity: s.co2 > 1500 ? "critical" : "warning",
        value: s.co2,
        threshold: t.maxCO2,
        message: `${room.name}: CO₂ at ${s.co2} ppm — ventilation needed (limit: ${t.maxCO2} ppm)`,
      },
      {
        condition: s.occupancy >= (t.maxOccupancy || room.capacity),
        type: "overcrowding",
        severity: "warning",
        value: s.occupancy,
        threshold: t.maxOccupancy || room.capacity,
        message: `${room.name}: Occupancy ${s.occupancy}/${room.capacity} — at capacity`,
      },
    ];

    for (const check of checks) {
      if (!check.condition) continue;

      // Dedup: don't re-alert if there's an unresolved alert of the same type
      const existing = await Alert.findOne({
        roomId: room._id,
        type: check.type,
        resolved: false,
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // within 30 min
      });
      if (existing) continue;

      // Create new alert
      const alert = await Alert.create({
        roomId: room._id,
        type: check.type,
        severity: check.severity,
        message: check.message,
        value: check.value,
        threshold: check.threshold,
      });

      triggered++;

      // Broadcast to all connected dashboard clients
      if (io) {
        io.emit("new_alert", {
          alert: {
            ...alert.toObject(),
            roomName: room.name,
            building: room.building,
          },
        });
      }

      // Send push notification to all facility managers and admins
      try {
        const staff = await User.find({
          role: { $in: ["admin", "facility"] },
          fcmToken: { $ne: null },
        }).select("fcmToken");

        for (const user of staff) {
          await sendPushNotification(
            user.fcmToken,
            `🚨 Campus Alert: ${check.severity.toUpperCase()}`,
            check.message,
            { alertId: alert._id.toString(), roomId: room._id.toString() }
          );
        }

        // Mark notification sent
        await Alert.findByIdAndUpdate(alert._id, { notificationSent: true });
      } catch (err) {
        console.error("[AlertEngine] Push notification error:", err.message);
      }
    }

    // Auto-resolve alerts where sensor is back to normal
    await resolveStaleAlerts(room);
  }

  return triggered;
};

/**
 * Mark existing open alerts as resolved if the sensor is back to normal
 */
const resolveStaleAlerts = async (room) => {
  const s = room.currentState;
  const t = room.thresholds;

  const resolutionMap = {
    high_temperature: s.temperature <= t.maxTemperature,
    low_temperature: s.temperature >= t.minTemperature,
    high_humidity: s.humidity <= t.maxHumidity,
    high_co2: s.co2 <= t.maxCO2,
    overcrowding: s.occupancy < (t.maxOccupancy || room.capacity),
  };

  for (const [type, isResolved] of Object.entries(resolutionMap)) {
    if (isResolved) {
      await Alert.updateMany(
        { roomId: room._id, type, resolved: false },
        { resolved: true, resolvedAt: new Date() }
      );
    }
  }
};

module.exports = { checkAlertThresholds };
