#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#include <math.h>

// ============================================================
// MINE SUBSIDENCE MONITORING SYSTEM
// NODE 1 - BASELINE / REFERENCE SENSOR NODE
// Sensors: MPU6050 (Tilt/Acceleration/Gyro) + SW-420 (Vibration)
// ============================================================

#define NODE_ID 1

#define SW420_PIN 27

#define MPU_SDA 21
#define MPU_SCL 22

#define ESPNOW_CHANNEL 1

// ============================================================
// ESP32-S3 GATEWAY MAC ADDRESS
// Replace with the actual MAC address of your ESP32-S3 Gateway
// ============================================================

uint8_t gatewayMAC[] = {
  0xAC, 0xA7, 0x04,
  0x2B, 0xA7, 0xFC
};

// ============================================================
// MPU6050 SENSOR INSTANCE
// ============================================================

Adafruit_MPU6050 mpu;

// ============================================================
// SENSOR TELEMETRY PACKET STRUCTURE
// MUST MATCH THE GATEWAY PACKET STRUCTURE EXACTLY
// ============================================================

typedef struct __attribute__((packed)) {
  uint8_t node_id;
  uint8_t vibration;

  float accel_x;
  float accel_y;
  float accel_z;

  float gyro_x;
  float gyro_y;
  float gyro_z;

  float tilt_x;
  float tilt_y;

  float distance_cm;

  char status[32];
} SensorData;

SensorData data;

// ============================================================
// ESP-NOW SEND CALLBACK
// ============================================================

void onDataSent(
  const wifi_tx_info_t *info,
  esp_now_send_status_t status
) {
  if (status != ESP_NOW_SEND_SUCCESS) {
    Serial.println("  ! ESP-NOW delivery failed");
  }
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(SW420_PIN, INPUT);

  Serial.println();
  Serial.println("============================================");
  Serial.println("        MINE MONITORING - NODE 1");
  Serial.println("============================================");
  Serial.println("Role    : Baseline / Reference Node");
  Serial.println("Sensors : MPU6050 + SW-420");
  Serial.println("--------------------------------------------");

  // Initialize MPU6050 over I2C
  Wire.begin(MPU_SDA, MPU_SCL);

  if (!mpu.begin()) {
    Serial.println("ERROR: MPU6050 not detected.");
    while (true) {
      delay(1000);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.println("MPU6050 : OK");

  // Initialize Wi-Fi in Station mode for ESP-NOW
  WiFi.mode(WIFI_STA);
  delay(300);

  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);

  Serial.print("MAC     : ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: ESP-NOW initialization failed.");
    while (true) {
      delay(1000);
    }
  }

  esp_now_register_send_cb(onDataSent);

  // Register Gateway Peer
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, gatewayMAC, 6);
  peer.channel = ESPNOW_CHANNEL;
  peer.encrypt = false;

  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("ERROR: Could not register gateway.");
    while (true) {
      delay(1000);
    }
  }

  Serial.println("ESP-NOW : OK");
  Serial.println("Gateway : Registered");
  Serial.println("--------------------------------------------");
  Serial.println("NODE 1 ONLINE");
  Serial.println("============================================");
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {
  // Read SW-420 Digital Vibration (Active LOW)
  bool vibration = (digitalRead(SW420_PIN) == LOW);

  // Read MPU6050 Accelerometer, Gyroscope & Temperature
  sensors_event_t accel;
  sensors_event_t gyro;
  sensors_event_t temperature;

  mpu.getEvent(&accel, &gyro, &temperature);

  // Calculate Tilt Angles
  float tiltX = atan2(
    accel.acceleration.y,
    accel.acceleration.z
  ) * 180.0 / PI;

  float tiltY = atan2(
    -accel.acceleration.x,
    sqrt(
      accel.acceleration.y * accel.acceleration.y +
      accel.acceleration.z * accel.acceleration.z
    )
  ) * 180.0 / PI;

  // Build Telemetry Packet
  data.node_id = NODE_ID;
  data.vibration = vibration ? 1 : 0;
  data.accel_x = accel.acceleration.x;
  data.accel_y = accel.acceleration.y;
  data.accel_z = accel.acceleration.z;
  data.gyro_x = gyro.gyro.x;
  data.gyro_y = gyro.gyro.y;
  data.gyro_z = gyro.gyro.z;
  data.tilt_x = tiltX;
  data.tilt_y = tiltY;
  data.distance_cm = -1.0; // Node 1 does not carry ultrasonic distance sensor

  if (vibration) {
    strcpy(data.status, "VIBRATION_DETECTED");
  } else {
    strcpy(data.status, "NORMAL");
  }

  // Send packet to ESP32-S3 Gateway via ESP-NOW
  esp_now_send(gatewayMAC, (uint8_t *)&data, sizeof(data));

  // Local Serial Monitor Output
  Serial.print("Node 1 | Tilt X: ");
  Serial.print(tiltX, 1);
  Serial.print("°  Tilt Y: ");
  Serial.print(tiltY, 1);
  Serial.print("°  Vibration: ");
  Serial.println(vibration ? "YES" : "NO");

  delay(1000);
}
