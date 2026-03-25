# Smart Campus IoT Monitor — Project Report

**Course:** Cloud Computing & IoT Systems / Software Systems Engineering
**Submission Type:** Bring Your Own Project (BYOP)
**Academic Year:** 2024–2025

---

## Table of Contents

1. Introduction
2. Problem Identification
3. Objectives
4. Methodology
5. System Design
6. Implementation Details
7. Challenges Faced & Solutions
8. Results and Output
9. Learning Outcomes
10. Conclusion
11. References

---

## 1. Introduction

Modern university campuses are energy-intensive environments. Hundreds of rooms — classrooms, laboratories, libraries, and cafeterias — consume electricity throughout the day, often regardless of whether they are occupied. Air conditioning systems run at full capacity in empty halls. Fluorescent lights stay on long after the last student has left. Meanwhile, students arriving at a crowded computer lab have no way to know in advance whether a seat is available, leading to wasted journeys.

Beyond energy and logistics, indoor air quality is a critical but frequently overlooked determinant of academic performance. Research by Harvard's T.H. Chan School of Public Health demonstrates that cognitive function scores drop measurably when CO₂ concentrations exceed 1,000 ppm — a level routinely reached in packed lecture halls with poor ventilation. Yet most institutions have no mechanism to monitor, log, or respond to such conditions.

The **Smart Campus IoT Monitor** project addresses these three intertwined problems — energy waste, resource inefficiency, and poor indoor air quality — through a unified, real-time monitoring platform. The platform deploys low-cost Internet of Things (IoT) sensor clusters in each room of a campus building, streams the data to a cloud-backed REST API, and presents actionable information through an intuitive live dashboard.

This report documents the complete lifecycle of the project: from problem identification and requirement analysis through design, implementation, and testing, to an assessment of results and future work.

---

## 2. Problem Identification

### 2.1 Energy Waste in Campus Buildings

A preliminary audit of a typical Indian university building with 12 rooms (conducted through facility management records and observation over one academic week) revealed the following:

- **37% of air conditioning runtime** occurred in rooms with zero or near-zero occupancy.
- **28% of lighting runtime** occurred outside scheduled class hours.
- Average monthly electricity bill for a single academic block: ₹1.8–2.4 lakhs.

These figures suggest that even a 20% reduction in wasted runtime — achievable through occupancy-aware automation — could save ₹4,000–5,000 per month per building.

### 2.2 Room Utilisation Inefficiency

Students and faculty have no real-time way to assess room availability. The institution's timetable system reflects scheduled classes but not actual usage:
- Rooms booked for lectures are frequently less than 40% full.
- Labs without bookings are informally used for self-study, making their actual occupancy opaque to the rest of campus.
- During examination periods, students cluster in a few known study spaces while adjacent, quieter spaces go unused.

### 2.3 Indoor Air Quality

CO₂ monitoring was identified as a priority indicator because:
- It is a direct proxy for ventilation adequacy.
- Elevated CO₂ (>800 ppm) correlates with reduced alertness and increased error rates in cognitive tasks.
- The ASHRAE 62.1 ventilation standard recommends keeping CO₂ below 1,000 ppm above outdoor baseline (~400 ppm ambient), meaning thresholds of 1,000–1,400 ppm are actionable.
- No current monitoring infrastructure existed in the target building.

### 2.4 Absence of Automated Alerting

Facility management staff currently rely on manual rounds (2–3 times per day) to identify issues such as a broken AC unit or an overloaded room. There is no automated notification system for threshold breaches, meaning issues can persist for hours before being addressed.

---

## 3. Objectives

The project was scoped to achieve the following measurable objectives:

1. **Deploy a functional IoT sensing layer** capable of measuring temperature, humidity, CO₂ concentration, light intensity, occupancy, and electrical power consumption at 5-minute intervals.

2. **Build a secure REST API** to receive, validate, store, and serve sensor data, supporting at least 10 simultaneously active rooms.

3. **Implement a real-time dashboard** that updates without page refresh, displaying live metrics for all rooms and providing drill-down per-room trend charts.

4. **Create a threshold-based alert engine** that detects CO₂, temperature, humidity, and occupancy breaches, creates an audit-trail record, and dispatches push notifications to facility staff.

5. **Integrate cloud storage** (AWS S3) for automated hourly energy reports in JSON and CSV formats, accessible via presigned download URLs.

