/**
 * Database Seed Script
 * Run: node scripts/seedDatabase.js
 *
 * Creates:
 *   - 3 admin/facility users
 *   - 10 campus rooms across 3 buildings
 *   - 500 realistic sensor readings spread over the last 7 days
 *   - 5 sample alerts
 */

require("dotenv").config({ path: "../backend/.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ── Models ────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  role: String, isActive: { type: Boolean, default: true },
});
const roomSchema = new mongoose.Schema({
  name: String, building: String, floor: Number, capacity: Number,
  roomType: String, isActive: { type: Boolean, default: true },
  thresholds: {
    maxTemperature: Number, minTemperature: Number,
    maxHumidity: Number, maxCO2: Number, maxOccupancy: Number,
  },
  currentState: {
    occupancy: Number, temperature: Number, humidity: Number,
    co2: Number, lightLux: Number, powerWatts: Number,
    acStatus: Boolean, lightsStatus: Boolean, lastUpdated: Date,
  },
}, { timestamps: true });
const readingSchema = new mongoose.Schema({
  roomId: mongoose.Schema.Types.ObjectId,
  deviceId: String, timestamp: Date,
  temperature: Number, humidity: Number, co2: Number,
  lightLux: Number, occupancy: Number, powerWatts: Number,
  acStatus: Boolean, lightsStatus: Boolean, rssi: Number, batteryPercent: Number,
});
const alertSchema = new mongoose.Schema({
  roomId: mongoose.Schema.Types.ObjectId,
  type: String, severity: String, message: String,
  value: Number, threshold: Number,
  acknowledged: { type: Boolean, default: false },
  resolved: { type: Boolean, default: false },
  notificationSent: { type: Boolean, default: false },
}, { timestamps: true });

const User    = mongoose.model("User",          userSchema);
const Room    = mongoose.model("Room",          roomSchema);
const Reading = mongoose.model("SensorReading", readingSchema);
const Alert   = mongoose.model("Alert",         alertSchema);

