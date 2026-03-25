# 🏛️ Smart Campus IoT Monitor

> A real-time IoT platform for monitoring energy consumption, room occupancy, air quality, and environmental health across a university campus — built with Node.js, MongoDB, AWS S3, Firebase, Socket.IO, and ESP32 edge devices.

![Dashboard Preview](docs/screenshots/dashboard-overview.png)
*Live dashboard showing campus-wide occupancy, CO₂ levels, and active alerts*

---

## 📌 Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [IoT Device Setup](#iot-device-setup)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Team](#team)

---

## 🚨 Problem Statement

Indian university campuses waste enormous amounts of energy every day. Air conditioning and lights run in empty lecture halls. Students crowd into one lab while another sits half-empty. CO₂ levels in packed classrooms exceed 1,200 ppm — impairing concentration — while no one is alerted. Facility managers have no real-time visibility; they rely on manual rounds.

**Smart Campus IoT Monitor** solves this by deploying low-cost sensor clusters (ESP32 + DHT22 + MH-Z19B + BH1750) in every room and streaming live data to a cloud-backed dashboard, enabling:

- **Energy savings** by detecting empty rooms with running HVAC/lights
- **Student comfort** via CO₂ and temperature alerts
- **Crowd management** by showing real-time occupancy before students travel to a room
- **Audit trails** through hourly reports stored on AWS S3

---

## ✨ Features

| Feature | Description |
|---|---|
| 📡 **Real-time IoT Ingestion** | ESP32 devices POST sensor readings every 5 minutes. AWS IoT Core forwards MQTT to the REST API. |
| 📊 **Live Dashboard** | Socket.IO pushes updates to all connected browsers without polling |
| 🚨 **Smart Alert Engine** | Threshold-based alerts for CO₂, temperature, humidity, overcrowding — auto-resolves when conditions normalise |
| 🔔 **Push Notifications** | Firebase Cloud Messaging delivers critical alerts to facility manager's phone |
| ☁️ **Cloud Reports** | Hourly JSON + CSV energy reports auto-uploaded to AWS S3 with presigned download URLs |
| 📈 **Analytics & Trends** | 7-day occupancy heatmaps, temperature trends, energy bar charts, occupancy-CO₂ scatter plots |
| 🔐 **Role-based Auth** | Three roles: admin, facility, student — JWT-protected REST API |
| 🗄️ **Auto Data Pruning** | MongoDB TTL index auto-deletes raw readings after 90 days; aggregates persist on S3 |

---

## 🧰 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4 |
| Real-time | Socket.IO 4 |
| Database | MongoDB 7 (Atlas in production) |
| ODM | Mongoose 7 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Joi |
| Scheduling | node-cron |

### Cloud
| Service | Usage |
|---|---|
| **AWS S3** | Hourly energy/occupancy reports (JSON + CSV) |
| **AWS IoT Core** | MQTT broker for ESP32 devices; HTTP Rule Action forwards to ingest endpoint |
| **Firebase Admin** | Push notifications to facility managers |
| **MongoDB Atlas** | Managed cloud database (optional; local Mongo works for dev) |

### Frontend
| Technology | Usage |
|---|---|
| Vanilla JS + HTML/CSS | Single-file dashboard (no build step required) |
| Chart.js 4 | Bar, line, scatter charts |
| Socket.IO client | Real-time updates |
| Google Fonts | Space Mono + DM Sans |

### IoT Edge
| Component | Purpose |
|---|---|
| ESP32 DevKit | WiFi microcontroller |
| DHT22 | Temperature + Humidity |
| MH-Z19B | CO₂ (NDIR sensor) |
| BH1750 | Light intensity (lux) |
| PIR HC-SR501 | Presence detection |
| PZEM-004T | AC power monitoring |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  CAMPUS LAYER                                                        │
│                                                                      │
│  [ESP32 Sensor Cluster]──WiFi──▶ [AWS IoT Core MQTT Broker]         │
│       Room 101..N                        │                           │
│                                   HTTP Rule Action                   │
│                                          │                           │
└──────────────────────────────────────────┼──────────────────────────┘
                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND LAYER (Node.js + Express)                                   │