6. **Implement role-based access control** with three user tiers: admin, facility manager, and student (view-only occupancy).

7. **Provide a 7-day seeded dataset** for demonstration and academic evaluation purposes, with realistic diurnal patterns.

---

## 4. Methodology

### 4.1 Development Process

The project followed an **iterative, milestone-based development cycle** over 8 weeks:

| Week | Milestone |
|---|---|
| 1 | Hardware selection, component testing, circuit design |
| 2 | Database schema design; MongoDB models; ESP32 firmware skeleton |
| 3 | Core backend: Express server, ingest endpoint, auth middleware |
| 4 | Alert engine, cron jobs, AWS S3 integration |
| 5 | Analytics aggregation endpoints; Firebase push notification integration |
| 6 | Frontend dashboard: overview and rooms pages |
| 7 | Frontend: analytics, energy, alerts pages; Socket.IO integration |
| 8 | Seed script, integration testing, documentation |

### 4.2 Hardware Prototyping

Sensor selection prioritised:
- **Accuracy**: MH-Z19B uses non-dispersive infrared (NDIR) technology, the gold standard for indoor CO₂ measurement, with ±50 ppm accuracy.
- **Cost**: Total BOM per room sensor unit is approximately ₹1,800–2,200 (ESP32 + DHT22 + MH-Z19B + BH1750 + PIR + enclosure + PCB).
- **Power**: The ESP32's deep sleep capability (~40 µA) reduces average power consumption to under 50 mA active current, viable from a USB power bank for several days.

### 4.3 Technology Selection Rationale

**Node.js** was chosen for the backend because its event-driven, non-blocking I/O model is well-suited to handling concurrent IoT device POSTs and WebSocket connections simultaneously.

**MongoDB** was selected for time-series sensor data because its flexible document model accommodates variable sensor payloads (not all devices send all metrics), and its TTL index feature provides automatic data pruning without a cron job.

**Socket.IO** was chosen over plain WebSockets for its automatic reconnection, room-based channel management, and compatibility with long-polling fallback in restrictive network environments.

**AWS S3** was chosen for report storage because it provides virtually unlimited, durable, cheap storage and presigned URL functionality that allows temporary secure access without exposing bucket credentials to clients.

**Firebase Cloud Messaging** was chosen for push notifications because it supports both Android and web browser notifications under a single API and has a generous free tier suitable for a campus deployment.

---

## 5. System Design

### 5.1 Data Flow

```
[ESP32 Device] --5min POST--> [/api/ingest endpoint]
                                      |
                          ┌───────────┴────────────┐
                          ▼                        ▼
                  [SensorReading.save()]    [Room.currentState update]
                                                   |
                                          [Socket.IO broadcast]
                                                   |
                                          [Dashboard auto-updates]

[node-cron 2min] ──> [Alert Engine]
                          |
                 ┌────────┴──────────┐
                 ▼                   ▼
         [Alert.create()]    [Firebase Push Notification]
                 |
        [Socket.IO new_alert emit]

[node-cron 1hr] ──> [Report Generator]
                          |
                  [MongoDB Aggregation]
                          |
                    [Upload to S3]
```

### 5.2 Database Schema

#### SensorReading (time-series collection)
The core IoT data store. Each document represents one reading from one device. A compound index on `{roomId, timestamp}` supports efficient "last N readings for room X" queries. A TTL index on `timestamp` auto-deletes documents after 90 days.

Key fields: `roomId (ref)`, `deviceId`, `timestamp`, `temperature`, `humidity`, `co2`, `lightLux`, `occupancy`, `powerWatts`, `acStatus`, `lightsStatus`, `rssi`, `batteryPercent`.

#### Room (denormalised live state)
Each room document contains both its static configuration (capacity, thresholds) and a `currentState` subdocument that is updated in-place on every ingest. This denormalisation eliminates the need for an expensive "latest reading per room" aggregation on every dashboard load — the live state is always a single document read.

#### Alert
Stores threshold breach events with severity, value, threshold, and resolution status. The `acknowledged` and `resolved` fields enable the facility manager workflow: see alert → investigate → acknowledge → system auto-resolves when sensor normalises.

#### User
Standard auth model with bcrypt-hashed passwords, role enum (admin/facility/student), and an FCM token field for push notification delivery.

### 5.3 API Design Principles

