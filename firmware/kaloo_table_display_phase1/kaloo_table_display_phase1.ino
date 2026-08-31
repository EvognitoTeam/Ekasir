/*
 * KALOO Smart Table Display / Pager
 * ESP32 + 240x240 display + 3 LED
 *
 * Phase 1 firmware transport test.
 *
 * Library:
 * - ArduinoJson
 * - WebSockets by Markus Sattler (arduinoWebSockets)
 *
 * Display rendering sengaja masih berupa Serial output.
 * Setelah koneksi realtime teruji, kita sambungkan TFT_eSPI/LovyanGFX
 * sesuai controller IPS 240x240 yang Anda pakai (ST7789/GC9A01/dll).
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID =
  "GANTI_WIFI";

const char* WIFI_PASSWORD =
  "GANTI_PASSWORD";

const char* WS_HOST =
  "192.168.1.10"; // IP/domain gateway

const uint16_t WS_PORT =
  3010;

const int TABLE_ID =
  12;

const char* DEVICE_ID =
  "KALOO-TABLE-A";

const char* DEVICE_TOKEN =
  "GANTI_DEVICE_TOKEN";

const int LED_RED_PIN =
  25;

const int LED_YELLOW_PIN =
  26;

const int LED_BLUE_PIN =
  27;

WebSocketsClient webSocket;

String tableCode =
  "";

String tableStatus =
  "unknown";

String orderCode =
  "";

String orderStatus =
  "";

bool pagerActive =
  false;

unsigned long lastBlueBlink =
  0;

bool blueLedState =
  false;

void setLed(
  int pin,
  bool on
) {
  digitalWrite(
    pin,
    on
      ? HIGH
      : LOW
  );
}

void applyLedState(
  const String& redMode,
  const String& yellowMode,
  const String& blueMode
) {
  setLed(
    LED_RED_PIN,
    redMode == "on"
  );

  setLed(
    LED_YELLOW_PIN,
    yellowMode == "on"
  );

  /*
   * Blink biru ditangani di loop().
   */
  pagerActive =
    blueMode == "fast_blink" ||
    blueMode == "slow_blink";

  if (!pagerActive) {
    setLed(
      LED_BLUE_PIN,
      blueMode == "on"
    );
  }
}

void renderSnapshot(
  JsonDocument& doc
) {
  tableCode =
    doc["table"]["code"]
      .as<String>();

  tableStatus =
    doc["table"]["status"]
      .as<String>();

  if (
    doc["order"].isNull()
  ) {
    orderCode =
      "";

    orderStatus =
      "";
  } else {
    orderCode =
      doc["order"]["code"]
        .as<String>();

    orderStatus =
      doc["order"]["status"]
        .as<String>();
  }

  const String redMode =
    doc["leds"]["red"]
      .as<String>();

  const String yellowMode =
    doc["leds"]["yellow"]
      .as<String>();

  const String blueMode =
    doc["leds"]["blue"]
      .as<String>();

  applyLedState(
    redMode,
    yellowMode,
    blueMode
  );

  Serial.println();
  Serial.println(
    "===================="
  );

  Serial.printf(
    "TABLE: %s\n",
    tableCode.c_str()
  );

  Serial.printf(
    "STATUS: %s\n",
    tableStatus.c_str()
  );

  if (
    orderCode.length() >
    0
  ) {
    Serial.printf(
      "ORDER: %s\n",
      orderCode.c_str()
    );

    Serial.printf(
      "ORDER STATUS: %s\n",
      orderStatus.c_str()
    );
  }

  if (
    doc["pager"]["active"]
      .as<bool>()
  ) {
    Serial.printf(
      "PAGER: %s\n",
      doc["pager"]["message"]
        .as<const char*>()
    );
  }

  Serial.println(
    "===================="
  );

  /*
   * Di tahap display berikutnya:
   *
   * renderAvailable()
   * renderOccupied()
   * renderPreparing()
   * renderReady()
   * renderReserved()
   */
}

void handleWebSocketMessage(
  uint8_t* payload,
  size_t length
) {
  JsonDocument doc;

  DeserializationError error =
    deserializeJson(
      doc,
      payload,
      length
    );

  if (error) {
    Serial.printf(
      "JSON ERROR: %s\n",
      error.c_str()
    );

    return;
  }

  const String type =
    doc["type"]
      .as<String>();

  if (
    type ==
    "gateway.hello"
  ) {
    Serial.println(
      "Gateway connected."
    );

    webSocket.sendTXT(
      "{\"type\":\"sync.request\"}"
    );

    return;
  }

  if (
    type ==
    "table.snapshot"
  ) {
    renderSnapshot(
      doc
    );

    return;
  }

  if (
    type ==
    "gateway.error"
  ) {
    Serial.printf(
      "Gateway error: %s\n",
      doc["message"]
        .as<const char*>()
    );
  }
}

void webSocketEvent(
  WStype_t type,
  uint8_t* payload,
  size_t length
) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println(
        "WebSocket disconnected."
      );
      break;

    case WStype_CONNECTED:
      Serial.println(
        "WebSocket connected."
      );
      break;

    case WStype_TEXT:
      handleWebSocketMessage(
        payload,
        length
      );
      break;

    default:
      break;
  }
}

void connectWebSocket() {
  String path =
    "/ws?tableId=" +
    String(TABLE_ID) +
    "&deviceId=" +
    String(DEVICE_ID) +
    "&token=" +
    String(DEVICE_TOKEN);

  webSocket.begin(
    WS_HOST,
    WS_PORT,
    path
  );

  webSocket.onEvent(
    webSocketEvent
  );

  webSocket.setReconnectInterval(
    3000
  );

  /*
   * Gateway memakai native WS ping/pong.
   * Library akan merespons ping secara otomatis.
   */
}

void setup() {
  Serial.begin(
    115200
  );

  pinMode(
    LED_RED_PIN,
    OUTPUT
  );

  pinMode(
    LED_YELLOW_PIN,
    OUTPUT
  );

  pinMode(
    LED_BLUE_PIN,
    OUTPUT
  );

  setLed(
    LED_RED_PIN,
    false
  );

  setLed(
    LED_YELLOW_PIN,
    false
  );

  setLed(
    LED_BLUE_PIN,
    false
  );

  WiFi.mode(
    WIFI_STA
  );

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  Serial.print(
    "Connecting WiFi"
  );

  while (
    WiFi.status() !=
    WL_CONNECTED
  ) {
    delay(
      500
    );

    Serial.print(
      "."
    );
  }

  Serial.println();
  Serial.print(
    "WiFi connected: "
  );

  Serial.println(
    WiFi.localIP()
  );

  connectWebSocket();
}

void loop() {
  webSocket.loop();

  if (pagerActive) {
    const unsigned long now =
      millis();

    if (
      now -
      lastBlueBlink >=
      300
    ) {
      lastBlueBlink =
        now;

      blueLedState =
        !blueLedState;

      setLed(
        LED_BLUE_PIN,
        blueLedState
      );
    }
  }
}