│                                                                      │
│  POST /api/ingest ──▶ Validate ──▶ SensorReading.save()             │
│                              └──▶ Room.currentState update           │
│                              └──▶ Socket.IO broadcast                │
│                                                                      │
│  node-cron (every 2 min) ──▶ Alert Engine ──▶ Alert.create()        │
│                                         └──▶ Firebase Push Notif.   │
│                                                                      │
│  node-cron (every 1 hr)  ──▶ Report Generator ──▶ AWS S3 upload     │
│                                                                      │
│  REST API (JWT-protected):                                           │
│    /api/auth  /api/rooms  /api/sensors  /api/alerts  /api/analytics │
└──────────────┬──────────────────────────────────────────────────────┘
               │ WebSocket (Socket.IO)
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND LAYER (Single HTML file, no build required)               │
│                                                                      │
│  Dashboard → Overview | Rooms | Alerts | Analytics | Energy          │
│  Charts: Chart.js | Live: Socket.IO | Auth: JWT in localStorage     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
smart-campus-iot/
├── backend/
│   ├── server.js               # Express + Socket.IO entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   ├── database.js         # MongoDB connection
│   │   ├── firebase.js         # Firebase Admin SDK
│   │   └── aws.js              # AWS S3 helpers
│   ├── models/
│   │   ├── Room.js             # Campus room schema
│   │   ├── SensorReading.js    # Time-series IoT readings
│   │   ├── Alert.js            # Alert events
│   │   └── User.js             # Auth users
│   ├── routes/
│   │   ├── auth.js             # Login / register / FCM token
│   │   ├── rooms.js            # CRUD rooms
│   │   ├── sensors.js          # Reading history
│   │   ├── alerts.js           # Alert list + acknowledge
│   │   ├── analytics.js        # Aggregation endpoints
│   │   └── ingest.js           # IoT device data ingestion ← core
│   ├── middleware/
│   │   └── auth.js             # JWT + RBAC + device key
│   └── utils/
│       ├── alertEngine.js      # Threshold checking + auto-resolve
│       └── reportGenerator.js  # S3 hourly report upload
├── frontend/
│   └── index.html              # Complete single-file dashboard
├── scripts/
│   ├── seedDatabase.js         # Seed 7 days of realistic data
│   └── esp32_firmware.ino      # Arduino sketch for edge device
└── docs/
    ├── screenshots/
    └── PROJECT_REPORT.md
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- MongoDB 6+ running locally **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- Git

### Step 1 — Clone the repository
```bash
git clone https://github.com/yourname/smart-campus-iot.git
cd smart-campus-iot
```

### Step 2 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 3 — Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and set at minimum:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart_campus_iot
JWT_SECRET=a_very_long_random_secret_string_here
DEVICE_INGEST_KEY=any_secure_random_key
```
AWS and Firebase keys are optional for local development — the app runs without them (S3 uploads and push notifications will be skipped with a console warning).

### Step 4 — Seed the database
This creates 3 demo users, 10 rooms, and ~2,000 realistic sensor readings spread over the past 7 days.
```bash
cd ../scripts
node seedDatabase.js
```

Expected output:
```
[Seed] Connected to MongoDB
[Seed] Created 3 users
[Seed] Created 10 rooms
[Seed] Readings inserted: 20160/20160
[Seed] Created 5 alerts

╔══════════════════════════════════════════════════════╗
║           SEED COMPLETE — Login Credentials           ║
╠══════════════════════════════════════════════════════╣
║  Admin    → admin@campus.edu    / password123         ║
║  Facility → facility@campus.edu / password123         ║
║  Student  → student@campus.edu  / password123         ║
╚══════════════════════════════════════════════════════╝
```

### Step 5 — Start the backend
```bash
cd ../backend
npm run dev   # uses nodemon for auto-restart
```
The API is now running at `http://localhost:5000`

### Step 6 — Open the frontend
Simply open `frontend/index.html` in your browser. No build step required.

> For production, serve `frontend/index.html` from a static host (Netlify, S3, Nginx) and set `FRONTEND_URL` in your backend `.env` to the deployed URL.

---

## 📖 Usage

### Dashboard Login
Open `frontend/index.html`, then login with:
- **Admin**: `admin@campus.edu` / `password123`
- **Facility Manager**: `facility@campus.edu` / `password123`
- **Student**: `student@campus.edu` / `password123`