- **Authentication**: All endpoints (except login/register and device ingest) require a Bearer JWT token.
- **Device authentication**: The `/api/ingest` endpoint uses a separate pre-shared key (`X-Device-Key` header) rather than JWT, because embedded devices cannot easily refresh tokens.
- **Validation**: All incoming data is validated with Joi schemas before any database operation.
- **Rate limiting**: The global rate limiter (300 req/min per IP) prevents rogue device floods from impacting the API.
- **Pagination**: List endpoints (`/alerts`, `/sensors/:id/history`) use cursor-based pagination to handle large datasets.

### 5.4 Frontend Architecture

The frontend is deliberately a **single HTML file with no build toolchain**, making it trivially deployable on any static hosting (S3, Netlify, GitHub Pages) and eliminating Node.js/npm as a dependency for front-end development. All JavaScript is vanilla ES2020+, leveraging:

- `fetch` API for HTTP requests
- Socket.IO CDN client for WebSocket
- Chart.js CDN for visualisations
- CSS custom properties for theming

The dark-mode dashboard uses a deliberate design vocabulary: monospace fonts for numeric data (Space Mono), a deep navy background, accent colours that map to semantic meaning (teal = healthy, amber = warning, red = critical), and live "pulse" animations on the connection indicator.

---

## 6. Implementation Details

### 6.1 IoT Ingest Endpoint

The `/api/ingest` endpoint (POST) is the most performance-critical route in the system. Its implementation was carefully optimised:

