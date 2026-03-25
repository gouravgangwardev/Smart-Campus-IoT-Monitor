/**
 * Smart Campus IoT Edge Device Firmware
 * Target: ESP32 (DevKit v1 or similar)
 *
 * Hardware:
 *   - DHT22      → GPIO 4   (Temperature + Humidity)
 *   - MH-Z19B    → UART2 (GPIO 16 RX, 17 TX) (CO₂)
 *   - BH1750     → I²C SDA GPIO 21, SCL GPIO 22 (Light)
 *   - PIR HC-SR501 → GPIO 13 (Presence detection)
 *   - PZEM-004T  → UART1 (GPIO 18 RX, 19 TX) (Power)
 *
 * Flow every 5 minutes:
 *   Read all sensors → POST JSON to /api/ingest → deep sleep 5 min
 *
 * Dependencies (Arduino Library Manager):
 *   - DHT sensor library by Adafruit
 *   - MH-Z19 by Jonathan Dempsey
 *   - BH1750 by Christopher Laws
 *   - ArduinoJson by Benoit Blanchon
 *   - WiFi (built-in ESP32)
 *   - HTTPClient (built-in ESP32)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <MHZ19.h>
#include <BH1750.h>
#include <Wire.h>

// ─── Configuration ────────────────────────────────────────────────────────────
const char* WIFI_SSID       = "CampusNet";
const char* WIFI_PASS       = "wifi_password_here";
const char* SERVER_URL      = "https://api.smartcampus.edu/api/ingest";
const char* DEVICE_KEY      = "your_device_ingest_key";
const char* ROOM_ID         = "64abc123def456789012345a"; // MongoDB ObjectId of this room
const char* DEVICE_ID       = "ESP32-CSLAB101-01";

// Deep sleep interval (300 seconds = 5 minutes)
#define SLEEP_SECONDS       300
// How many PIR samples to take per reading cycle
#define PIR_SAMPLE_COUNT    10
#define PIR_SAMPLE_DELAY_MS 200

// ─── Pin Definitions ─────────────────────────────────────────────────────────
#define DHT_PIN     4
#define DHT_TYPE    DHT22
#define PIR_PIN     13
#define MHZ_RX      16
#define MHZ_TX      17

// ─── Objects ──────────────────────────────────────────────────────────────────
DHT    dht(DHT_PIN, DHT_TYPE);
MHZ19  mhz19;
BH1750 lightMeter;
HardwareSerial co2Serial(2);  // UART2 for MH-Z19B

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n[Boot] Smart Campus IoT Device starting...");

  // Sensor init
  dht.begin();
  Wire.begin();                // I²C for BH1750
  lightMeter.begin();
  co2Serial.begin(9600, SERIAL_8N1, MHZ_RX, MHZ_TX);
  mhz19.begin(co2Serial);
  mhz19.autoCalibration(false); // Disable auto-calibration in indoor use

  pinMode(PIR_PIN, INPUT);

  // Connect to WiFi
  connectWiFi();

  // Read all sensors
  SensorData data = readAllSensors();

  // Print for debug
  Serial.printf("[Data] Temp: %.1f°C  Humidity: %.1f%%  CO2: %d ppm\n",
                data.temperature, data.humidity, data.co2);
  Serial.printf("[Data] Light: %.0f lux  Occupancy: %d  Power: %.0f W\n",
                data.lightLux, data.occupancy, data.powerWatts);

  // POST to server
  bool success = postReading(data);
  Serial.printf("[HTTP] Post %s\n", success ? "SUCCESS" : "FAILED");

  // Deep sleep to save power
  Serial.printf("[Sleep] Going to sleep for %d seconds...\n", SLEEP_SECONDS);
  WiFi.disconnect(true);
  esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_SECONDS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Not used — device uses deep sleep cycle
}

// ─── Sensor Reading ───────────────────────────────────────────────────────────
struct SensorData {
  float temperature;
  float humidity;
  int   co2;
  float lightLux;
  int   occupancy;  // 0 or 1 (presence) — upgrade with people-counter for count
  float powerWatts;
  int   rssi;
  int   batteryPercent;
};

SensorData readAllSensors() {
  SensorData d;

  // DHT22 — retry up to 3 times (DHT can occasionally return NaN)
  for (int i = 0; i < 3; i++) {
    d.temperature = dht.readTemperature();
    d.humidity    = dht.readHumidity();
    if (!isnan(d.temperature) && !isnan(d.humidity)) break;
    delay(500);
  }
  if (isnan(d.temperature)) d.temperature = -99; // error sentinel
  if (isnan(d.humidity))    d.humidity    = -99;

  // MH-Z19B CO₂
  d.co2 = mhz19.getCO2();
  if (d.co2 <= 0) d.co2 = -1; // sensor warming up or error

  // BH1750 Light
  d.lightLux = lightMeter.readLightLevel();
  if (d.lightLux < 0) d.lightLux = 0;

  // PIR — take multiple samples, count HIGH readings as presence score
  int pirCount = 0;
  for (int i = 0; i < PIR_SAMPLE_COUNT; i++) {
    if (digitalRead(PIR_PIN) == HIGH) pirCount++;
    delay(PIR_SAMPLE_DELAY_MS);
  }
  // Presence: 1 if more than half samples detected motion, 0 otherwise
  // Note: for a full people-count, integrate a TOF sensor or camera module
  d.occupancy = (pirCount > PIR_SAMPLE_COUNT / 2) ? 1 : 0;

  // PZEM-004T Power — read over UART1 (simplified; use PZEM library in practice)
  // For now, return 0 if module not connected
  d.powerWatts = 0.0;  // Replace with: pzem.power()

  // WiFi signal quality
  d.rssi = WiFi.RSSI();

  // Battery (if using LiPo + voltage divider on ADC pin 34)
  // int raw = analogRead(34);
  // float voltage = raw * (3.3 / 4095.0) * 2.0; // voltage divider factor
  // d.batteryPercent = map(constrain((int)(voltage * 100), 310, 420), 310, 420, 0, 100);
  d.batteryPercent = 85; // Placeholder if on mains power

  return d;
}

// ─── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FAILED — proceeding without network.");
  }
}

// ─── HTTP POST ────────────────────────────────────────────────────────────────
bool postReading(const SensorData& d) {
  if (WiFi.status() != WL_CONNECTED) return false;

  // Build JSON payload using ArduinoJson
  StaticJsonDocument<512> doc;
  doc["roomId"]          = ROOM_ID;
  doc["deviceId"]        = DEVICE_ID;
  doc["temperature"]     = round(d.temperature * 10) / 10.0;
  doc["humidity"]        = round(d.humidity * 10) / 10.0;
  if (d.co2 > 0)   doc["co2"]          = d.co2;
  doc["lightLux"]        = round(d.lightLux);
  doc["occupancy"]       = d.occupancy;
  if (d.powerWatts > 0) doc["powerWatts"] = round(d.powerWatts * 10) / 10.0;
  doc["rssi"]            = d.rssi;
  doc["batteryPercent"]  = d.batteryPercent;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(10000); // 10s timeout

  int httpCode = http.POST(payload);
  http.end();

  return (httpCode == 201 || httpCode == 200);
}
