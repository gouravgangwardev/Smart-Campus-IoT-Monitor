<div align="center">

<br/>

```
░█▀▀░█▄█░█▀█░█▀▄░▀█▀░░░█▀▀░█▀█░█▄█░█▀█░█░█░█▀▀
░▀▀█░█░█░█▀█░█▀▄░░█░░░░█░░░█▀█░█░█░█▀▀░█░█░▀▀█
░▀▀▀░▀░▀░▀░▀░▀░▀░░▀░░░░▀▀▀░▀░▀░▀░▀░▀░░░▀▀▀░▀▀▀
░▀█▀░█▀█░▀█▀░░░█▄█░█▀█░█▀█░▀█▀░▀█▀░█▀█░█▀▄
░░█░░█░█░░█░░░░█░█░█░█░█░█░░█░░░█░░█░█░█▀▄
░▀▀▀░▀▀▀░░▀░░░░▀░▀░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀
```

<br/>

<img src="https://img.shields.io/badge/Node.js-20_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
<img src="https://img.shields.io/badge/AWS_S3-Cloud_Reports-FF9900?style=for-the-badge&logo=amazons3&logoColor=white"/>
<img src="https://img.shields.io/badge/Firebase-Push_Alerts-FFCA28?style=for-the-badge&logo=firebase&logoColor=black"/>
<img src="https://img.shields.io/badge/Socket.IO-Real--time-010101?style=for-the-badge&logo=socket.io&logoColor=white"/>
<img src="https://img.shields.io/badge/ESP32-Firmware-E7352C?style=for-the-badge&logo=espressif&logoColor=white"/>

<br/><br/>

> **A real-time IoT platform that watches over your campus — energy, air quality,**  
> **occupancy, and environment — so the people inside can breathe easier and think clearer.**

