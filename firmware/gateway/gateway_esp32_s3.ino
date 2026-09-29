#include <WiFi.h>
#include <esp_now.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ============================================================
// MINE SUBSIDENCE MONITORING SYSTEM - ESP32-S3 CENTRAL GATEWAY
// Topology: Star Topology / Wireless Sensor Network Gateway
// Routing : Node 1 + Node 2 -> ESP-NOW -> ESP32-S3 -> Wi-Fi -> FastAPI
// ============================================================

// ---------------- WIFI CONFIGURATION ----------------
// Configure with your Wi-Fi SSID, password, and backend server IP
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// IP address of the machine running the FastAPI backend (e.g. 192.168.1.100)
IPAddress backendIP(192, 168, 1, 100);

// FastAPI backend endpoint
const char* BACKEND_PATH = "/api/readings";

// ---------------- NODE IDENTIFIERS ----------------
const char* NODE1_ID = "node-baseline";
const char* NODE2_ID = "node-deformation";

// ---------------- OLED DISPLAY (I2C) ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_SDA 8
#define OLED_SCL 9
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  OLED_RESET
);

bool oledOK = false;

// ---------------- SENSOR TELEMETRY PACKET ----------------
// MUST MATCH Node 1 and Node 2 packet layout exactly
typedef struct __attribute__((packed)) {
  uint8_t node_id;
  uint8_t vibration;
  uint8_t crack_state;

  float accel_x;
  float accel_y;
  float accel_z;

  float gyro_x;
  float gyro_y;
  float gyro_z;

  float tilt_x;
  float tilt_y;

  float distance_cm;
  float displacement_cm;

  char status[32];
} SensorData;

// ---------------- STATE & QUEUES ----------------
QueueHandle_t rxQueue;

SensorData node1Data;
SensorData node2Data;

bool node1Received = false;
bool node2Received = false;

unsigned long node1LastSeen = 0;
unsigned long node2LastSeen = 0;

bool backendOK = false;

// ============================================================
// OLED HELPER
// ============================================================

void oledMessage(String line1, String line2 = "", String line3 = "") {
  if (!oledOK) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  display.setCursor(0, 0);
  display.println(line1);

  if (line2.length() > 0) {
    display.setCursor(0, 20);
    display.println(line2);
  }

  if (line3.length() > 0) {
    display.setCursor(0, 40);
    display.println(line3);
  }

  display.display();
}

// ============================================================
// ESP-NOW RECEIVE CALLBACK
// ============================================================

void onDataReceive(
  const esp_now_recv_info_t *info,
  const uint8_t *data,
  int dataLength
) {
  if (dataLength != sizeof(SensorData)) {
    Serial.print("BAD PACKET SIZE: ");
    Serial.println(dataLength);
    return;
  }

  SensorData packet;
  memcpy(&packet, data, sizeof(packet));

  if (rxQueue != NULL) {
    xQueueSend(rxQueue, &packet, 0);
  }
}

// ============================================================
// RELAY TELEMETRY TO FASTAPI BACKEND (HTTP POST)
// ============================================================

void postReading(const SensorData &s) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected");
    backendOK = false;
    return;
  }

  const char* nodeID;
  if (s.node_id == 1) {
    nodeID = NODE1_ID;
  } else if (s.node_id == 2) {
    nodeID = NODE2_ID;
  } else {
    Serial.println("Unknown node ID");
    return;
  }

  char json[512];
  int n = snprintf(
    json,
    sizeof(json),
    "{"
    "\"node_id\":\"%s\","
    "\"tilt_x\":%.2f,"
    "\"tilt_y\":%.2f,"
    "\"vibration\":%s",
    nodeID,
    s.tilt_x,
    s.tilt_y,
    s.vibration ? "true" : "false"
  );

  // Append Node 2 specific fields if present
  if (s.node_id == 2) {
    if (s.distance_cm >= 0) {
      n += snprintf(
        json + n,
        sizeof(json) - n,
        ",\"distance_cm\":%.2f",
        s.distance_cm
      );
    }

    if (s.displacement_cm >= 0) {
      n += snprintf(
        json + n,
        sizeof(json) - n,
        ",\"displacement_cm\":%.2f",
        s.displacement_cm
      );
    }

    n += snprintf(
      json + n,
      sizeof(json) - n,
      ",\"crack_state\":%s",
      s.crack_state ? "true" : "false"
    );
  }

  snprintf(json + n, sizeof(json) - n, "}");

  String url = "http://" + backendIP.toString() + ":8000" + BACKEND_PATH;

  Serial.println("--------------------------------");
  Serial.print("Sending: ");
  Serial.println(json);
  Serial.print("URL: ");
  Serial.println(url);

  HTTPClient http;
  http.setConnectTimeout(2000);
  http.setTimeout(3000);

  if (!http.begin(url)) {
    Serial.println("HTTP BEGIN FAILED");
    backendOK = false;
    return;
  }

  http.addHeader("Content-Type", "application/json");
  int responseCode = http.POST(json);

  Serial.print("HTTP RESPONSE: ");
  Serial.println(responseCode);

  if (responseCode >= 200 && responseCode < 300) {
    backendOK = true;
    Serial.println("BACKEND OK");
  } else {
    backendOK = false;
    Serial.println("BACKEND ERROR");
    if (responseCode > 0) {
      Serial.println(http.getString());
    }
  }

  http.end();
}

