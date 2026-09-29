# Hardware Connections & Pinout Guide

This document outlines the exact hardware wiring, pin assignments, power considerations, and sensor interfaces used across the **Mine Subsidence Monitoring and Early Warning System**.

> [!NOTE]
> All GPIO numbers listed below correspond directly to the definitions in the firmware files located in the `firmware/` directory.

---

## 1. System Overview & Node Roles

```
  +---------------------------+       +---------------------------+
  |  NODE 1: Baseline Node    |       |  NODE 2: Deformation Node |
  |  - ESP32                  |       |  - ESP32                  |
  |  - MPU6050 + SW-420       |       |  - MPU6050 + SW-420       |
  |                           |       |  - HC-SR04 + Sensors      |
  +-------------+-------------+       +-------------+-------------+
                |                                   |
                | ESP-NOW                           | ESP-NOW
                | (2.4 GHz)                         | (2.4 GHz)
                +-----------------+-----------------+
                                  |
                                  v
                    +---------------------------+
                    | ESP32-S3 Gateway Hub      |
                    | - 0.96" I2C OLED          |
                    | - Joystick & Indicators   |
                    +-------------+-------------+
                                  |
                                  | Wi-Fi (HTTP REST)
                                  v
                    +---------------------------+
                    | FastAPI Backend & Web UI  |
                    +---------------------------+
```

---

## 2. Node 1 — Baseline / Reference Sensor Node

### Microcontroller
* **Board**: ESP32 Dev Module (WROOM-32)
* **Role**: Placed on stable, undisturbed strata outside the active subsidence zone to provide reference tilt and baseline seismic/vibrational data.

### Pinout & Wiring Table

| Component | Pin / Terminal | ESP32 Connection | Voltage Level | Notes / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **MPU-6050** | VCC | `3.3V` / `VIN (5V)` | 3.3V / 5V | Accelerometer + Gyroscope (Tilt Sensing) |
| | GND | `GND` | Ground | Common Ground |
| | SDA | `GPIO 21` | 3.3V I2C | I2C Data line (`#define MPU_SDA 21`) |
| | SCL | `GPIO 22` | 3.3V I2C | I2C Clock line (`#define MPU_SCL 22`) |
| **SW-420** | VCC | `3.3V` / `5V` | 3.3V / 5V | Digital Vibration Sensor Module |
| | GND | `GND` | Ground | Common Ground |
| | DO (Digital Out) | `GPIO 27` | 3.3V Logic | Active LOW interrupt pin (`#define SW420_PIN 27`) |

---

## 3. Node 2 — Deformation / Active Sensor Node

### Microcontroller
* **Board**: ESP32 Dev Module (WROOM-32)
* **Role**: Positioned in the active subsidence monitoring zone to measure ground settlement, surface tilt, fissure/crack widening, and structural vibrations.

### Pinout & Wiring Table