### Simulate an IoT device sending data
```bash
curl -X POST http://localhost:5000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: your_device_ingest_key" \
  -d '{
    "roomId": "<copy a roomId from MongoDB>",
    "deviceId": "TEST-DEVICE-01",
    "temperature": 29.5,
    "humidity": 68,
    "co2": 1100,
    "lightLux": 320,
    "occupancy": 38,
    "powerWatts": 1850,
    "acStatus": true,
    "lightsStatus": true
  }'
```
The dashboard will update in real time — you'll see the room card change and, if CO₂ > 1000, an alert will fire within 2 minutes.

---

## 🔌 API Reference

All endpoints (except `/api/auth/*` and `/api/ingest`) require:
```
Authorization: Bearer <JWT token>
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register user |
| POST | `/api/auth/login` | None | Login, get JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/rooms` | JWT | List all rooms |
| POST | `/api/rooms` | Admin | Create room |
| PUT | `/api/rooms/:id` | Admin | Update room |
| GET | `/api/sensors/:roomId/latest` | JWT | Latest reading |
| GET | `/api/sensors/:roomId/history` | JWT | Paginated history |
| POST | `/api/ingest` | Device Key | IoT data ingest |
| GET | `/api/alerts` | JWT | List alerts |
| PATCH | `/api/alerts/:id/acknowledge` | Facility+ | Acknowledge alert |
| GET | `/api/analytics/campus-overview` | JWT | All rooms live state |
| GET | `/api/analytics/occupancy-heatmap` | JWT | Hourly avg occupancy |
| GET | `/api/analytics/energy-summary` | JWT | Daily kWh per room |
| GET | `/api/analytics/environment/:id` | JWT | Env trend for room |
| GET | `/api/analytics/reports` | Facility+ | List S3 reports |
| GET | `/health` | None | Health check |

---

## 📡 IoT Device Setup

1. Install Arduino IDE + ESP32 board support
2. Install libraries via Library Manager:
   - `DHT sensor library` (Adafruit)
   - `MH-Z19` (Jonathan Dempsey)
   - `BH1750` (Christopher Laws)
   - `ArduinoJson` (Benoit Blanchon)
3. Open `scripts/esp32_firmware.ino`
4. Update WiFi credentials, `SERVER_URL`, `DEVICE_KEY`, and `ROOM_ID`
5. Connect hardware per the pin definitions at the top of the file
6. Flash to ESP32 via USB

The device will wake every 5 minutes, read all sensors, POST to the server, and enter deep sleep — consuming ~40 µA during sleep.

---

## 🖼️ Screenshots

### Overview Dashboard
Live campus-wide stats: occupancy %, temperature, active alert count, and per-room bar charts.
*(See `docs/screenshots/dashboard-overview.png`)*

### Rooms Grid
Individual room cards with live occupancy bars and colour-coded metric indicators.
*(See `docs/screenshots/rooms-grid.png`)*

### Room Detail Modal
24-hour temperature and CO₂ trend chart for any room, with 6 key metrics at a glance.
*(See `docs/screenshots/room-detail.png`)*

### Alerts Page
Alert feed with severity badges, timestamps, and one-click acknowledgement.
*(See `docs/screenshots/alerts.png`)*

### Analytics & Energy
Hourly occupancy heatmap, occupancy–CO₂ scatter plot, and 14-day energy bar chart.
*(See `docs/screenshots/analytics.png`)*

---

## 🔮 Future Improvements

1. **ML Anomaly Detection** — Train an Isolation Forest model on 30+ days of readings to detect abnormal power spikes or unusual CO₂ patterns (beyond simple thresholds)
2. **HVAC Automation** — Add actuator commands in the ingest response: if CO₂ > 1000 and room is occupied, command the AC unit to switch to fresh-air mode
3. **Predictive Occupancy** — Use past week's patterns to forecast room availability and expose a student-facing mobile app
4. **AWS Timestream** — Replace MongoDB time-series with AWS Timestream for unlimited retention and faster range queries at scale
5. **Multi-campus support** — Namespace rooms by campus; aggregate reports across institutions
6. **Energy bill estimation** — Integrate electricity tariff rates to convert kWh to ₹ cost per room per month
7. **MQTT Direct** — Replace REST ingest with AWS IoT Core MQTT → Lambda → MongoDB for lower latency and offline buffering

---

## 👥 Team

| Name | Role |
|---|---|
| Student A | Backend API, Alert Engine |
| Student B | IoT Firmware, Hardware Integration |
| Student C | Frontend Dashboard, Chart.js |
| Student D | Cloud (AWS S3, Firebase), Database Design |

---

## 📄 License

MIT License — free for academic and educational use.