// ============================================================
// OLED DISPLAY REFRESH
// ============================================================

void updateOLED() {
  if (!oledOK) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header Title
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("MINE MONITORING");

  // Backend Link Indicator
  display.setCursor(112, 0);
  display.print(backendOK ? "*" : "-");

  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Status Evaluation
  String status = "WAITING";

  if (node2Received) {
    if (millis() - node2LastSeen > 6000) {
      status = "OFFLINE";
    } else if (node2Data.crack_state) {
      status = "CRITICAL";
    } else if (node2Data.vibration) {
      status = "WARNING";
    } else if (abs(node2Data.tilt_x) >= 5 || abs(node2Data.tilt_y) >= 5) {
      status = "WARNING";
    } else {
      status = "NORMAL";
    }
  }

  display.setTextSize(2);
  display.setCursor(0, 15);
  display.println(status);

  // Node 2 Telemetry Summary
  display.setTextSize(1);
  display.setCursor(0, 36);
  display.print("Tilt: ");
  if (node2Received) {
    display.print(node2Data.tilt_x, 1);
    display.print(" deg");
  } else {
    display.print("--");
  }

  display.setCursor(0, 47);
  display.print("Dist: ");
  if (node2Received && node2Data.distance_cm >= 0) {
    display.print(node2Data.distance_cm, 1);
    display.print(" cm");
  } else {
    display.print("--");
  }

  display.setCursor(0, 58);
  display.print("V:");
  display.print((node2Received && node2Data.vibration) ? "YES" : "NO");

  display.print(" C:");
  display.print((node2Received && node2Data.crack_state) ? "YES" : "NO");

  display.display();
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1500);

  // Initialize OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  oledOK = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);

  if (oledOK) {
    oledMessage("MINE MONITORING", "Starting gateway...", "Control Hub");
    delay(1500);
    Serial.println("OLED: OK");
  } else {
    Serial.println("OLED: NOT FOUND (continuing without display)");
  }

  // Initialize Wi-Fi
  if (oledOK) {
    oledMessage("Connecting WiFi...");
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.println();
  Serial.println("==============================");
  Serial.println("ESP32-S3 MINE GATEWAY HUB");
  Serial.println("==============================");

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi: CONNECTED");
    Serial.print("Gateway IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("WiFi Channel: ");
    Serial.println(WiFi.channel());

    if (oledOK) {
      oledMessage(
        "WiFi CONNECTED",
        WiFi.localIP().toString(),
        "CH: " + String(WiFi.channel())
      );
      delay(2000);
    }
  } else {
    Serial.println("WiFi: FAILED (Check SSID/Password)");
    if (oledOK) {
      oledMessage("WiFi FAILED", "Check configuration");
    }
  }

  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW INIT FAILED");
    if (oledOK) {
      oledMessage("ESP-NOW FAILED");
    }
    while (true) {
      delay(1000);
    }
  }

  rxQueue = xQueueCreate(10, sizeof(SensorData));
  esp_now_register_recv_cb(onDataReceive);

  Serial.println("ESP-NOW: READY");
  Serial.println("Gateway ready.");

  if (oledOK) {
    oledMessage(
      "GATEWAY READY",
      "Waiting for nodes...",
      backendOK ? "BACKEND OK" : "BACKEND WAIT"
    );
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {
  SensorData packet;

  // Process incoming packets from ESP-NOW queue
  while (xQueueReceive(rxQueue, &packet, 0) == pdTRUE) {
    if (packet.node_id == 1) {
      node1Data = packet;
      node1Received = true;
      node1LastSeen = millis();
      Serial.println("NODE 1 RECEIVED");
      postReading(packet);
    } else if (packet.node_id == 2) {
      node2Data = packet;
      node2Received = true;
      node2LastSeen = millis();
      Serial.println("NODE 2 RECEIVED");
      postReading(packet);
    }
  }

  // Refresh OLED Display every 500ms
  static unsigned long lastOLED = 0;
  if (millis() - lastOLED >= 500) {
    lastOLED = millis();
    updateOLED();
  }

  // Auto-reconnect Wi-Fi every 10s if disconnected
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck >= 10000) {
    lastWiFiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected. Reconnecting...");
      WiFi.reconnect();
    }
  }

  delay(5);
}