| Component | Pin / Terminal | ESP32 Connection | Voltage Level | Notes / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **MPU-6050** | VCC | `3.3V` / `VIN (5V)` | 3.3V / 5V | Accelerometer + Gyroscope (Pitch & Roll tilt) |
| | GND | `GND` | Ground | Common Ground |
| | SDA | `GPIO 21` | 3.3V I2C | I2C Data line (`#define MPU_SDA 21`) |
| | SCL | `GPIO 22` | 3.3V I2C | I2C Clock line (`#define MPU_SCL 22`) |
| **SW-420** | VCC | `3.3V` / `5V` | 3.3V / 5V | Vibration Detection Module |
| | GND | `GND` | Ground | Common Ground |
| | DO (Digital Out) | `GPIO 27` | 3.3V Logic | Active LOW signal (`#define SW420_PIN 27`) |
| **HC-SR04** | VCC | `5V` (`VIN`) | 5V | Ultrasonic Distance Sensor (Ground displacement) |
| | GND | `GND` | Ground | Common Ground |
| | TRIG | `GPIO 5` | 3.3V Output | 10 µs trigger pulse (`#define TRIG_PIN 5`) |
| | ECHO | `GPIO 18` | 3.3V Input (via divider) | Echo pulse width measurement (`#define ECHO_PIN 18`) |
| **SG90 Servo** | VCC (Red) | `5V` (External Power) | 5V | Physical warning flag / shutter actuation |
| | GND (Brown) | `GND` | Ground | Common ground with ESP32 |
| | PWM (Orange) | *GPIO: Not finalized* | 3.3V PWM | PWM control signal |
| **Crack Sensor** | VCC / Signal | *GPIO: Not finalized* | 3.3V / 5V | Fissure / joint displacement contact sensor |
| | GND | `GND` | Ground | Common Ground |
| **HX711 + Strain**| E+, E-, A+, A- | To Strain Gauge Bridge | Analog | Strain gauge bridge excitation & differential inputs |
| | VCC / GND | `3.3V` / `GND` | 3.3V | HX711 24-bit ADC module power |
| | DT (Data) | *GPIO: Not finalized* | 3.3V Logic | Serial data output to ESP32 |
| | SCK (Clock) | *GPIO: Not finalized* | 3.3V Logic | Serial clock pulse from ESP32 |

### Hardware Consideration: HC-SR04 Voltage Level
> [!IMPORTANT]
> The HC-SR04 ECHO pin operates at 5V logic, whereas ESP32 GPIO inputs are rated for 3.3V max.
> Connect a simple resistive voltage divider between HC-SR04 ECHO and ESP32 `GPIO 18`:
>
> ```
> HC-SR04 ECHO (5V) ---> [ 1kΩ Resistor ] ---> ESP32 GPIO 18 (3.3V)
>                                        |
>                                 [ 2kΩ Resistor ]
>                                        |
>                                       GND
> ```

---

## 4. Central Gateway — ESP32-S3 Control Hub

### Microcontroller
* **Board**: ESP32-S3 DevKitC-1
* **Role**: Receives direct ESP-NOW telemetry packets from Node 1 and Node 2, renders real-time indicators on the I2C OLED display, and forwards JSON payloads over Wi-Fi to the central FastAPI backend.

### Pinout & Wiring Table

| Component | Pin / Terminal | ESP32-S3 Connection | Voltage Level | Purpose / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **0.96" OLED (SSD1306)** | VCC | `3.3V` | 3.3V | 128x64 Monochrome I2C Display |
| | GND | `GND` | Ground | Common Ground |
| | SDA | `GPIO 8` | 3.3V I2C | I2C Data line (`#define OLED_SDA 8`) |
| | SCL | `GPIO 9` | 3.3V I2C | I2C Clock line (`#define OLED_SCL 9`) |
| | I2C Address | `0x3C` | - | Standard SSD1306 7-bit address |
| **HW-504 Joystick** | VCC | `3.3V` / `5V` | 3.3V / 5V | Analog 2-axis navigation + push switch |
| | GND | `GND` | Ground | Common Ground |
| | VRX / VRY / SW | *GPIO: Not finalized* | Analog/Digital | Screen switching / UI navigation |
| **Push Button** | Signal | *GPIO: Not finalized* | 3.3V (Pull-up) | Manual calibration / baseline trigger |
| **Active Buzzer** | Signal | *GPIO: Not finalized* | 3.3V / 5V | Audible alarm on CRITICAL / WARNING risk state |

---

## 5. Power & Grounding Guidelines

1. **Common Ground**: All sensor modules, motor drivers, and microcontrollers sharing communication channels must share a common ground (`GND`) plane.
2. **Motor & Servo Power**: High current actuators such as the SG90 servo motor should draw power from an independent 5V supply (or dedicated regulator) rather than the ESP32 onboard 3.3V LDO to prevent brownout resets during transmission bursts.
3. **Decoupling Capacitors**: Place a 10 µF to 100 µF electrolytic capacitor across the VCC and GND pins near the ESP32 and sensor headers to smooth out ESP-NOW RF transmission peaks.
