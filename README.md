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

---

<br/>

## The Story Behind This

I used to walk into the CS lab to find it packed, while the identical one next door sat empty. The library was freezing in January because nobody had turned off the AC after the last class. During exams, I'd trek across campus to find the seminar hall full — with no way to have known in advance.

These weren't dramatic problems. They were small, daily frictions felt by everyone on campus. But they all came from the same root cause: **nobody had real-time visibility into what was happening inside campus rooms.**

So I built a system that changes that.

A network of **₹3,000 sensor clusters** (ESP32 + 5 sensors per room) streams temperature, humidity, CO₂, light, occupancy, and power data to a cloud backend every 5 minutes. A live dashboard shows every room's status in real time. When CO₂ climbs past safe limits or a room hits capacity, an alert fires and the facility manager's phone buzzes — **within 2 minutes, automatically.**

No manual rounds. No guessing. No wasted electricity in empty rooms.

<br/>

---

## The Problem in Numbers

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

## Features

<br/>

### Real-Time IoT Ingestion
ESP32 clusters wake every 5 minutes, read all sensors, and POST to the API. In production, devices register with **AWS IoT Core** via MQTT; a Rule Action forwards messages to the ingest endpoint. Data arrives at the dashboard within **2 seconds** of leaving the sensor.

### Live Dashboard — No Refresh Needed
Socket.IO pushes updates to every connected browser the instant new data arrives. The overview page updates room cards live. Open a room's detail modal and watch the charts animate with fresh readings in real time.

### Smart Alert Engine
A cron job runs every 2 minutes, checking every room against its configured thresholds. It raises alerts for:
- Temperature above/below limit
- Humidity exceeding safe levels
- CO₂ breaching ASHRAE 1,000 ppm standard
- Occupancy at or over room capacity

Alerts **auto-resolve** when the sensor returns to normal range — creating a complete audit trail of when each problem started and ended. A 30-minute deduplication window prevents alert storms from oscillating sensors.

### Push Notifications to Facility Staff
Firebase Cloud Messaging delivers critical alerts directly to facility managers' phones and browsers. No polling. No email chains. Just an immediate buzz when something needs attention.

### Automated Cloud Reports
Every hour, an aggregation pipeline summarises energy and occupancy data per room. The results are uploaded to **AWS S3** as both JSON (for programmatic use) and CSV (for Excel). Download any historical report instantly via a **presigned URL** — no bucket credentials exposed.

### Analytics That Actually Tell You Something
- **Occupancy heatmap** — hourly averages across the week, so you know *when* rooms fill up
- **Temperature trends** — 7-day rolling view per room
- **CO₂ vs Occupancy scatter** — visual confirmation that ventilation follows people
- **14-day energy chart** — spot which rooms are the biggest consumers

### Role-Based Access Control

| Role | Can See | Can Do |
|------|---------|--------|
| `admin` | Everything | Manage rooms, users, all data |
| `facility` | All rooms & alerts | Acknowledge alerts, download reports |
| `student` | Room occupancy only | View-only — no sensitive env data |

### Automatic Data Lifecycle Management
MongoDB TTL index auto-deletes raw sensor readings after **90 days**. Aggregated reports persist forever on S3. The database never bloats; historical data is always accessible.

<br/>

---

## Architecture

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
║             └─▶ Firebase FCM  ──────────────────────▶  Staff phone          ║
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


<img width="676" height="996" alt="image" src="https://github.com/user-attachments/assets/fc790b61-6af4-4d87-aed9-75da16b9717c" />


<br/>

---

## Tech Stack

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

## Project Structure

<br/>


<img width="472" height="976" alt="image" src="https://github.com/user-attachments/assets/b4d6e0c4-b580-44b2-b690-7afa349becb3" />



<br/>

---

## API Reference

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

### IoT Ingest

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

## Author

<br/>

**Gourav Gangwar**

B.Tech student passionate about building systems that solve real problems — not just demonstrate concepts.

<br/>

---

```
Every sensor reading is a question answered before it was asked.
```

</div>
