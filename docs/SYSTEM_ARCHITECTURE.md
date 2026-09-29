# System Architecture

This document describes the end-to-end architecture, communication topology, data flow, and processing pipeline for the **AI-Enabled Real-Time Mine Subsidence Monitoring and Early Warning System**.

---

## 1. High-Level Architecture Diagram

```
+--------------------------+          +--------------------------+
|  Node 1: Baseline ESP32  |          | Node 2: Deformation ESP32|
|  - MPU6050 (Tilt)        |          | - MPU6050 (Tilt)         |
|  - SW-420 (Vibration)    |          | - HC-SR04 (Displacement) |
|                          |          | - SW-420 (Vibration)     |
+------------+-------------+          +------------+-------------+
             |                                     |
             | ESP-NOW (Channel 1, 2.4 GHz)       | ESP-NOW (Channel 1, 2.4 GHz)
             | Peer-to-Peer Packed Frames         | Peer-to-Peer Packed Frames
             +------------------+------------------+
                                |
                                v
                +-------------------------------+
                | ESP32-S3 Gateway / Hub        |
                | - FreeRTOS Queue Management   |
                | - SSD1306 OLED Display (I2C)  |
                | - JSON Serialization Engine   |
                +---------------+---------------+
                                |
                                | Wi-Fi (HTTP POST /api/readings)
                                v
                +-------------------------------+
                | FastAPI Backend Server        |
                | - SQLite / SQLAlchemy Store   |
                | - Baseline Averaging Engine   |
                +---------------+---------------+
                                |
                                v
                +-------------------------------+
                | Risk & Anomaly Engine         |
                | - Crack Trigger (CRITICAL)    |
                | - Displacement Rate Evaluation|
                | - Baseline Delta Comparisons  |
                | - Multi-Window Vibration Check|
                +---------------+---------------+
                                |
                                v
                +-------------------------------+
                | React + Vite Dashboard        |
                | - Real-time Status Indicators |
                | - Telemetry Charts (Recharts) |
                | - Early Warning Alert Logs    |
                +-------------------------------+
```

---

## 2. Network Topology & Communication Protocols

### Wireless Sensor Network (WSN) Topology
* **Topology**: Star Topology (Gateway-centric).
* **Sensor Nodes to Gateway**: **ESP-NOW** protocol.
  * Connectionless, low-overhead peer-to-peer RF protocol operating on 2.4 GHz ISM band.
  * Direct MAC-addressed transmission eliminating Wi-Fi AP association latency and handshake overhead.
  * Fast packet transmission cycle (~1 ms on-air time), reducing current draw on field sensor nodes.
* **Gateway to Backend**: **Wi-Fi + HTTP REST (JSON)**.
  * The ESP32-S3 acts as an edge protocol converter and telemetry bridge.
  * Automatically serializes raw binary structs into standardized JSON payloads and dispatches them via HTTP POST to the backend.

---

## 3. Layer Breakdown

### Layer 1: Physical Sensing Layer
* **Baseline Sensing (Node 1)**: Captures steady-state reference measurements from unaffected ground strata.
* **Deformation Sensing (Node 2)**: Captures active surface subsidence metrics including:
  * **Dual-axis Tilt** ($\theta_x, \theta_y$) calculated from gravitational acceleration vectors.
  * **Surface Displacement** measured via ultrasonic time-of-flight.
  * **Vibrational Shocks** detected via spring-mass switch contacts.
  * **Structural Cracks** detected via physical fissure state inputs.

### Layer 2: Edge Gateway & Display Layer
* **ESP32-S3 Gateway**:
  * Utilizes FreeRTOS queues (`xQueueSend` / `xQueueReceive`) to handle high-frequency incoming packets asynchronously without dropping frames.
  * Local 128x64 OLED display updates every 500 ms with instantaneous health state, node connectivity, and sensor values.
  * Implements automatic Wi-Fi reconnection routines.

### Layer 3: Backend & Data Persistence Layer
* **FastAPI Service**:
  * High-performance asynchronous Python REST API.
  * Provides endpoints for telemetry ingestion, historical query retrieval, baseline calibration, and node status polling.
* **SQLite / SQLAlchemy ORM**:
  * Persists time-series sensor telemetry and baseline snapshots.

### Layer 4: Analytics & Risk Evaluation Engine
The backend evaluates incoming readings using a hierarchical multi-stage rule engine:

```
[ New Reading Ingestion ]
           |
           v
   Is crack_state == True?  ----YES----> [ Status: CRITICAL ] (Immediate Fissure Breach)
           |
           NO
           v
   Displacement Rate > 0.5 cm/interval? -YES-> [ Status: CRITICAL ] (Rapid Ground Settlement)
           |
           NO
           v
   - Displacement Delta from Baseline > 0.2 cm?
   - Tilt Delta from Baseline > 1.0°?             ---YES---> [ Status: WARNING ]
   - Vibration in >= 2 of last 5 readings?
           |
           NO
           v
   [ Status: NORMAL ]
```

* **Heartbeat Watchdog**: If a node fails to send data for longer than 6 seconds, its state is marked as `OFFLINE`.

### Layer 5: Frontend Visualization & Early Warning
* **React 19 + Vite Dashboard**:
  * Interactive node cards displaying online/offline state, real-time risk badges, and sensor metrics.
  * Historical time-series trend graphs (Tilt X, Tilt Y, Distance, Displacement).
  * Filterable alert log table recording state escalations.
  * One-click baseline calibration trigger.