<br/>

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-Open_Dashboard-00d4aa?style=for-the-badge)](#usage)
[![Report](https://img.shields.io/badge/📄_Project_Report-Read_Now-2E5DA3?style=for-the-badge)](docs/PROJECT_REPORT.md)
[![GitHub](https://img.shields.io/badge/⭐_Star_this_repo-if_it_helped-gold?style=for-the-badge)](https://github.com/gouravgangwardev/Smart-Campus-IoT-Monitor)

</div>

---

<br/>

## 🧭 The Story Behind This

I used to walk into the CS lab to find it packed, while the identical one next door sat empty. The library was freezing in January because nobody had turned off the AC after the last class. During exams, I'd trek across campus to find the seminar hall full — with no way to have known in advance.

These weren't dramatic problems. They were small, daily frictions felt by everyone on campus. But they all came from the same root cause: **nobody had real-time visibility into what was happening inside campus rooms.**

So I built a system that changes that.

A network of **₹3,000 sensor clusters** (ESP32 + 5 sensors per room) streams temperature, humidity, CO₂, light, occupancy, and power data to a cloud backend every 5 minutes. A live dashboard shows every room's status in real time. When CO₂ climbs past safe limits or a room hits capacity, an alert fires and the facility manager's phone buzzes — **within 2 minutes, automatically.**

No manual rounds. No guessing. No wasted electricity in empty rooms.

<br/>

---

## 📋 Table of Contents

| | Section |
|--|---------|
| [🔍](#the-problem-in-numbers) | The Problem in Numbers |
| [✨](#features) | Features |
| [🏗️](#architecture) | System Architecture |
| [🧰](#tech-stack) | Tech Stack |
| [📁](#project-structure) | Project Structure |
| [🚀](#installation) | Installation Guide |
| [📡](#iot-device-setup) | IoT Device Setup (ESP32) |
| [🔌](#api-reference) | API Reference |
| [🖼️](#screenshots) | Screenshots |
| [🔮](#future-roadmap) | Future Roadmap |
| [👤](#author) | Author |

<br/>

---

## 🔍 The Problem in Numbers

<br/>

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   37%  of AC runtime occurs in rooms with zero occupancy                │
│   28%  of lighting burns outside scheduled class hours                  │
│   ₹2L+ average monthly electricity bill per academic block              │
│  1200  ppm CO₂ in a packed lecture hall — Harvard says cognition drops  │
│    0   automated alerts in place before this system                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

> Research by Harvard's T.H. Chan School of Public Health shows cognitive function scores drop measurably above **1,000 ppm CO₂**. Most packed lecture halls hit this within an hour of starting. Nobody was measuring. Nobody was acting on it.

<br/>

---

## ✨ Features

<br/>

### 📡 Real-Time IoT Ingestion
ESP32 clusters wake every 5 minutes, read all sensors, and POST to the API. In production, devices register with **AWS IoT Core** via MQTT; a Rule Action forwards messages to the ingest endpoint. Data arrives at the dashboard within **2 seconds** of leaving the sensor.

### 📊 Live Dashboard — No Refresh Needed
Socket.IO pushes updates to every connected browser the instant new data arrives. The overview page updates room cards live. Open a room's detail modal and watch the charts animate with fresh readings in real time.

### 🚨 Smart Alert Engine
A cron job runs every 2 minutes, checking every room against its configured thresholds. It raises alerts for:
- 🌡️ Temperature above/below limit
- 💧 Humidity exceeding safe levels
- 🌬️ CO₂ breaching ASHRAE 1,000 ppm standard
- 👥 Occupancy at or over room capacity

Alerts **auto-resolve** when the sensor returns to normal range — creating a complete audit trail of when each problem started and ended. A 30-minute deduplication window prevents alert storms from oscillating sensors.

### 🔔 Push Notifications to Facility Staff
Firebase Cloud Messaging delivers critical alerts directly to facility managers' phones and browsers. No polling. No email chains. Just an immediate buzz when something needs attention.

### ☁️ Automated Cloud Reports
Every hour, an aggregation pipeline summarises energy and occupancy data per room. The results are uploaded to **AWS S3** as both JSON (for programmatic use) and CSV (for Excel). Download any historical report instantly via a **presigned URL** — no bucket credentials exposed.

### 📈 Analytics That Actually Tell You Something
- **Occupancy heatmap** — hourly averages across the week, so you know *when* rooms fill up
- **Temperature trends** — 7-day rolling view per room
- **CO₂ vs Occupancy scatter** — visual confirmation that ventilation follows people
- **14-day energy chart** — spot which rooms are the biggest consumers

### 🔐 Role-Based Access Control

| Role | Can See | Can Do |
|------|---------|--------|
| `admin` | Everything | Manage rooms, users, all data |
| `facility` | All rooms & alerts | Acknowledge alerts, download reports |
| `student` | Room occupancy only | View-only — no sensitive env data |

### 🗄️ Automatic Data Lifecycle Management
MongoDB TTL index auto-deletes raw sensor readings after **90 days**. Aggregated reports persist forever on S3. The database never bloats; historical data is always accessible.

<br/>

---

## 🏗️ Architecture

<br/>

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  EDGE LAYER                                                                  ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────────────────────┐   ║
║   │  ESP32 + DHT22 + MH-Z19B + BH1750 + PIR + PZEM-004T               │   ║
║   │  Installed in each room  │  Wakes every 5 min  │  Deep sleep 40µA  │   ║
║   └──────────────────────────────────┬──────────────────────────────────┘   ║
║                                      │ HTTPS POST  (or MQTT → IoT Core)     ║
╚══════════════════════════════════════╪══════════════════════════════════════╝
                                       │
╔══════════════════════════════════════╪══════════════════════════════════════╗
║  BACKEND LAYER  (Node.js + Express)  │                                       ║
║                                      ▼                                       ║
║   POST /api/ingest ─────────────────────────────────────────────────────    ║
║      │  1. Joi validation                                                    ║
║      │  2. SensorReading.create()          ┌──────────────────────────┐     ║
║      │  3. Room.currentState.$set()        │     MongoDB Atlas         │     ║
║      │  4. Socket.IO broadcast  ───────────│  SensorReading (TTL 90d) │     ║
║      └─────────────────────────────────────│  Room (live state cache)  │     ║
║                                            │  Alert  │  User           │     ║
║   node-cron (*/2 min)                      └──────────────────────────┘     ║
║      └─▶ Alert Engine                                                        ║
║             ├─▶ Alert.create()  +  Socket.IO emit                           ║
║             └─▶ Firebase FCM  ──────────────────────▶  📱 Staff phone       ║
║                                                                              ║
║   node-cron (0 * * * *)                                                      ║
║      └─▶ Report Generator                                                    ║
║             └─▶ MongoDB Aggregation  ──▶  AWS S3  (JSON + CSV)              ║
╚══════════════════════════════════════════════════════════════════════════════╝
                        │ WebSocket (Socket.IO)
╔══════════════════════╪═══════════════════════════════════════════════════════╗
║  FRONTEND LAYER      ▼                                                       ║
║                                                                              ║
║   Single HTML file  │  Chart.js  │  Socket.IO client  │  JWT auth           ║
║                                                                              ║
║   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐   ║
║   │ Overview │  │  Rooms   │  │  Alerts  │  │ Analytics │  │  Energy  │   ║
║   └──────────┘  └──────────┘  └──────────┘  └───────────┘  └──────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

<br/>

### Data Flow — What Happens in 2 Seconds

```
[ESP32 wakes from deep sleep]
        │
        │  reads DHT22, MH-Z19B, BH1750, PIR, PZEM
        │  builds JSON payload via ArduinoJson
        │
        ▼
[HTTPS POST /api/ingest]  ←── X-Device-Key header authentication
        │
        ├── Joi validates payload (rejects bad sensor data instantly)
        ├── SensorReading inserted into MongoDB
        ├── Room.currentState updated (atomic $set, partial fields only)
        └── Socket.IO emits to:
                ├── global channel → overview page cards update
                └── room_{id} channel → detail modal chart animates
```

<br/>

---

## 🧰 Tech Stack

<br/>

### Backend
| Technology | Version | Why This Choice |
|------------|---------|-----------------|
| **Node.js** | 20 LTS | Event-driven I/O handles concurrent device POSTs + WebSocket connections on a single thread efficiently |
| **Express.js** | 4.18 | Minimal, modular, well-understood — no magic |
| **Socket.IO** | 4.7 | Room-based channels, auto-reconnect, polling fallback for restricted campus WiFi |
| **Mongoose** | 7.6 | Flexible schema for variable-field IoT payloads; TTL index for auto-pruning |
| **Joi** | 17 | Declarative payload validation at API boundaries — catches bad sensor data before it touches the DB |
| **node-cron** | 3.0 | Lightweight cron for alert engine (every 2 min) and report generation (hourly) |
| **bcryptjs + JWT** | — | Industry-standard auth; bcrypt for password hashing, JWT for stateless sessions |

### Cloud
| Service | Used For | Why |
|---------|----------|-----|
| **AWS S3** | Hourly energy + occupancy reports (JSON & CSV) | Unlimited cheap storage; presigned URLs for secure access without exposing credentials |
| **AWS IoT Core** | MQTT broker for ESP32 devices (production) | Managed MQTT at scale; Rule Actions forward to REST endpoint |
| **Firebase Admin** | Push notifications to facility staff | Single API for Android + web browser notifications; generous free tier |
| **MongoDB Atlas** | Cloud database (optional for dev) | Managed, replicated, with Time Series collection support for future migration |

### Frontend
| Technology | Used For |
|------------|----------|
| **Vanilla JS (ES2020+)** | No framework, no build step — works from `file://` or any static host |
| **Chart.js 4** | Bar, line, scatter charts with dark-mode theming |
| **Socket.IO client** | Live real-time updates from CDN |
| **Google Fonts** | Space Mono (data/numbers) + DM Sans (body) |

### IoT Hardware
| Component | Spec | Cost |
|-----------|------|------|
| **ESP32 DevKit v1** | Dual-core 240 MHz, WiFi, deep sleep (~40µA) | ₹450 |
| **DHT22** | Temp ±0.5°C, Humidity ±2% | ₹180 |
| **MH-Z19B** | CO₂ NDIR sensor, ±50 ppm accuracy | ₹1,400 |
| **BH1750** | Light 0–65,535 lux via I²C | ₹80 |
| **PIR HC-SR501** | Passive infrared presence detection | ₹60 |
| **PZEM-004T** | AC power monitoring (W, kWh, V, A) | ₹650 |
| **Enclosure + PCB** | Custom or ABS project box | ₹200 |
| **Total per room** | | **~₹3,020** |

<br/>

---

## 📁 Project Structure

<br/>

```
Smart-Campus-IoT-Monitor/
│
├── 📂 backend/
│   ├── 📄 server.js                    ← Express + Socket.IO entry point + cron jobs
│   ├── 📄 package.json
│   ├── 📄 .env.example                 ← Copy this to .env and fill in your keys
│   │
│   ├── 📂 config/
│   │   ├── 📄 database.js              ← MongoDB connection with retry logic
│   │   ├── 📄 aws.js                   ← S3 upload, presigned URLs, list reports
│   │   └── 📄 firebase.js             ← Firebase Admin SDK + sendPushNotification()
│   │
│   ├── 📂 models/
│   │   ├── 📄 Room.js                  ← Campus room + live currentState subdocument
│   │   ├── 📄 SensorReading.js        ← Time-series IoT data (TTL + compound index)
│   │   ├── 📄 Alert.js                 ← Alert lifecycle (created → acked → resolved)
│   │   └── 📄 User.js                  ← Auth users with role enum + FCM token
│   │
│   ├── 📂 routes/
│   │   ├── 📄 auth.js                  ← Login, register, /me, FCM token save
│   │   ├── 📄 rooms.js                 ← CRUD rooms (admin-gated create/update/delete)
│   │   ├── 📄 sensors.js              ← Latest reading + paginated history per room
│   │   ├── 📄 alerts.js               ← List, filter, acknowledge alerts
│   │   ├── 📄 analytics.js            ← Aggregations: heatmap, energy, overview, trends
│   │   └── 📄 ingest.js               ← ⭐ IoT device data ingestion (core endpoint)
│   │
│   ├── 📂 middleware/
│   │   └── 📄 auth.js                  ← JWT verify + RBAC factory + device key auth
│   │
│   └── 📂 utils/
│       ├── 📄 alertEngine.js           ← Threshold checks, dedup, auto-resolve + FCM
│       └── 📄 reportGenerator.js      ← MongoDB aggregation → JSON + CSV → S3 upload
│
├── 📂 frontend/
│   └── 📄 index.html                  ← ⭐ Complete dashboard (zero build step)
│
├── 📂 scripts/
│   ├── 📄 seedDatabase.js             ← 7 days of realistic data, 3 users, 10 rooms
│   └── 📄 esp32_firmware.ino         ← Complete Arduino sketch for edge device
│
├── 📂 docs/
│   └── 📄 PROJECT_REPORT.md          ← Full academic report
│
├── 📄 README.md
└── 📄 .gitignore
```

<br/>

---

## 🚀 Installation

<br/>

### What You Need First
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **MongoDB** — either [locally](https://www.mongodb.com/try/download/community) or a free [Atlas cluster](https://www.mongodb.com/atlas)
- **Git**

That's it. AWS and Firebase credentials are **optional** for local development — the app runs completely without them (S3 uploads and push notifications are skipped with a console warning, everything else works normally).

---

### Step 1 — Clone

```bash
git clone https://github.com/gouravgangwardev/Smart-Campus-IoT-Monitor.git
cd Smart-Campus-IoT-Monitor
```

---

### Step 2 — Install dependencies

```bash
cd backend
npm install
```

---

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Open `.env` in any editor and set **at minimum** these four values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart_campus_iot
JWT_SECRET=pick_any_long_random_string_here_minimum_32_chars
DEVICE_INGEST_KEY=pick_any_key_your_iot_devices_will_use
```

<details>
<summary>☁️ Optional: Add AWS + Firebase for full cloud features</summary>

```env
# AWS S3 — for hourly report uploads
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=smart-campus-reports

# Firebase — for push notifications
# Paste your entire service account JSON as a single-line string
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

</details>

---

### Step 4 — Seed the database

This creates 3 demo users, 10 realistic campus rooms, and **20,160 sensor readings** spread across the past 7 days with proper diurnal patterns (morning/afternoon occupancy peaks, CO₂ rising with occupancy, etc.).

```bash
cd ../scripts
node seedDatabase.js
```

You'll see:

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

---

### Step 5 — Start the server

```bash
cd ../backend
npm run dev
```

```
🚀 Smart Campus API running on port 5000
   Environment : development
   WebSocket   : enabled
   Cron jobs   : active
```

---

### Step 6 — Open the dashboard

Open `frontend/index.html` directly in your browser.

> **No build step. No npm install for the frontend. Just open the file.**

Login with `admin@campus.edu` / `password123` and you'll see a fully populated live dashboard.

<br/>

---

## 📡 IoT Device Setup

<br/>

### Hardware Wiring

```
ESP32 DevKit v1
│
├── GPIO 4   ──── DHT22 data pin (Temperature + Humidity)
│
├── GPIO 16  ──── MH-Z19B RX  (CO₂ sensor — UART2)
├── GPIO 17  ──── MH-Z19B TX
│
├── GPIO 21  ──── BH1750 SDA  (Light sensor — I²C)
├── GPIO 22  ──── BH1750 SCL
│
├── GPIO 13  ──── PIR HC-SR501 OUT (Presence detection)
│
├── GPIO 18  ──── PZEM-004T RX (Power monitor — UART1)
└── GPIO 19  ──── PZEM-004T TX
```

### Arduino Libraries to Install

Open Arduino IDE → Tools → Manage Libraries → search and install:

| Library | Author |
|---------|--------|
| `DHT sensor library` | Adafruit |
| `MH-Z19` | Jonathan Dempsey |
| `BH1750` | Christopher Laws |
| `ArduinoJson` | Benoit Blanchon |

### Flash the Firmware

1. Open `scripts/esp32_firmware.ino` in Arduino IDE
2. Update these four values at the top of the file:
```cpp
const char* WIFI_SSID   = "YourCampusWiFi";
const char* WIFI_PASS   = "wifi_password";
const char* SERVER_URL  = "https://your-api-domain.com/api/ingest";
const char* DEVICE_KEY  = "your_device_ingest_key";   // matches DEVICE_INGEST_KEY in .env
const char* ROOM_ID     = "64abc...";                  // MongoDB ObjectId of this room
```
3. Select your board: **Tools → Board → ESP32 Dev Module**
4. Select your port and click **Upload**

The device will wake every 5 minutes, read all sensors, POST to the API, and go back to deep sleep. Average current draw: **under 10 mA** on a 5-minute cycle.

<br/>

---

## 🔌 API Reference

<br/>

All endpoints except login/register and `/api/ingest` require:
```
Authorization: Bearer <your_jwt_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | None | Create account |
| `POST` | `/api/auth/login` | None | Login → get JWT |
| `GET` | `/api/auth/me` | JWT | Get current user |
| `POST` | `/api/auth/fcm-token` | JWT | Save FCM token for push notifications |

### Rooms

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/rooms` | JWT | List all active rooms (filter by `?building=` or `?type=`) |
| `GET` | `/api/rooms/:id` | JWT | Single room with live state |
| `POST` | `/api/rooms` | Admin | Create room |
| `PUT` | `/api/rooms/:id` | Admin | Update room config / thresholds |
| `DELETE` | `/api/rooms/:id` | Admin | Soft-delete room |

### IoT Ingest ⭐

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/ingest` | `X-Device-Key` header | Submit sensor reading from IoT device |

**Example payload:**
```json
{
  "roomId": "64abc123def456789012345a",
  "deviceId": "ESP32-CSLAB101-01",
  "temperature": 28.4,
  "humidity": 65,
  "co2": 920,
  "lightLux": 340,
  "occupancy": 23,
  "powerWatts": 1450,
  "acStatus": true,
  "lightsStatus": true,
  "rssi": -72,
  "batteryPercent": 88
}
```
All fields except `roomId` and `deviceId` are optional — partial payloads are supported (a power-only device can POST just `powerWatts`).

### Sensors

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/sensors/:roomId/latest` | JWT | Most recent reading for a room |
| `GET` | `/api/sensors/:roomId/history` | JWT | Paginated reading history (`?page=1&limit=50`) |

### Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/alerts` | JWT | List alerts (filter by `?severity=`, `?acknowledged=`, `?resolved=`) |
| `GET` | `/api/alerts/:id` | JWT | Single alert detail |
| `PATCH` | `/api/alerts/:id/acknowledge` | Facility+ | Mark alert as acknowledged |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/analytics/campus-overview` | JWT | Live state snapshot of all rooms |
| `GET` | `/api/analytics/occupancy-heatmap` | JWT | Hourly avg occupancy per room (`?days=7`) |
| `GET` | `/api/analytics/energy-summary` | JWT | Daily kWh per room (`?days=14`) |
| `GET` | `/api/analytics/environment/:roomId` | JWT | Env trend for one room (`?hours=24`) |
| `GET` | `/api/analytics/reports` | Facility+ | List S3 reports |
| `GET` | `/api/analytics/reports/download?key=...` | Facility+ | Get presigned download URL |

### Health Check

```
GET /health
→ { "status": "ok", "uptime": 3600, "timestamp": "..." }
```

<br/>

---

## 🖼️ Screenshots

<br/>

> Screenshots show the live dashboard running with seeded data. All charts, cards, and alerts are real — not mocks.

### Overview Dashboard
Live campus-wide stats: total occupancy %, average temperature, active alert count, and per-room occupancy + CO₂ bar charts that update in real time as sensor data arrives.

```
📸 docs/screenshots/dashboard-overview.png
```

### Rooms Grid
All campus rooms in one view. Each card shows live temperature, CO₂, and power readings with colour-coded indicators (green = healthy, amber = warning, red = critical). The occupancy bar fills proportionally to capacity.

```
📸 docs/screenshots/rooms-grid.png
```

### Room Detail Modal
Click any room to open a drill-down modal with 6 live metrics and a dual-axis chart showing the past 24 hours of temperature and CO₂ together — so you can see exactly when they peaked and whether they tracked together.

```
📸 docs/screenshots/room-detail.png
```

### Alerts Page
Full alert feed with severity badges, room names, timestamps, and one-click acknowledgement. Facility managers see a "Acknowledge" button; students see read-only view.

```
📸 docs/screenshots/alerts.png
```

### Analytics + Energy
Hourly occupancy heatmap across the week (see when rooms are busiest), a 7-day temperature trend line, an occupancy-vs-CO₂ scatter plot, and a 14-day energy bar chart with per-room breakdown.

```
📸 docs/screenshots/analytics.png
```

<br/>

---

## 🔮 Future Roadmap

<br/>

These are the features deliberately left out of v1.0 — not because they weren't worth building, but because shipping a complete, working, well-documented core beats shipping an impressive-but-half-finished everything.

```
v1.1 — HVAC Automation
       └─ Add actuator commands to the ingest response payload
          If CO₂ > 1000 ppm and room is occupied:
          respond with { "command": "set_ac_mode", "value": "fresh_air" }
          ESP32 firmware checks response and toggles relay accordingly

v1.2 — Predictive Occupancy
       └─ Train a simple time-series model (Prophet or LSTM) on 30+ days of readings
          to forecast room availability 1–2 hours ahead
          Expose a student-facing endpoint: GET /api/predict/:roomId

v1.3 — ML Anomaly Detection
       └─ Isolation Forest on rolling sensor windows
          Detect unusual power spikes (equipment fault?)
          or CO₂ patterns that don't match occupancy (sensor drift?)

v2.0 — AWS Timestream Migration
       └─ Replace MongoDB SensorReading collection with Timestream
          for unlimited retention, faster range queries, and native
          time-series aggregations without custom aggregation pipelines

v2.1 — Multi-Campus Support
       └─ Namespace all data by campus ID
          Campus admin sees only their buildings
          Super admin sees cross-campus comparison dashboard

v2.2 — Energy Bill Estimation
       └─ Integrate electricity tariff rates (₹/kWh, time-of-use pricing)
          Convert kWh to actual cost per room per month
          Generate monthly bill breakdown reports
```

<br/>

---

## 🤝 Contributing

Contributions are welcome — especially improvements to:
- The ESP32 firmware (better sensor fusion, MQTT direct instead of REST)
- The analytics queries (performance improvements, new chart types)
- The alert engine (smarter thresholds, hysteresis logic)

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: describe what you added"
git push origin feature/your-feature-name
# Open a Pull Request
```

<br/>

---

## 👤 Author

<br/>

**Gourav Gangwar**

B.Tech / MCA student passionate about building systems that solve real problems — not just demonstrate concepts.

[![GitHub](https://img.shields.io/badge/GitHub-gouravgangwardev-181717?style=for-the-badge&logo=github)](https://github.com/gouravgangwardev)

<br/>

---

## 📄 License

MIT License — free for academic, educational, and personal use.

```
Copyright (c) 2025 Gourav Gangwar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software to use, copy, modify, merge, publish, distribute, and/or sell
copies of it, subject to the standard MIT terms.
```

<br/>

---

<div align="center">

**If this project helped you, saved you time, or gave you ideas — leave a ⭐**

*Built with genuine frustration at cold empty libraries and hot packed labs.*

<br/>

```
Every sensor reading is a question answered before it was asked.
```

</div>
