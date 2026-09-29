# AI-Enabled Real-Time Mine Subsidence Monitoring and Early Warning System

An end-to-end IoT and edge-computing prototype designed for real-time detection, analysis, and early warning of ground subsidence, strata movement, and surface deformation in mining zones.

---

## 1. Problem Overview

Underground and open-cast mining operations induce continuous subsurface stress redistribution. As voids are created, overlying rock strata shift, resulting in surface subsidence, fissure propagation, structural tilting, and ground instability. Undetected subsidence poses significant hazards to mine personnel, surrounding civil infrastructure, and operational safety.

Traditional subsidence monitoring methods often rely on periodic manual leveling surveys or expensive satellite interferometry (InSAR) with slow revisit intervals. This project provides a continuous, low-latency, real-time wireless sensor network (WSN) that captures high-frequency physical deformation metrics and flags risk levels before catastrophic failure occurs.

---

## 2. System Overview & Key Features

The prototype employs a modular, three-tier architecture:
1. **Field Sensor Nodes (ESP32)**: Distributed sensing units deployed across baseline and active deformation zones.
2. **Central Gateway / Control Hub (ESP32-S3)**: An edge receiver that collects sensor packets over ESP-NOW, renders live status on an I2C OLED display, and bridges telemetry to the cloud/local server over Wi-Fi.
3. **Analytics Backend & Web Dashboard (FastAPI + React)**: A centralized server that processes telemetry streams, evaluates dynamic risk thresholds against established baselines, and visualizes real-time status and historical trends.

```
+-------------------------------------------------------------------+
|                        PHYSICAL SENSING                           |
|                                                                   |
|   +--------------------------+     +--------------------------+   |
|   |  Node 1: Baseline ESP32  |     | Node 2: Deformation ESP32|   |
|   |  - MPU6050 (Tilt)        |     | - MPU6050 (Tilt)         |   |
|   |  - SW-420 (Vibration)    |     | - HC-SR04 (Displacement) |   |
|   |                          |     | - SW-420 (Vibration)     |   |
|   +------------+-------------+     +------------+-------------+   |
+----------------|--------------------------------|-----------------+
                 |                                |
                 | ESP-NOW (2.4 GHz Star WSN)     | ESP-NOW
                 +----------------+---------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     EDGE GATEWAY & CONTROL HUB                    |
|                                                                   |
|                 +-------------------------------+                 |
|                 |     ESP32-S3 Gateway Hub      |                 |
|                 |     - FreeRTOS Task Queue     |                 |
|                 |     - 128x64 I2C OLED Display |                 |
|                 |     - HTTP REST Bridge        |                 |
|                 +---------------+---------------+                 |
+---------------------------------|---------------------------------+
                                  |
                                  | Wi-Fi (HTTP POST /api/readings)
                                  v
+-------------------------------------------------------------------+
|                  BACKEND & RISK ANALYTICS ENGINE                  |
|                                                                   |
|                 +-------------------------------+                 |
|                 |   FastAPI Application Server  |                 |
|                 |   - SQLite Data Persistence   |                 |
|                 |   - Baseline Delta Tracker    |                 |
|                 |   - Multi-Tier Risk Engine    |                 |
|                 +---------------+---------------+                 |
+---------------------------------|---------------------------------+
                                  |
                                  | REST API Polling
                                  v
+-------------------------------------------------------------------+
|                     WEB MONITORING DASHBOARD                      |
|                                                                   |
|                 +-------------------------------+                 |
|                 |     React 19 + Vite App       |                 |
|                 |     - Live Node Health Badges |                 |
|                 |     - Time-Series Graphs      |                 |
|                 |     - Incident Alert Log      |                 |
|                 +-------------------------------+                 |
+-------------------------------------------------------------------+
```

---

## 3. Hardware Architecture

### Node 1 — Baseline / Reference Node (ESP32)
* **Microcontroller**: ESP32 Dev Module (WROOM-32)
* **Sensors**:
  * **MPU-6050**: 3-axis accelerometer and gyroscope measuring pitch and roll tilt angles (`SDA -> GPIO 21`, `SCL -> GPIO 22`).
  * **SW-420**: High-sensitivity digital vibration sensor (`DO -> GPIO 27`).
* **Purpose**: Anchored on undisturbed reference strata outside the active zone to differentiate background seismic/mining vibrations from true subsidence deformation.

### Node 2 — Active Deformation Node (ESP32)
* **Microcontroller**: ESP32 Dev Module (WROOM-32)
* **Sensors & Interfaces**:
  * **MPU-6050**: Measures localized surface tilt and angle shifts (`SDA -> GPIO 21`, `SCL -> GPIO 22`).
  * **SW-420**: Detects sudden ground shocks and rock movement (`DO -> GPIO 27`).
  * **HC-SR04**: Ultrasonic sensor measuring vertical ground displacement / settlement distance (`TRIG -> GPIO 5`, `ECHO -> GPIO 18`).
  * **Crack Sensor**: Detects joint separation and fissure widening (`crack_state`).
  * **Strain Gauge Interface**: Connects through an HX711 24-bit differential ADC module to quantify mechanical stress.
* **Purpose**: Deployed directly over vulnerable surface strata to continuously track displacement and structural shifts.

### Central Gateway Hub (ESP32-S3)
* **Microcontroller**: ESP32-S3 DevKitC-1
* **Components**:
  * **0.96" Monochrome I2C OLED (SSD1306)**: Displays live node statuses, link health, and alarm flags (`SDA -> GPIO 8`, `SCL -> GPIO 9`).
  * **HW-504 Joystick & Inputs**: Hardware navigation controls.