// ── Seed data ─────────────────────────────────────────────────────────────────
const ROOMS_DATA = [
  { name: "CS Lab 101",         building: "Engineering Block",  floor: 1, capacity: 40,  roomType: "lab",       maxTemp: 30, maxCO2: 900 },
  { name: "CS Lab 102",         building: "Engineering Block",  floor: 1, capacity: 40,  roomType: "lab",       maxTemp: 30, maxCO2: 900 },
  { name: "Seminar Hall A",     building: "Engineering Block",  floor: 2, capacity: 100, roomType: "classroom", maxTemp: 32, maxCO2: 1000 },
  { name: "Library - Hall A",   building: "Central Library",    floor: 1, capacity: 150, roomType: "library",   maxTemp: 28, maxCO2: 800 },
  { name: "Library - Study B",  building: "Central Library",    floor: 2, capacity: 60,  roomType: "library",   maxTemp: 28, maxCO2: 800 },
  { name: "Canteen Main",       building: "Student Centre",     floor: 0, capacity: 200, roomType: "cafeteria", maxTemp: 35, maxCO2: 1200 },
  { name: "Lecture Hall LH-1",  building: "Academic Block B",   floor: 1, capacity: 120, roomType: "classroom", maxTemp: 32, maxCO2: 1000 },
  { name: "Lecture Hall LH-2",  building: "Academic Block B",   floor: 1, capacity: 120, roomType: "classroom", maxTemp: 32, maxCO2: 1000 },
  { name: "IoT Research Lab",   building: "Engineering Block",  floor: 3, capacity: 20,  roomType: "lab",       maxTemp: 28, maxCO2: 900 },
  { name: "Faculty Lounge",     building: "Academic Block B",   floor: 2, capacity: 30,  roomType: "office",    maxTemp: 28, maxCO2: 800 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand  = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
const randI = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Simulate realistic occupancy based on hour of day (Gaussian-ish curve)
 * Peak hours: 10:00–13:00 and 14:00–17:00
 */
function simulateOccupancy(capacity, hour) {
  const peaks = [
    { center: 10.5, spread: 1.5 },
    { center: 15.0, spread: 1.5 },
  ];
  let score = 0;
  for (const p of peaks) {
    score += Math.exp(-0.5 * Math.pow((hour - p.center) / p.spread, 2));
  }
  // Nights and early mornings: near zero
  if (hour < 7 || hour > 21) score = 0;
  const base = Math.round(capacity * score * 0.85);
  return Math.max(0, Math.min(capacity, base + randI(-3, 3)));
}

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_campus_iot";
  await mongoose.connect(uri);
  console.log("[Seed] Connected to MongoDB\n");

  // Wipe existing data
  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    Reading.deleteMany({}),
    Alert.deleteMany({}),
  ]);
  console.log("[Seed] Cleared existing collections");

  // ── Users ──────────────────────────────────────────────────────────────────
  const hashedPw = await bcrypt.hash("password123", 12);
  const users = await User.insertMany([
    { name: "Admin User",      email: "admin@campus.edu",    password: hashedPw, role: "admin" },
    { name: "Facility Manager",email: "facility@campus.edu", password: hashedPw, role: "facility" },
    { name: "Test Student",    email: "student@campus.edu",  password: hashedPw, role: "student" },
  ]);
  console.log(`[Seed] Created ${users.length} users`);

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const roomDocs = ROOMS_DATA.map((r, i) => ({
    name: r.name, building: r.building, floor: r.floor,
    capacity: r.capacity, roomType: r.roomType, isActive: true,
    thresholds: {
      maxTemperature: r.maxTemp, minTemperature: 18,
      maxHumidity: 70, maxCO2: r.maxCO2, maxOccupancy: r.capacity,
    },
    currentState: {
      occupancy: 0, temperature: null, humidity: null, co2: null,
      lightLux: null, powerWatts: null, acStatus: false,
      lightsStatus: false, lastUpdated: null,
    },
  }));
  const rooms = await Room.insertMany(roomDocs);
  console.log(`[Seed] Created ${rooms.length} rooms`);

  // ── Sensor Readings (7 days, every 5 minutes per room) ─────────────────────
  const NOW     = Date.now();
  const DAYS    = 7;
  const STEP_MS = 5 * 60 * 1000; // 5-minute intervals
  const readings = [];

  for (const room of rooms) {
    const deviceId = `DEVICE-${room.name.replace(/\s+/g, "-").toUpperCase()}-01`;
    let t = NOW - DAYS * 24 * 60 * 60 * 1000;

    while (t <= NOW) {
      const dt   = new Date(t);
      const hour = dt.getHours() + dt.getMinutes() / 60;
      const occ  = simulateOccupancy(room.capacity, hour);
      const isOn = occ > 0;

      // Temperature rises with occupancy and time of day
      const baseTemp = 23 + (occ / room.capacity) * 6;
      const temp     = round2(baseTemp + rand(-1, 1));

      // CO2 rises with occupancy (400 ppm background, ~15 ppm per person)
      const co2  = Math.round(400 + occ * 15 + rand(-20, 20));

      // Power: base load + occupancy-driven load
      const basePower  = isOn ? rand(200, 400) : rand(20, 60);
      const occPower   = occ * rand(8, 15);
      const totalWatts = Math.round(basePower + occPower);

      readings.push({
        roomId:        room._id,
        deviceId,
        timestamp:     dt,
        temperature:   temp,
        humidity:      round2(55 + (occ / room.capacity) * 15 + rand(-3, 3)),
        co2,
        lightLux:      isOn ? Math.round(rand(180, 500)) : Math.round(rand(0, 40)),
        occupancy:     occ,
        powerWatts:    totalWatts,
        acStatus:      isOn && temp > 26,
        lightsStatus:  isOn,
        rssi:          randI(-85, -45),
        batteryPercent:randI(60, 100),
      });

      t += STEP_MS;
    }

    // Update room's currentState with the latest reading
    const last = readings[readings.length - 1];
    await Room.findByIdAndUpdate(room._id, {
      "currentState.occupancy":     last.occupancy,
      "currentState.temperature":   last.temperature,
      "currentState.humidity":      last.humidity,
      "currentState.co2":           last.co2,
      "currentState.lightLux":      last.lightLux,
      "currentState.powerWatts":    last.powerWatts,
      "currentState.acStatus":      last.acStatus,
      "currentState.lightsStatus":  last.lightsStatus,
      "currentState.lastUpdated":   last.timestamp,
    });
  }

  // Insert in batches of 5000 to avoid memory issues
  const BATCH = 5000;
  let inserted = 0;
  for (let i = 0; i < readings.length; i += BATCH) {
    await Reading.insertMany(readings.slice(i, i + BATCH), { ordered: false });
    inserted += Math.min(BATCH, readings.length - i);
    process.stdout.write(`\r[Seed] Readings inserted: ${inserted}/${readings.length}`);
  }
  console.log("\n[Seed] Sensor readings done");

  // ── Sample Alerts ─────────────────────────────────────────────────────────
  const alerts = await Alert.insertMany([
    {
      roomId: rooms[0]._id, type: "high_co2", severity: "warning",
      message: "CS Lab 101: CO₂ at 1050 ppm — ventilation needed",
      value: 1050, threshold: 900, acknowledged: false, resolved: false,
    },
    {
      roomId: rooms[2]._id, type: "overcrowding", severity: "warning",
      message: "Seminar Hall A: Occupancy 102/100 — at capacity",
      value: 102, threshold: 100, acknowledged: true, resolved: true,
    },
    {
      roomId: rooms[3]._id, type: "high_temperature", severity: "critical",
      message: "Library Hall A: Temperature 33°C exceeds limit of 28°C",
      value: 33, threshold: 28, acknowledged: false, resolved: false,
    },
    {
      roomId: rooms[6]._id, type: "high_co2", severity: "warning",
      message: "Lecture Hall LH-1: CO₂ at 980 ppm",
      value: 980, threshold: 1000, acknowledged: false, resolved: true,
    },
    {
      roomId: rooms[5]._id, type: "overcrowding", severity: "warning",
      message: "Canteen Main: Occupancy 205/200",
      value: 205, threshold: 200, acknowledged: false, resolved: false,
    },
  ]);
  console.log(`[Seed] Created ${alerts.length} alerts`);

  console.log(`
╔══════════════════════════════════════════════════════╗
║           SEED COMPLETE — Login Credentials           ║
╠══════════════════════════════════════════════════════╣
║  Admin    → admin@campus.edu    / password123         ║
║  Facility → facility@campus.edu / password123         ║
║  Student  → student@campus.edu  / password123         ║
╚══════════════════════════════════════════════════════╝
  `);

  await mongoose.disconnect();
}

const round2 = (n) => Math.round(n * 100) / 100;

seed().catch((err) => {
  console.error("\n[Seed] ERROR:", err.message);
  process.exit(1);
});
