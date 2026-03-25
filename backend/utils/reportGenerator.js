/**
 * Report Generator
 * Runs every hour (cron job in server.js).
 * Aggregates sensor data for the past hour and uploads JSON + CSV to S3.
 */

const moment = require("moment");
const SensorReading = require("../models/SensorReading");
const Room = require("../models/Room");
const { uploadReport } = require("../config/aws");

/**
 * Generate and upload the hourly energy & occupancy report to S3
 */
const generateHourlyReport = async () => {
  const now = moment();
  const hourStart = now.clone().subtract(1, "hour").startOf("hour");
  const hourEnd = hourStart.clone().endOf("hour");

  // Aggregate metrics per room for the past hour
  const pipeline = [
    {
      $match: {
        timestamp: { $gte: hourStart.toDate(), $lte: hourEnd.toDate() },
      },
    },
    {
      $group: {
        _id: "$roomId",
        avgTemperature: { $avg: "$temperature" },
        avgHumidity: { $avg: "$humidity" },
        avgCO2: { $avg: "$co2" },
        avgOccupancy: { $avg: "$occupancy" },
        maxOccupancy: { $max: "$occupancy" },
        avgPowerWatts: { $avg: "$powerWatts" },
        totalReadings: { $sum: 1 },
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
    { $unwind: { path: "$room", preserveNullAndEmpty: true } },
  ];

  const results = await SensorReading.aggregate(pipeline);

  // Build report object
  const report = {
    generatedAt: now.toISOString(),
    period: {
      start: hourStart.toISOString(),
      end: hourEnd.toISOString(),
    },
    totalRooms: results.length,
    rooms: results.map((r) => ({
      roomId: r._id,
      roomName: r.room?.name || "Unknown",
      building: r.room?.building || "Unknown",
      avgTemperature: round(r.avgTemperature),
      avgHumidity: round(r.avgHumidity),
      avgCO2: round(r.avgCO2),
      avgOccupancy: round(r.avgOccupancy),
      maxOccupancy: r.maxOccupancy,
      avgPowerWatts: round(r.avgPowerWatts),
      estimatedKwh: round((r.avgPowerWatts * 1) / 1000), // 1 hour window
      totalReadings: r.totalReadings,
    })),
  };

  // Campus totals
  report.campusTotals = {
    totalEstimatedKwh: report.rooms.reduce((s, r) => s + (r.estimatedKwh || 0), 0),
    avgCO2: round(avg(report.rooms.map((r) => r.avgCO2))),
    avgOccupancy: round(avg(report.rooms.map((r) => r.avgOccupancy))),
  };

  // Upload JSON
  const jsonKey = `reports/${now.format("YYYY/MM/DD")}/hourly_${now.format("HH")}.json`;
  await uploadReport(jsonKey, JSON.stringify(report, null, 2), "application/json");

  // Upload CSV
  const csv = buildCSV(report.rooms);
  const csvKey = `reports/${now.format("YYYY/MM/DD")}/hourly_${now.format("HH")}.csv`;
  await uploadReport(csvKey, csv, "text/csv");

  return report;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round = (n, decimals = 2) =>
  n != null ? Math.round(n * 10 ** decimals) / 10 ** decimals : null;

const avg = (arr) => {
  const valid = arr.filter((v) => v != null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
};

const buildCSV = (rooms) => {
  const headers = [
    "Room ID",
    "Room Name",
    "Building",
    "Avg Temp (°C)",
    "Avg Humidity (%)",
    "Avg CO2 (ppm)",
    "Avg Occupancy",
    "Max Occupancy",
    "Avg Power (W)",
    "Est. kWh",
    "Total Readings",
  ];

  const rows = rooms.map((r) =>
    [
      r.roomId,
      `"${r.roomName}"`,
      `"${r.building}"`,
      r.avgTemperature,
      r.avgHumidity,
      r.avgCO2,
      r.avgOccupancy,
      r.maxOccupancy,
      r.avgPowerWatts,
      r.estimatedKwh,
      r.totalReadings,
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
};

module.exports = { generateHourlyReport };