* **Communication**: Receives ESP-NOW packets from nodes, decodes telemetry frames, updates the local display, and dispatches JSON payloads to the FastAPI backend over Wi-Fi.

> [!TIP]
> For complete schematic wiring tables, resistor divider diagrams, and pin allocations, refer to [`docs/HARDWARE_CONNECTIONS.md`](file:///e:/PROJECTS/AGENTS_PROJECT/COLE%20MINE%20PROJECT/Software/docs/HARDWARE_CONNECTIONS.md).

---

## 4. Software Architecture & Risk Engine

### Backend Service (FastAPI)
The backend (`app/`) manages data persistence and evaluates node telemetry in real-time.

* **Database**: SQLite (`readings.db`) managed via SQLAlchemy ORM.
* **Risk Engine (`app/risk_engine.py`)**:
  * **CRITICAL**:
    1. Immediate trigger if `crack_state == True` on the latest reading.
    2. Rate of vertical displacement change exceeds `0.5 cm` per reading interval.
  * **WARNING**:
    1. Total ground displacement deviates by `> 0.2 cm` from established baseline.
    2. Ground tilt angle deviates by `> 1.0°` from baseline.
    3. Vibration detected on 2 or more of the previous 5 consecutive readings.
  * **OFFLINE Watchdog**: Marks a node `OFFLINE` if no packet is received for longer than `6.0 seconds`.
  * **NORMAL**: All sensor readings within nominal thresholds.

### Frontend Dashboard (React + Vite)
Located in `dashboard/`, built with React 19, Lucide icons, and Recharts:
* **Node Cards**: Live indicators of connection state, current tilt, distance, vibration, and risk category.
* **Telemetry Charts**: Interactive time-series visualizers for tilt angles and displacement.
* **Alert Feed**: Chronological log of abnormal events and risk escalation states.
* **Baseline Calibration**: Single-click trigger to average the last 5 readings and update reference baselines across all nodes.

---

## 5. Repository Structure

```
Software/
├── README.md                   # Project overview and documentation index
├── requirements.txt            # Python dependencies
├── .gitignore                  # Git exclusion rules
│
├── firmware/                   # Microcontroller source code
│   ├── node1/
│   │   └── node1.ino           # ESP32 Node 1 (Baseline Node) firmware
│   ├── node2/
│   │   └── node2.ino           # ESP32 Node 2 (Deformation Node) firmware
│   └── gateway/
│       └── gateway_esp32_s3.ino # ESP32-S3 Gateway & Display Hub firmware
│
├── app/                        # FastAPI backend source code
│   ├── main.py                 # REST API routes and application lifecycle
│   ├── database.py             # SQLAlchemy models and database session
│   ├── schemas.py              # Pydantic data schemas
│   └── risk_engine.py          # Risk evaluation and threshold analytics
│
├── dashboard/                  # React 19 + Vite web frontend
│   ├── package.json
│   ├── vite.config.js
│   └── src/                    # Components, pages, API connectors, and styles
│
├── scripts/
│   └── mock_sender.py          # Telemetry stream and escalation simulator
│
├── docs/                       # In-depth technical documentation
│   ├── HARDWARE_CONNECTIONS.md # Comprehensive pinout and wiring tables
│   ├── SYSTEM_ARCHITECTURE.md  # WSN network topology and system diagrams
│   ├── SOFTWARE_SETUP.md       # Installation, configuration, and flashing guide
│   └── TESTING.md              # Test scripts and verification procedures
│
├── test_api.py                 # API and baseline functionality test
├── test_scenario.py            # Multi-node sequential stream test
├── test_scenario2.py           # Stepped displacement verification test
└── test_status.py              # Watchdog and node heartbeat test
```

---

## 6. Quick Start Guide

### 1. Start Backend Server
```bash
# In the Software root folder:
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start Web Dashboard
```bash
# In a new terminal:
cd dashboard
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Simulate Sensor Data (Optional)
To test the software stack without physical hardware:
```bash
# Normal sensor stream:
python scripts/mock_sender.py

# Escalation demonstration (NORMAL -> WARNING -> CRITICAL):
python scripts/mock_sender.py --simulate-escalation
```

> [!NOTE]
> For comprehensive compilation, flashing, and configuration details, read [`docs/SOFTWARE_SETUP.md`](file:///e:/PROJECTS/AGENTS_PROJECT\COLE%20MINE%20PROJECT/Software/docs/SOFTWARE_SETUP.md).

---

## 7. Testing & Verification

Run the validation suite against the active backend server:
```bash
python test_api.py
python test_scenario.py
python test_scenario2.py
python test_status.py
```
For detailed descriptions of each test case and output criteria, see [`docs/TESTING.md`](file:///e:/PROJECTS/AGENTS_PROJECT/COLE%20MINE%20PROJECT/Software/docs/TESTING.md).

---

## 8. Current Limitations & Future Improvements

### Current Limitations
* **Radio Range**: ESP-NOW operating on 2.4 GHz requires near line-of-sight in rugged surface environments.
* **Power Management**: Firmware currently runs continuous loop sampling; field deployment will require deep-sleep duty cycles.
* **Single Gateway Topology**: Star topology limits coverage radius to direct range of the ESP32-S3 gateway.

### Planned Improvements
* **LoRa Integration**: Adding SX1276 / SX1262 LoRa transceivers for long-range (1–5 km) communication across open-cast pits.
* **Multi-hop Mesh Routing**: Enabling dynamic routing between sensor nodes to bypass topographical obstructions.
* **Predictive AI Modeling**: Integrating LSTM / time-series regression models on the backend for multi-hour subsidence forecasting.
* **Solar Harvesting**: Implementing solar-backed lithium iron phosphate ($LiFePO_4$) power units with power telemetry.
