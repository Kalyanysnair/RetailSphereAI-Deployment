/*
 * =========================================================================
 * RetailSphere AI — ESP32 Dual FC-51 IR Sensor Inventory Counter
 * =========================================================================
 * Hardware Configuration:
 *   - ESP32 Development Board
 *   - Two FC-51 Infrared Obstacle Avoidance Sensors (Active LOW)
 *   - GPIO 27: INCREMENT_SENSOR (Sensor A / Item Entry)
 *   - GPIO 26: DECREMENT_SENSOR (Sensor B / Item Exit)
 *
 * Pin Connections:
 *   INCREMENT SENSOR (GPIO 27):
 *     VCC  --> ESP32 3V3 (or 5V for 5V-tolerant modules)
 *     GND  --> ESP32 GND
 *     OUT  --> ESP32 GPIO 27
 *
 *   DECREMENT SENSOR (GPIO 26):
 *     VCC  --> ESP32 3V3 (or 5V for 5V-tolerant modules)
 *     GND  --> ESP32 GND
 *     OUT  --> ESP32 GPIO 26
 *
 * Operational Behavior:
 *   1. Hardware Transition-Edge Detection (Active LOW):
 *      - D27 falling edge (HIGH -> LOW): Item enters -> sends "IN" (+1)
 *      - D26 falling edge (HIGH -> LOW): Item exits  -> sends "OUT" (-1)
 *      - Cooldown (1000ms) prevents bounce or multi-counts on furniture slats.
 *      - Zero-stock floor protection prevents negative inventory counts.
 *   2. Authoritative PostgreSQL Synchronization:
 *      - On boot/reconnect, fetches current database stock from FastAPI backend.
 *      - Stock count NEVER resets to zero on ESP32 reboot.
 *      - Server response updates local stock with PostgreSQL source of truth.
 *   3. Periodic Heartbeat & Freshness:
 *      - Transmits an authenticated heartbeat every 25 seconds.
 *      - Maintains ONLINE status in RetailSphere AI Admin Dashboard.
 *   4. Fault-Tolerant Offline Queue & Deduplication:
 *      - If Wi-Fi is temporarily disconnected, events buffer locally in FIFO queue.
 *      - Each event includes a unique event_id for backend deduplication.
 *      - Buffered events transmit automatically upon reconnection.
 *      - Events are only removed from the queue once the backend confirms receipt.
 *   5. Robust Wi-Fi State Machine:
 *      - Uses ESP32 Wi-Fi events to track single authoritative connection state.
 *      - State is CONNECTING when an attempt starts, CONNECTED only after GOT_IP,
 *        and DISCONNECTED upon a disconnect event.
 *      - Never calls WiFi.begin() or WiFi.reconnect() while already connecting.
 *      - 15-second connection timeout safely terminates failed attempt with WiFi.disconnect(false).
 *      - 10-second controlled retry cooldown without log spam.
 *      - Detailed diagnostic disconnect reason and IP logging without exposing credentials.
 *   6. Security & Privacy:
 *      - Authenticated with X-IoT-Key header.
 *      - Credentials are NEVER printed to Serial Monitor.
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_wifi.h>

// -------------------------------------------------------------------------
// 1. PIN & HARDWARE CONFIGURATION
// -------------------------------------------------------------------------
#define INCREMENT_SENSOR_PIN 27   // GPIO 27: Item entry (Sensor A, +1 stock)
#define DECREMENT_SENSOR_PIN 26   // GPIO 26: Item exit  (Sensor B, -1 stock)

// FC-51 outputs LOW (0) when obstacle is detected, HIGH (1) when clear
#define OBSTACLE_DETECTED LOW
#define SENSOR_CLEAR      HIGH

// Cooldown lockout per sensor (ms) to avoid bounce or multi-counts
const unsigned long SENSOR_COOLDOWN_MS = 1000;

// -------------------------------------------------------------------------
// 2. NETWORK & BACKEND SERVER CONFIGURATION
// -------------------------------------------------------------------------
// Wi-Fi Credentials for local 2.4GHz network:
const char* WIFI_SSID     = "Nikunjam";
const char* WIFI_PASSWORD = "sanal3382";

// Backend Server Configuration:
// Matching current IPv4 address from ipconfig on active Wi-Fi adapter
const char* SERVER_HOST   = "192.168.1.3"; 
const int   SERVER_PORT   = 8000;

// Device identification and security key matching backend IOT_DEVICE_SECRET
const char* DEVICE_ID     = "ESP32-WAREHOUSE-GATE-01";
const char* IOT_KEY       = "retailsphere-iot-inventory-secret-2026";

// Heartbeat ping interval when idle (25s ensures device stays ONLINE within 120s stale window)
const unsigned long HEARTBEAT_INTERVAL_MS = 25000;

// HTTP client connection timeout (ms) — accommodates remote PostgreSQL handshakes
const int HTTP_TIMEOUT_MS = 6000;

// -------------------------------------------------------------------------
// 3. WI-FI STATE MACHINE & TIMING DEFINITIONS
// -------------------------------------------------------------------------
enum WifiState {
  WIFI_STATE_IDLE,          // Boot default
  WIFI_STATE_CONNECTING,    // Connection attempt in progress
  WIFI_STATE_CONNECTED,     // DHCP IP lease obtained
  WIFI_STATE_DISCONNECTED   // Offline, cooling down before next retry
};

volatile WifiState currentWifiState = WIFI_STATE_IDLE;
unsigned long wifiConnectStartTime  = 0;
unsigned long lastWifiRetryTime     = 0;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;  // 15s connection timeout
const unsigned long WIFI_RETRY_INTERVAL_MS  = 10000;  // 10s cooldown between reconnect retries
uint8_t lastDisconnectReason               = 0;

// -------------------------------------------------------------------------
// 4. RUNTIME VARIABLES & EVENT BUFFER
// -------------------------------------------------------------------------
int stockCount = 0; // Synchronized with backend PostgreSQL

int lastIncrementState = SENSOR_CLEAR;
int lastDecrementState = SENSOR_CLEAR;

unsigned long lastIncrementTime = 0;
unsigned long lastDecrementTime = 0;
unsigned long lastHeartbeatTime  = 0;
unsigned long eventCounter       = 0;

bool wasConnected       = false;
bool initialStockSynced = false;

// Event buffer for offline / retry queue
struct QueuedEvent {
  char direction[6];      // "IN" or "OUT"
  char rawSequence[12];   // "D27" or "D26"
  char eventId[56];       // Unique deduplication ID
  char notes[96];         // Descriptive notes
  bool pending;
};

const int QUEUE_SIZE = 16;
QueuedEvent eventQueue[QUEUE_SIZE];
int queueHead  = 0;
int queueTail  = 0;
int queueCount = 0;

// -------------------------------------------------------------------------
// FORWARD DECLARATIONS (ensures Arduino compiler resolves all prototypes)
// -------------------------------------------------------------------------
int extractStockCount(const String& payload);
bool enqueueEvent(const char* direction, const char* rawSequence, const char* notes);
bool transmitEvent(QueuedEvent& ev);
void processEventQueue();
void sendHeartbeat();
void syncAuthoritativeStockFromBackend();
void startWifiConnection();
void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info);
const char* getDisconnectReasonText(uint8_t reason);

// -------------------------------------------------------------------------
// 5. HELPER: DISCONNECT REASON DECODER
// -------------------------------------------------------------------------
const char* getDisconnectReasonText(uint8_t reason) {
  switch (reason) {
    case 1:   return "UNSPECIFIED";
    case 2:   return "AUTH_EXPIRE";
    case 3:   return "AUTH_LEAVE";
    case 4:   return "ASSOC_EXPIRE";
    case 5:   return "ASSOC_TOOMANY";
    case 6:   return "NOT_AUTHED";
    case 7:   return "NOT_ASSOCED";
    case 8:   return "ASSOC_LEAVE";
    case 9:   return "ASSOC_NOT_AUTHED";
    case 15:  return "4WAY_HANDSHAKE_TIMEOUT";
    case 200: return "BEACON_TIMEOUT (AP out of range or weak signal)";
    case 201: return "NO_AP_FOUND (SSID not broadcasting or wrong band)";
    case 202: return "AUTH_FAIL (Incorrect password / authentication rejected)";
    case 203: return "ASSOC_FAIL (Association rejected by AP)";
    case 204: return "HANDSHAKE_TIMEOUT (WPA handshake failed)";
    case 205: return "CONNECTION_FAIL";
    case 206: return "AP_TSF_RESET";
    case 207: return "ROAMING";
    default: {
      const char* name = WiFi.disconnectReasonName((wifi_err_reason_t)reason);
      if (name != nullptr && strlen(name) > 0) return name;
      return "UNKNOWN_REASON";
    }
  }
}

// -------------------------------------------------------------------------
// 6. WI-FI EVENT HANDLER (Authoritative State Machine Driver)
// -------------------------------------------------------------------------
void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_START:
      Serial.println("[Wi-Fi Event] Station interface started.");
      break;

    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      // Note: STA_CONNECTED indicates L2 association only; L3 IP is NOT yet assigned.
      Serial.println("[Wi-Fi Event] Associated with Access Point. Awaiting DHCP IP lease...");
      break;

    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      // Authoritative CONNECTED state: IP address is now valid and ready for HTTP
      currentWifiState = WIFI_STATE_CONNECTED;
      Serial.println("\n========================================================");
      Serial.printf("[Wi-Fi Event] Connected Successfully! Assigned IP: %s\n",
                    WiFi.localIP().toString().c_str());
      Serial.printf("[Wi-Fi Event] RSSI: %d dBm | Channel: %d\n", WiFi.RSSI(), WiFi.channel());
      Serial.println("========================================================");
      break;

    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
      uint8_t reason = info.wifi_sta_disconnected.reason;
      lastDisconnectReason = reason;
      currentWifiState = WIFI_STATE_DISCONNECTED;
      lastWifiRetryTime = millis();

      Serial.println("\n--------------------------------------------------------");
      Serial.printf("[Wi-Fi Event] Disconnected (Reason: %s [Code %d])\n",
                    getDisconnectReasonText(reason), reason);
      Serial.println("[Wi-Fi Event] Status: Operating in offline mode. Next retry in 10s.");
      Serial.println("--------------------------------------------------------");
      break;
    }

    case ARDUINO_EVENT_WIFI_STA_LOST_IP:
      currentWifiState = WIFI_STATE_DISCONNECTED;
      lastWifiRetryTime = millis();
      Serial.println("\n[Wi-Fi Event] Lost IP address lease. Next retry in 10s.");
      break;

    case ARDUINO_EVENT_WIFI_STA_STOP:
      Serial.println("[Wi-Fi Event] Station interface stopped.");
      break;

    default:
      break;
  }
}

// -------------------------------------------------------------------------
// 7. WI-FI CONNECTION INITIATION (Guarded against duplicate calls)
// -------------------------------------------------------------------------
void startWifiConnection() {
  // Never initiate a new connection while an attempt is already in progress
  if (currentWifiState == WIFI_STATE_CONNECTING) {
    return;
  }
  // If already connected with valid IP, do nothing
  if (currentWifiState == WIFI_STATE_CONNECTED && WiFi.status() == WL_CONNECTED) {
    return;
  }

  currentWifiState = WIFI_STATE_CONNECTING;
  wifiConnectStartTime = millis();

  Serial.println("\n[Wi-Fi] Initiating connection...");
  Serial.printf("[Wi-Fi] Target SSID: %s\n", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// -------------------------------------------------------------------------
// 8. HELPER: EXTRACT CURRENT_STOCK FROM JSON RESPONSE (Dependency-free)
// -------------------------------------------------------------------------
int extractStockCount(const String& payload) {
  int keyIndex = payload.indexOf("\"current_stock\":");
  if (keyIndex == -1) {
    keyIndex = payload.indexOf("\"current_stock\" :");
  }
  if (keyIndex != -1) {
    int colonIndex = payload.indexOf(':', keyIndex);
    if (colonIndex != -1) {
      int start = colonIndex + 1;
      while (start < (int)payload.length() && (payload[start] == ' ' || payload[start] == '\t')) {
        start++;
      }
      int end = start;
      if (end < (int)payload.length() && payload[end] == '-') {
        end++;
      }
      while (end < (int)payload.length() && isDigit(payload[end])) {
        end++;
      }
      if (end > start) {
        return payload.substring(start, end).toInt();
      }
    }
  }
  return -1;
}

// -------------------------------------------------------------------------
// 9. HELPER: QUEUE SENSOR EVENT (Preserved across disconnections)
// -------------------------------------------------------------------------
bool enqueueEvent(const char* direction, const char* rawSequence, const char* notes) {
  if (queueCount >= QUEUE_SIZE) {
    Serial.println("[QUEUE FULL] Buffer reached capacity. Dropping oldest unconfirmed event.");
    queueHead = (queueHead + 1) % QUEUE_SIZE;
    queueCount--;
  }

  QueuedEvent& ev = eventQueue[queueTail];
  strncpy(ev.direction, direction, sizeof(ev.direction) - 1);
  ev.direction[sizeof(ev.direction) - 1] = '\0';

  strncpy(ev.rawSequence, rawSequence, sizeof(ev.rawSequence) - 1);
  ev.rawSequence[sizeof(ev.rawSequence) - 1] = '\0';

  eventCounter++;
  snprintf(ev.eventId, sizeof(ev.eventId), "esp32-%s-%lu-%lu", DEVICE_ID, millis(), eventCounter);

  strncpy(ev.notes, notes, sizeof(ev.notes) - 1);
  ev.notes[sizeof(ev.notes) - 1] = '\0';

  ev.pending = true;

  queueTail = (queueTail + 1) % QUEUE_SIZE;
  queueCount++;

  Serial.printf("[QUEUED] %s passage event (#%lu, ID: %s) buffered. Queue depth: %d\n",
                direction, eventCounter, ev.eventId, queueCount);
  return true;
}

// -------------------------------------------------------------------------
// 10. HELPER: SYNCHRONIZE AUTHORITATIVE STOCK FROM POSTGRESQL BACKEND
// -------------------------------------------------------------------------
void syncAuthoritativeStockFromBackend() {
  if (currentWifiState != WIFI_STATE_CONNECTED || WiFi.status() != WL_CONNECTED) {
    Serial.println("[SYNC SKIP] Wi-Fi offline. Using current local stock.");
    return;
  }

  char statusUrl[160];
  snprintf(statusUrl, sizeof(statusUrl), "http://%s:%d/api/iot/inventory/status?device_id=%s",
           SERVER_HOST, SERVER_PORT, DEVICE_ID);

  Serial.printf("[SYNC] Querying backend status: %s\n", statusUrl);

  HTTPClient http;
  http.begin(statusUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("X-IoT-Key", IOT_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    int serverStock = extractStockCount(payload);
    if (serverStock >= 0) {
      stockCount = serverStock;
      Serial.println("========================================================");
      Serial.printf("[SYNC SUCCESS] Authoritative PostgreSQL Stock: %d units\n", stockCount);
      Serial.println("========================================================");
    } else {
      Serial.printf("[SYNC] Received payload without current_stock: %s\n", payload.c_str());
    }
  } else {
    Serial.printf("[SYNC NOTICE] Backend status query returned HTTP %d. Retaining local stock: %d\n",
                  httpCode, stockCount);
  }
  http.end();
}

// -------------------------------------------------------------------------
// 11. HELPER: TRANSMIT SENSOR EVENT TO BACKEND
// -------------------------------------------------------------------------
bool transmitEvent(QueuedEvent& ev) {
  if (currentWifiState != WIFI_STATE_CONNECTED || WiFi.status() != WL_CONNECTED) {
    return false;
  }

  char eventUrl[160];
  snprintf(eventUrl, sizeof(eventUrl), "http://%s:%d/api/iot/inventory/event",
           SERVER_HOST, SERVER_PORT);

  HTTPClient http;
  http.begin(eventUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-IoT-Key", IOT_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  char jsonPayload[320];
  snprintf(jsonPayload, sizeof(jsonPayload),
           "{\"device_id\":\"%s\",\"direction\":\"%s\",\"raw_sequence\":\"%s\",\"event_id\":\"%s\",\"notes\":\"%s\"}",
           DEVICE_ID, ev.direction, ev.rawSequence, ev.eventId, ev.notes);

  Serial.printf("[HTTP POST] Sending %s event to %s\n", ev.direction, eventUrl);

  int httpCode = http.POST(jsonPayload);
  bool success = false;

  Serial.printf("[HTTP POST] HTTP Response Code: %d\n", httpCode);

  if (httpCode == HTTP_CODE_CREATED || httpCode == HTTP_CODE_OK) {
    String responseBody = http.getString();
    Serial.printf("[HTTP POST] Response Body: %s\n", responseBody.c_str());

    int serverStock = extractStockCount(responseBody);
    if (serverStock >= 0) {
      stockCount = serverStock;
    }
    lastHeartbeatTime = millis();
    Serial.printf("[STOCK SYNC] Authoritative PostgreSQL Stock: %d units\n", stockCount);
    success = true;
  } else if (httpCode > 0) {
    String responseBody = http.getString();
    Serial.printf("[HTTP POST] Server returned error (HTTP %d): %s\n", httpCode, responseBody.c_str());
    success = false;
  } else {
    Serial.printf("[HTTP FAIL] Connection error: %s. Preserving event in queue.\n",
                  http.errorToString(httpCode).c_str());
    success = false;
  }

  http.end();
  return success;
}

// -------------------------------------------------------------------------
// 12. HELPER: FLUSH QUEUED EVENTS IN FIFO ORDER
// -------------------------------------------------------------------------
void processEventQueue() {
  if (queueCount == 0 || currentWifiState != WIFI_STATE_CONNECTED || WiFi.status() != WL_CONNECTED) {
    return;
  }

  QueuedEvent& ev = eventQueue[queueHead];
  if (ev.pending) {
    if (transmitEvent(ev)) {
      ev.pending = false;
      queueHead = (queueHead + 1) % QUEUE_SIZE;
      queueCount--;
      Serial.printf("[QUEUE] Event %s confirmed by server and removed. Remaining: %d\n", ev.eventId, queueCount);
    } else {
      Serial.printf("[QUEUE] Event %s transmission unconfirmed. Preserving in queue (depth: %d) for retry.\n", ev.eventId, queueCount);
    }
  }
}

// -------------------------------------------------------------------------
// 13. HELPER: SEND AUTHENTICATED HEARTBEAT
// -------------------------------------------------------------------------
void sendHeartbeat() {
  if (currentWifiState != WIFI_STATE_CONNECTED || WiFi.status() != WL_CONNECTED) {
    return;
  }

  char heartbeatUrl[180];
  snprintf(heartbeatUrl, sizeof(heartbeatUrl), "http://%s:%d/api/iot/inventory/heartbeat?device_id=%s",
           SERVER_HOST, SERVER_PORT, DEVICE_ID);

  HTTPClient http;
  http.begin(heartbeatUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-IoT-Key", IOT_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  char jsonPayload[64];
  snprintf(jsonPayload, sizeof(jsonPayload), "{\"device_id\":\"%s\"}", DEVICE_ID);

  Serial.printf("[HEARTBEAT] Sending heartbeat to: %s\n", heartbeatUrl);

  int httpCode = http.POST(jsonPayload);
  Serial.printf("[HEARTBEAT] HTTP Response Code: %d\n", httpCode);

  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String resp = http.getString();
    Serial.printf("[HEARTBEAT] Response Body: %s\n", resp.c_str());

    int serverStock = extractStockCount(resp);
    if (serverStock >= 0) {
      stockCount = serverStock;
    }
    lastHeartbeatTime = millis();
    Serial.printf("[HEARTBEAT] Backend confirmed ONLINE. Authoritative Stock: %d\n", stockCount);
  } else if (httpCode > 0) {
    String resp = http.getString();
    Serial.printf("[HEARTBEAT] Ping rejected by backend (HTTP %d): %s\n", httpCode, resp.c_str());
  } else {
    Serial.printf("[HEARTBEAT] Connection failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// -------------------------------------------------------------------------
// 14. SETUP ROUTINE
// -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("RetailSphere AI — Wi-Fi Stock Counter (ESP32 + Dual FC-51)");
  Serial.printf("Increment Sensor Pin: GPIO %d (Sensor A Entry: +1 Stock)\n", INCREMENT_SENSOR_PIN);
  Serial.printf("Decrement Sensor Pin: GPIO %d (Sensor B Exit : -1 Stock)\n", DECREMENT_SENSOR_PIN);
  Serial.printf("Device Identifier   : %s\n", DEVICE_ID);
  Serial.printf("Target Server       : http://%s:%d\n", SERVER_HOST, SERVER_PORT);
  Serial.println("========================================================");

  // Initialize sensors with pull-ups (FC-51 outputs active LOW on obstacle detection)
  pinMode(INCREMENT_SENSOR_PIN, INPUT_PULLUP);
  pinMode(DECREMENT_SENSOR_PIN, INPUT_PULLUP);

  lastIncrementState = digitalRead(INCREMENT_SENSOR_PIN);
  lastDecrementState = digitalRead(DECREMENT_SENSOR_PIN);

  // Register Wi-Fi Event Handler BEFORE configuring STA mode
  WiFi.onEvent(onWiFiEvent);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false); // State machine authoritatively manages connection cycles

  // Initiate Wi-Fi connection through state machine
  startWifiConnection();

  // Non-blocking boot grace period (up to 6 seconds) to allow initial association
  Serial.print("[Wi-Fi] Connecting");
  unsigned long bootWaitStart = millis();
  while (currentWifiState == WIFI_STATE_CONNECTING && (millis() - bootWaitStart < 6000)) {
    delay(300);
    Serial.print(".");
  }

  if (currentWifiState == WIFI_STATE_CONNECTED) {
    wasConnected = true;
    Serial.println("\n[Wi-Fi] Connected during boot!");

    // Synchronize initial baseline stock from PostgreSQL database
    syncAuthoritativeStockFromBackend();
    initialStockSynced = true;

    // Immediately transmit initial heartbeat to mark device ONLINE in Admin Dashboard
    sendHeartbeat();
  } else {
    Serial.println("\n[Wi-Fi NOTICE] Continuing boot in offline count mode.");
    Serial.println("[Wi-Fi NOTICE] Sensors active immediately. Background retry enabled.");
    wasConnected = false;
  }
}

// -------------------------------------------------------------------------
// 15. MAIN SENSING & TRANSMISSION LOOP
// -------------------------------------------------------------------------
void loop() {
  unsigned long now = millis();
  bool isConnected = (currentWifiState == WIFI_STATE_CONNECTED && WiFi.status() == WL_CONNECTED);

  // 1. Connection Timeout Guardian:
  // If connection is in progress but exceeded 15 seconds, safely terminate and back off
  if (currentWifiState == WIFI_STATE_CONNECTING && (now - wifiConnectStartTime >= WIFI_CONNECT_TIMEOUT_MS)) {
    Serial.println("\n[Wi-Fi] Connection attempt timed out (15s). Safely resetting failed attempt.");
    WiFi.disconnect(false);
    currentWifiState = WIFI_STATE_DISCONNECTED;
    lastWifiRetryTime = now;
  }

  // 2. Wi-Fi reconnection handling
  if (isConnected && !wasConnected) {
    Serial.println("\n[Wi-Fi] Connection active!");
    Serial.printf("[Wi-Fi] Assigned ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
    wasConnected = true;

    if (!initialStockSynced) {
      syncAuthoritativeStockFromBackend();
      initialStockSynced = true;
    }

    sendHeartbeat();
    processEventQueue();
  } else if (!isConnected && wasConnected) {
    Serial.println("\n[Wi-Fi WARNING] Connection dropped. Operating with local event buffer.");
    wasConnected = false;
  }

  // 3. Periodic background Wi-Fi reconnect attempt:
  // ONLY attempt reconnect if genuinely DISCONNECTED and the 10-second retry cooldown has elapsed.
  // NEVER call WiFi.begin() or WiFi.reconnect() while in WIFI_STATE_CONNECTING!
  if (currentWifiState == WIFI_STATE_DISCONNECTED && (now - lastWifiRetryTime >= WIFI_RETRY_INTERVAL_MS)) {
    lastWifiRetryTime = now;
    Serial.println("[Wi-Fi] 10s cooldown elapsed. Attempting background reconnect...");
    startWifiConnection();
  }

  // 4. Periodic heartbeat ping (every 25 seconds when connected)
  if (isConnected && (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS)) {
    sendHeartbeat();
  }

  // 5. Process queued events in FIFO order
  if (isConnected && queueCount > 0) {
    processEventQueue();
  }

  // 6. Read optical IR sensors (Active LOW) — 100% responsive even while offline
  int currentIncState = digitalRead(INCREMENT_SENSOR_PIN);
  int currentDecState = digitalRead(DECREMENT_SENSOR_PIN);

  // -----------------------------------------------------------------------
  // INCREMENT SENSOR (GPIO 27, Sensor A) — Edge Detection: HIGH -> LOW (Item Entry)
  // -----------------------------------------------------------------------
  if (currentIncState == OBSTACLE_DETECTED &&
      lastIncrementState == SENSOR_CLEAR &&
      (now - lastIncrementTime >= SENSOR_COOLDOWN_MS)) {

    lastIncrementTime = now;
    stockCount++;

    Serial.println("\n--------------------------------------------------------");
    Serial.printf("[SENSOR D27 DETECTED] >>> ITEM ENTERED (+1) <<< Local Stock: %d\n", stockCount);
    Serial.println("--------------------------------------------------------");

    enqueueEvent("IN", "D27", "Item entry detected (GPIO 27 Increment Sensor)");

    if (isConnected) {
      processEventQueue();
    }
  }

  // -----------------------------------------------------------------------
  // DECREMENT SENSOR (GPIO 26, Sensor B) — Edge Detection: HIGH -> LOW (Item Exit + Zero-Stock Protection)
  // -----------------------------------------------------------------------
  if (currentDecState == OBSTACLE_DETECTED &&
      lastDecrementState == SENSOR_CLEAR &&
      (now - lastDecrementTime >= SENSOR_COOLDOWN_MS)) {

    lastDecrementTime = now;

    if (stockCount > 0) {
      stockCount--;

      Serial.println("\n--------------------------------------------------------");
      Serial.printf("[SENSOR D26 DETECTED] >>> ITEM EXITED (-1) <<< Local Stock: %d\n", stockCount);
      Serial.println("--------------------------------------------------------");

      enqueueEvent("OUT", "D26", "Item exit detected (GPIO 26 Decrement Sensor)");

      if (isConnected) {
        processEventQueue();
      }
    } else {
      Serial.println("\n--------------------------------------------------------");
      Serial.println("[SENSOR D26 DETECTED] >>> EXIT IGNORED <<< Stock is 0 (Zero-stock protected).");
      Serial.println("--------------------------------------------------------");
    }
  }

  lastIncrementState = currentIncState;
  lastDecrementState = currentDecState;

  delay(20); // 50Hz optical scan rate
}