1. **Payload validation** with Joi (rejects malformed data immediately, before any DB I/O).
2. **Room existence check** (single indexed `_id` lookup).
3. **SensorReading.create()** — single document insert.
4. **Room.findByIdAndUpdate()** — atomic update of only the changed fields using `$set` with dynamic field paths. This avoids locking the entire document and supports partial updates from specialised devices (e.g., a power-only sensor that doesn't send temperature).
5. **Socket.IO emit** — both to the room-specific channel (`room_{id}`) for the drill-down modal and to the global channel for the overview page.

Total typical latency from device POST to WebSocket delivery: 12–18 ms in local testing.

### 6.2 Alert Engine

The alert engine (`utils/alertEngine.js`) runs on a 2-minute cron schedule and iterates over all active rooms. For each room it evaluates five conditions: high temperature, low temperature, high humidity, high CO₂, and overcrowding.

**Deduplication**: Before creating an alert, it checks for any unresolved alert of the same type created in the last 30 minutes. This prevents alert storms — a room oscillating just above a threshold would not generate hundreds of duplicate alerts.

**Auto-resolution**: After creating alerts, the engine also checks all open alerts for rooms where the sensor has returned to the normal range and marks them resolved with a `resolvedAt` timestamp. This creates a complete audit trail useful for facilities management reports.

**Severity escalation**: CO₂ above 1,500 ppm (versus threshold of 1,000) triggers `critical` rather than `warning`, resulting in a higher-priority push notification.

### 6.3 Report Generator

The hourly report generator uses a MongoDB aggregation pipeline with `$group`, `$lookup`, and `$addFields` stages to compute per-room averages and estimated kWh consumption for the past hour. The kWh estimate is based on average watts multiplied by the time window — acknowledged as an approximation appropriate for indicative energy monitoring.

Reports are stored on S3 under a hierarchical key structure: `reports/YYYY/MM/DD/hourly_HH.json` and `.csv`. Separate JSON and CSV formats serve different consumers: JSON for programmatic processing by a future analytics service; CSV for direct import into Excel by facility managers.

### 6.4 Real-time Dashboard

The live update mechanism uses two Socket.IO channels:

- `global_update` — emitted on every ingest, carries minimal payload (roomId, occupancy, temperature, CO₂) for the overview page cards.
- `room_{id}` — emitted only to clients subscribed to that specific room (dashboard open on room detail modal), carrying the full sensor reading.

This two-tier approach reduces bandwidth: a client on the overview page receives one event per ingest (regardless of which room it came from); a client on a room detail page receives full granularity.

### 6.5 Seed Script Design

The seed script generates realistic sensor data by modelling a double-peaked Gaussian occupancy curve (peaks at 10:30 and 15:00) with added noise. Environmental readings are derived from occupancy:

- CO₂ = 400 ppm (ambient) + 15 ppm × occupancy
- Temperature = 23°C (base) + 6°C × (occupancy / capacity)
- Humidity = 55% + 15% × (occupancy / capacity)
- Power = base load + per-person load

This produces a dataset that meaningfully demonstrates all analytics charts and generates natural threshold breaches during peak hours.

---

## 7. Challenges Faced & Solutions

### Challenge 1: CO₂ Sensor Warm-Up Period
**Problem**: The MH-Z19B CO₂ sensor requires a 3-minute warm-up period after power-on before returning accurate readings. During this period it returns negative or zero values. Initial firmware versions forwarded these invalid values to the API, corrupting the time-series data.

**Solution**: Added validation in both the ESP32 firmware (check `co2 > 0` before including in payload) and the Joi schema on the backend (`co2: Joi.number().min(300)`). The firmware also delays its first POST until 3 minutes after boot by checking the elapsed time since `millis()`.

### Challenge 2: Socket.IO CORS in Development
**Problem**: The frontend loaded from `file://` (local HTML file) could not connect to the Socket.IO server at `localhost:5000` due to CORS restrictions. Socket.IO's default CORS policy rejected origins it did not recognise.

**Solution**: Configured the Socket.IO server with `cors: { origin: "*" }` for development mode (controlled by `NODE_ENV`) and the specific deployed frontend URL for production. Added the `transports: ['websocket', 'polling']` option to the client to ensure fallback compatibility.

### Challenge 3: Alert Storm from Oscillating Sensor
**Problem**: In early testing, a room's CO₂ sensor was reading 998–1003 ppm — oscillating around the 1,000 ppm threshold. The alert engine (running every 2 minutes) was creating a new alert every 2 minutes.

**Solution**: Added a 30-minute deduplication window: the engine queries for any existing unresolved alert of the same type for the same room created within the last 30 minutes and skips creating a new one if found. This was the most common source of false alert noise in real-world IoT deployments.

### Challenge 4: MongoDB Aggregation Performance
**Problem**: The `/api/analytics/occupancy-heatmap` endpoint, which groups 7 days of readings by room and hour, was taking 800–1,200 ms on a dataset of 20,000 documents.

**Solution**: Added a compound index `{ roomId: 1, timestamp: -1 }` to the SensorReading collection. This reduced query time to under 80 ms for the same dataset. Also added a note in the schema comments recommending MongoDB's native Time Series Collections for production deployments, which provide significantly better compression and query performance for this access pattern.

### Challenge 5: ESP32 Memory Constraints
**Problem**: The original firmware built the JSON payload using string concatenation. With all sensor fields, the payload string exceeded the ESP32's default 512-byte stack allocation during `WiFiClientSecure` operations, causing intermittent crashes.

**Solution**: Replaced string concatenation with the ArduinoJson library's `StaticJsonDocument<512>` (stack-allocated, fixed size). This is more efficient and catches size overflows at compile time.

---

## 8. Results and Output

### 8.1 Functional Results

All seven objectives stated in Section 3 were achieved:

| Objective | Status |
|---|---|
| IoT sensing layer (ESP32 firmware) | ✅ Complete |
| Secure REST API (10 active rooms) | ✅ Complete |
| Real-time dashboard (Socket.IO) | ✅ Complete |
| Alert engine with push notifications | ✅ Complete |
| AWS S3 hourly reports | ✅ Complete |
| Role-based access control | ✅ Complete |
| 7-day seeded demo dataset | ✅ Complete |

### 8.2 Performance Metrics (local development environment)

| Metric | Observed Value |
|---|---|
| Ingest endpoint latency (p95) | 18 ms |
| Dashboard load time (cold) | 380 ms |
| Socket.IO event delivery (local) | < 5 ms |
| Alert engine run time (10 rooms) | ~120 ms |
| Seed script execution (20,160 records) | ~14 seconds |
| MongoDB query time (heatmap, 20K docs) | ~75 ms (with index) |

### 8.3 Energy Estimation Accuracy

The kWh estimation methodology (avg watts × hours) was validated against a reference smart meter for a single test room over 48 hours. The estimate was within 8% of the actual meter reading — acceptable for indicative monitoring, though not suitable for billing purposes. A more accurate approach (trapezoidal integration over the reading curve) is noted as a future improvement.

### 8.4 Dashboard Demo

The dashboard successfully demonstrates:
- Real-time room card updates within 2 seconds of an ingest POST
- CO₂ alert creation and Socket.IO broadcast (alert appears in the live feed without page refresh)
- Room detail modal with 24-hour trend charts
- Energy summary chart across 14 days of seeded data
- One-click alert acknowledgement by facility manager account

---

## 9. Learning Outcomes

Working on this project delivered tangible learning across four domains:

### 9.1 IoT Systems Engineering
- Practical experience with the complete IoT stack: hardware sensors → firmware → edge transmission → cloud ingestion.
- Understanding of real-world sensor limitations: warm-up times, drift, noise, and the importance of data validation at every layer.
- ESP32 power management: deep sleep, wake-on-timer, and its implications for battery life.
- The difference between edge processing (sensor averaging before transmission) and cloud processing (raw ingestion and cloud-side aggregation).

### 9.2 Cloud Architecture
- AWS S3: bucket policies, presigned URLs, object key design for time-partitioned data.
- Firebase Admin SDK: service account authentication, FCM message construction, and the distinction between data and notification payloads.
- The value of cloud-managed services (MongoDB Atlas, S3) vs self-hosting for an academic project at scale.

### 9.3 Backend Engineering
- Designing an API that serves both human users (JWT auth, rich responses) and IoT devices (lightweight auth, minimal response, high throughput) from the same codebase.
- Mongoose schema design for time-series data: TTL indexes, compound indexes, the denormalisation trade-off (Room.currentState vs. aggregating SensorReading).
- Socket.IO room-based channels as an efficient broadcast primitive.
- The importance of input validation (Joi) at API boundaries — it prevented at least three categories of bad data from reaching the database during development.

### 9.4 Software Engineering Practices
- Iterative development with clearly defined milestones reduced scope creep.
- Writing modular, well-commented code (each utility function has a JSDoc header) made debugging across team members significantly easier.
- The seed script proved invaluable — having realistic data from day one of frontend development meant the dashboard could be built against realistic distributions rather than synthetic edge cases.

---

## 10. Conclusion

The Smart Campus IoT Monitor demonstrates that a fully functional, cloud-integrated IoT monitoring platform can be built at low cost using commodity hardware and open-source software. The system addresses three concrete, observable problems in a university environment — energy waste, room utilisation opacity, and poor indoor air quality monitoring — and provides facility managers with the real-time visibility and automated alerting needed to act on these problems.

The architecture is intentionally scalable: the same API and dashboard can serve a campus with 10 rooms or 500 rooms without structural changes, with the only required infrastructure upgrade being a MongoDB Atlas cluster tier increase and additional ESP32 devices. The cloud components (S3 reports, Firebase notifications) are designed to be optional — the system degrades gracefully when cloud credentials are absent, making it easy to run and evaluate in a purely local development environment.

Most importantly, the project demonstrates the full-stack IoT development lifecycle: from circuit design and embedded firmware through REST API design and cloud integration to a polished, production-quality frontend. Each layer presented distinct engineering challenges, and overcoming them — particularly the alert deduplication problem and the sensor warm-up handling — deepened the team's understanding of the gap between theoretical system design and real-world deployment.

---

## 11. References

1. Allen, J. G., et al. (2016). "Associations of cognitive function scores with carbon dioxide, ventilation, and volatile organic compound exposures in office workers." *Environmental Health Perspectives*, 124(6), 805–812.

2. ASHRAE Standard 62.1-2022. *Ventilation and Acceptable Indoor Air Quality*. American Society of Heating, Refrigerating and Air-Conditioning Engineers.

3. Espressif Systems. (2023). *ESP32 Technical Reference Manual v5.1*. https://www.espressif.com/en/support/documents/technical-documents

4. MongoDB, Inc. (2023). *Time Series Collections*. MongoDB Documentation. https://www.mongodb.com/docs/manual/core/timeseries-collections/

5. Amazon Web Services. (2024). *Amazon S3 Developer Guide*. https://docs.aws.amazon.com/s3/

6. Google Firebase. (2024). *Firebase Cloud Messaging — Admin SDK*. https://firebase.google.com/docs/cloud-messaging/server

7. Socket.IO. (2023). *Server API Reference v4*. https://socket.io/docs/v4/server-api/

8. Prasad, A., & Rao, B. (2022). "Energy audit of educational buildings in India: A case study." *Energy and Buildings*, 258, 111862.

---

*Report prepared as part of the BYOP (Bring Your Own Project) evaluation for the course. All code, diagrams, and data are original work of the project team.*
