# Software Setup & Deployment Guide

This guide provides step-by-step instructions for setting up the development environment, flashing ESP32 microcontrollers, running the FastAPI backend, and launching the frontend dashboard.

---

## 1. Prerequisites & Tooling

* **Python**: Python 3.10 or higher
* **Node.js**: Node.js 18.x or 20.x with `npm`
* **Arduino IDE**: Arduino IDE 2.x with the official **ESP32 by Espressif Systems** board package installed.
* **Git**: Installed and configured.

---

## 2. Firmware Setup & Flashing (Arduino IDE)

### 2.1 Install Board Package
1. Open **Arduino IDE**.
2. Go to **File -> Preferences**.
3. In *Additional boards manager URLs*, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Open **Tools -> Board -> Boards Manager**, search for `esp32` by **Espressif Systems**, and install the latest stable version.

### 2.2 Install Required Libraries
Open **Tools -> Manage Libraries...** in Arduino IDE and install:
* `Adafruit MPU6050`
* `Adafruit Unified Sensor`
* `Adafruit SSD1306`
* `Adafruit GFX Library`

*(Built-in libraries `WiFi`, `esp_now`, `esp_wifi`, `HTTPClient`, and `Wire` are included with the ESP32 board package).*

### 2.3 Compiling & Flashing Nodes

#### Step A: Determine Gateway MAC Address
Before compiling Node 1 and Node 2, retrieve the Wi-Fi MAC address of your ESP32-S3 Gateway:
1. Flash a blank sketch or the gateway sketch onto your ESP32-S3.
2. Open Serial Monitor (115200 baud) to view the printed MAC address.
3. Update `gatewayMAC` array in `firmware/node1/node1.ino` and `firmware/node2/node2.ino`:
   ```cpp
   uint8_t gatewayMAC[] = { 0xAC, 0xA7, 0x04, 0x2B, 0xA7, 0xFC };
   ```

#### Step B: Flash Node 1 (Baseline Node)
1. Open `firmware/node1/node1.ino` in Arduino IDE.
2. Select Board: **ESP32 Dev Module**.
3. Select your serial COM port.
4. Click **Upload**.

#### Step C: Flash Node 2 (Deformation Node)
1. Open `firmware/node2/node2.ino` in Arduino IDE.
2. Select Board: **ESP32 Dev Module**.
3. Select your serial COM port.
4. Click **Upload**.

#### Step D: Flash Central Gateway (ESP32-S3)
1. Open `firmware/gateway/gateway_esp32_s3.ino`.
2. Update the network credentials and backend server IP:
   ```cpp
   const char* WIFI_SSID = "Your_WiFi_Network";
   const char* WIFI_PASS = "Your_WiFi_Password";
   IPAddress backendIP(192, 168, 1, 100); // IP of the computer running backend
   ```
3. Select Board: **ESP32S3 Dev Module** (or `ESP32-S3 DevKitC-1`).
4. Set USB CDC On Boot: **Enabled** (if using native USB).
5. Click **Upload**.

---

## 3. Backend Setup (FastAPI)

### 3.1 Create and Activate Virtual Environment

**On Windows (PowerShell):**
```powershell
# Navigate to Software directory
cd "E:\PROJECTS\AGENTS_PROJECT\COLE MINE PROJECT\Software"

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

**On Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3.2 Install Dependencies
```bash
pip install -r requirements.txt
```

### 3.3 Start the FastAPI Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

* Backend API will be available at: `http://localhost:8000`
* Interactive Swagger API Documentation: `http://localhost:8000/docs`

---

## 4. Frontend Setup (React Dashboard)

### 4.1 Install Node Dependencies
```bash
cd dashboard
npm install
```

### 4.2 Start Vite Development Server
```bash
npm run dev
```

* Web Dashboard will open at: `http://localhost:5173`

---

## 5. Simulating Telemetry (Without Hardware)

If physical ESP32 hardware is not connected, use the included mock telemetry script to stream synthetic sensor data to the backend:

```bash
# In the Software/ directory with virtualenv active:

# Normal telemetry simulation (20 sends)
python scripts/mock_sender.py

# Subsidence escalation simulation (simulates NORMAL -> WARNING -> CRITICAL)
python scripts/mock_sender.py --simulate-escalation
```
