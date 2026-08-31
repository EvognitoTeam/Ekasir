#include <WiFi.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <mbedtls/md.h>
#include <time.h>

// ============================================================
// KALOO CONFIG
// ============================================================

const String MASTER_KEY =
  "10821e4da9b7cf08505480fbae0333c6de2ef0a607f9f04d5e3a829601d993af";

const char* IOT_SERVER_HOST =
  "192.168.2.88";

const uint16_t IOT_SERVER_PORT =
  3010;

const char* IOT_WS_PATH =
  "/ws";

const long WIB_OFFSET =
  7L * 60L * 60L;

// ============================================================
// PINOUT
// ============================================================

#define TFT_SCLK 18
#define TFT_MOSI 23
#define TFT_CS   -1
#define TFT_DC   16
#define TFT_RST  17

#define LED_RED     12
#define LED_YELLOW  13
#define LED_BLUE    5

#define BUZZER_PIN  26


#define SCREEN_W 240
#define SCREEN_H 240

Adafruit_ST7789 tft(
  TFT_CS,
  TFT_DC,
  TFT_RST
);

WebSocketsClient webSocket;

// ============================================================
// DEVICE
// ============================================================

String hexId;
String apHex;
String secretKey;

// ============================================================
// CONNECTION
// ============================================================

bool wifiOk = false;
bool wsOk = false;
bool authOk = false;

// ============================================================
// TABLE STATE
// ============================================================

String tableName = "TABLE";
String tableStatus = "init";

String orderCode;
String orderStatus;
String paymentStatus;
String customerName;

bool hasReservation = false;
String reservationName;
String reservationStart;

bool pagerActive = false;

String redMode = "off";
String yellowMode = "off";
String blueMode = "off";

// ============================================================
// UI / LED TIMING
// ============================================================

bool screenDirty = true;
bool blinkFrame = false;

unsigned long lastUiFrame = 0;
unsigned long lastRedBlink = 0;
unsigned long lastYellowBlink = 0;
unsigned long lastBlueBlink = 0;

bool redState = false;
bool yellowState = false;
bool blueState = false;

// ============================================================
// BUZZER / PAGER TASK
// ============================================================

/*
 * Main loop hanya menentukan apakah pager harus berbunyi.
 * Timing beep dikerjakan task terpisah di Core 1.
 */
volatile bool buzzerShouldBuzz = false;

TaskHandle_t buzzerTaskHandle =
  nullptr;

const unsigned int BUZZER_FREQUENCY =
  1200;

const uint32_t BUZZER_ON_MS =
  140;

const uint32_t BUZZER_GAP_MS =
  80;

const uint32_t BUZZER_LOOP_PAUSE_MS =
  1300;

// ============================================================
// COLORS
// ============================================================

#define C_BG       ST77XX_BLACK
#define C_TEXT     ST77XX_WHITE
#define C_MUTED    0x7BEF
#define C_PANEL    0x1082
#define C_GREEN    0x07E0
#define C_RED      0xF800
#define C_YELLOW   0xFFE0
#define C_BLUE     0x051F
#define C_CYAN     0x07FF
#define C_ORANGE   0xFD20

// ============================================================
// DEVICE ID
// ============================================================

String getHexId() {
  String mac =
    WiFi.macAddress();

  mac.trim();
  mac.toUpperCase();

  return mac;
}

String removeColon(
  String value
) {
  value.replace(
    ":",
    ""
  );

  value.toUpperCase();

  return value;
}

String generateSecret(
  const String& mac
) {
  const String source =
    mac +
    MASTER_KEY;

  byte hash[32];

  mbedtls_md_context_t ctx;

  mbedtls_md_init(
    &ctx
  );

  const mbedtls_md_info_t* info =
    mbedtls_md_info_from_type(
      MBEDTLS_MD_SHA256
    );

  if (
    info == nullptr ||
    mbedtls_md_setup(
      &ctx,
      info,
      0
    ) != 0
  ) {
    mbedtls_md_free(
      &ctx
    );

    return "";
  }

  mbedtls_md_starts(
    &ctx
  );

  mbedtls_md_update(
    &ctx,
    reinterpret_cast<
      const unsigned char*
    >(
      source.c_str()
    ),
    source.length()
  );

  mbedtls_md_finish(
    &ctx,
    hash
  );

  mbedtls_md_free(
    &ctx
  );

  String result;

  result.reserve(
    64
  );

  for (
    int i = 0;
    i < 32;
    i++
  ) {
    char part[3];

    snprintf(
      part,
      sizeof(part),
      "%02x",
      hash[i]
    );

    result += part;
  }

  return result;
}

// ============================================================
// TIME
// ============================================================

int64_t daysFromCivil(
  int year,
  unsigned month,
  unsigned day
) {
  year -=
    month <= 2;

  const int era =
    (
      year >= 0
        ? year
        : year - 399
    ) /
    400;

  const unsigned yoe =
    static_cast<unsigned>(
      year -
      era * 400
    );

  const unsigned doy =
    (
      153 *
      (
        month +
        (
          month > 2
            ? -3
            : 9
        )
      ) +
      2
    ) /
    5 +
    day -
    1;

  const unsigned doe =
    yoe * 365 +
    yoe / 4 -
    yoe / 100 +
    doy;

  return
    static_cast<int64_t>(
      era
    ) *
      146097LL +
    static_cast<int64_t>(
      doe
    ) -
    719468LL;
}

time_t parseIsoUtc(
  const String& iso
) {
  if (
    iso.length() <
    19
  ) {
    return 0;
  }

  int y, m, d;
  int hh, mm, ss;

  if (
    sscanf(
      iso.c_str(),
      "%d-%d-%dT%d:%d:%d",
      &y,
      &m,
      &d,
      &hh,
      &mm,
      &ss
    ) != 6
  ) {
    return 0;
  }

  const int64_t days =
    daysFromCivil(
      y,
      static_cast<unsigned>(m),
      static_cast<unsigned>(d)
    );

  return static_cast<time_t>(
    days * 86400LL +
    hh * 3600LL +
    mm * 60LL +
    ss
  );
}

String reservationClock() {
  const time_t utc =
    parseIsoUtc(
      reservationStart
    );

  if (
    utc <= 0
  ) {
    return "--:--";
  }

  const time_t local =
    utc +
    WIB_OFFSET;

  struct tm result;

  gmtime_r(
    &local,
    &result
  );

  char buffer[6];

  snprintf(
    buffer,
    sizeof(buffer),
    "%02d:%02d",
    result.tm_hour,
    result.tm_min
  );

  return String(
    buffer
  );
}


bool reservationIsToday() {
  if (
    !hasReservation ||
    reservationStart.length() ==
      0
  ) {
    return false;
  }

  const time_t nowUtc =
    time(
      nullptr
    );

  const time_t reservationUtc =
    parseIsoUtc(
      reservationStart
    );

  /*
   * Kalau NTP belum sinkron atau timestamp reservation invalid,
   * jangan tampilkan reservation dulu.
   */
  if (
    nowUtc <
      1700000000 ||
    reservationUtc <=
      0
  ) {
    return false;
  }

  const time_t nowLocal =
    nowUtc +
    WIB_OFFSET;

  const time_t reservationLocal =
    reservationUtc +
    WIB_OFFSET;

  struct tm nowTm;
  struct tm reservationTm;

  gmtime_r(
    &nowLocal,
    &nowTm
  );

  gmtime_r(
    &reservationLocal,
    &reservationTm
  );

  return
    nowTm.tm_year ==
      reservationTm.tm_year &&
    nowTm.tm_mon ==
      reservationTm.tm_mon &&
    nowTm.tm_mday ==
      reservationTm.tm_mday;
}

String reservationLedMode() {
  /*
   * Reservation hari lain tidak menyalakan LED kuning.
   */
  if (
    !reservationIsToday()
  ) {
    return "off";
  }

  const time_t now =
    time(
      nullptr
    );

  const time_t target =
    parseIsoUtc(
      reservationStart
    );

  if (
    now < 1700000000 ||
    target <= 0
  ) {
    return "on";
  }

  const long diff =
    static_cast<long>(
      target -
      now
    );

  if (
    diff <= 10 * 60
  ) {
    return "fast_blink";
  }

  if (
    diff <= 30 * 60
  ) {
    return "slow_blink";
  }

  return "on";
}

// ============================================================
// TEXT HELPERS
// ============================================================

String clip(
  String text,
  int maxChars
) {
  if (
    text.length() >
    maxChars
  ) {
    text =
      text.substring(
        0,
        maxChars
      );
  }

  return text;
}

void centerText(
  const String& text,
  int y,
  uint8_t size,
  uint16_t color
) {
  tft.setTextSize(
    size
  );

  tft.setTextColor(
    color,
    C_BG
  );

  tft.setTextWrap(
    false
  );

  int16_t x1;
  int16_t y1;

  uint16_t w;
  uint16_t h;

  tft.getTextBounds(
    text,
    0,
    y,
    &x1,
    &y1,
    &w,
    &h
  );

  int x =
    (
      SCREEN_W -
      static_cast<int>(w)
    ) /
    2;

  if (
    x < 0
  ) {
    x = 0;
  }

  tft.setCursor(
    x,
    y
  );

  tft.print(
    text
  );
}

void label(
  const String& text,
  int x,
  int y,
  uint8_t size,
  uint16_t color
) {
  tft.setTextSize(
    size
  );

  tft.setTextColor(
    color,
    C_BG
  );

  tft.setCursor(
    x,
    y
  );

  tft.print(
    text
  );
}

// ============================================================
// UI COMPONENTS
// ============================================================

void drawHeader() {
  tft.fillRect(
    0,
    0,
    240,
    34,
    C_PANEL
  );

  label(
    "KALOO",
    10,
    10,
    2,
    C_TEXT
  );

  String name =
    clip(
      tableName,
      12
    );

  tft.setTextSize(
    1
  );

  int16_t x1;
  int16_t y1;

  uint16_t w;
  uint16_t h;

  tft.getTextBounds(
    name,
    0,
    0,
    &x1,
    &y1,
    &w,
    &h
  );

  tft.setTextColor(
    C_CYAN,
    C_PANEL
  );

  tft.setCursor(
    230 - w,
    13
  );

  tft.print(
    name
  );

  uint16_t dotColor =
    authOk
      ? C_GREEN
      : C_RED;

  tft.fillCircle(
    225,
    27,
    3,
    dotColor
  );
}

void drawStatusPill(
  const String& text,
  uint16_t color
) {
  tft.fillRoundRect(
    18,
    48,
    204,
    42,
    10,
    color
  );

  tft.setTextColor(
    C_BG,
    color
  );

  tft.setTextSize(
    2
  );

  int16_t x1;
  int16_t y1;

  uint16_t w;
  uint16_t h;

  tft.getTextBounds(
    text,
    0,
    0,
    &x1,
    &y1,
    &w,
    &h
  );

  tft.setCursor(
    (
      240 -
      static_cast<int>(w)
    ) /
    2,
    61
  );

  tft.print(
    text
  );
}

void drawReservationCard() {
  if (
    !reservationIsToday()
  ) {
    return;
  }

  tft.fillRoundRect(
    10,
    186,
    220,
    44,
    8,
    C_PANEL
  );

  label(
    "RESERVASI",
    18,
    194,
    1,
    C_YELLOW
  );

  label(
    reservationClock(),
    18,
    208,
    2,
    C_TEXT
  );

  label(
    clip(
      reservationName,
      15
    ),
    92,
    211,
    1,
    C_MUTED
  );
}

int orderStep() {
  if (
    orderStatus ==
    "pending"
  ) {
    return 0;
  }

  if (
    orderStatus ==
    "confirmed"
  ) {
    return 1;
  }

  if (
    orderStatus ==
    "preparing"
  ) {
    return 2;
  }

  if (
    orderStatus ==
    "ready"
  ) {
    return 3;
  }

  return -1;
}

void drawOrderProgress() {
  const int current =
    orderStep();

  if (
    current < 0
  ) {
    return;
  }

  const int startX =
    36;

  const int gap =
    56;

  const int y =
    161;

  for (
    int i = 0;
    i < 4;
    i++
  ) {
    if (
      i < 3
    ) {
      tft.drawFastHLine(
        startX +
          i * gap,
        y,
        gap,
        i < current
          ? C_CYAN
          : C_MUTED
      );
    }

    tft.fillCircle(
      startX +
        i * gap,
      y,
      5,
      i <= current
        ? C_CYAN
        : C_MUTED
    );
  }

  const char* labels[] = {
    "NEW",
    "OK",
    "COOK",
    "READY"
  };

  for (
    int i = 0;
    i < 4;
    i++
  ) {
    String text =
      labels[i];

    tft.setTextSize(
      1
    );

    tft.setTextColor(
      i <= current
        ? C_TEXT
        : C_MUTED,
      C_BG
    );

    int16_t x1;
    int16_t y1;

    uint16_t w;
    uint16_t h;

    tft.getTextBounds(
      text,
      0,
      0,
      &x1,
      &y1,
      &w,
      &h
    );

    tft.setCursor(
      startX +
        i * gap -
        w / 2,
      171
    );

    tft.print(
      text
    );
  }
}

// ============================================================
// SCREENS
// ============================================================

void renderBoot() {
  tft.fillScreen(
    C_BG
  );

  centerText(
    "KALOO",
    78,
    4,
    C_TEXT
  );

  centerText(
    "SMART TABLE",
    124,
    2,
    C_CYAN
  );

  centerText(
    "Starting...",
    158,
    1,
    C_MUTED
  );
}

void renderWifiSetup() {
  tft.fillScreen(
    C_BG
  );

  centerText(
    "SETUP WIFI",
    34,
    3,
    C_YELLOW
  );

  centerText(
    "Connect ke",
    86,
    1,
    C_MUTED
  );

  centerText(
    "KALOO-IOT-",
    106,
    2,
    C_TEXT
  );

  centerText(
    apHex,
    132,
    2,
    C_CYAN
  );

  centerText(
    "PASSWORD",
    174,
    1,
    C_MUTED
  );

  centerText(
    apHex,
    194,
    2,
    C_YELLOW
  );
}

void renderOffline() {
  tft.fillScreen(
    C_BG
  );

  drawHeader();

  if (
    blinkFrame
  ) {
    tft.fillCircle(
      120,
      88,
      22,
      C_RED
    );
  } else {
    tft.drawCircle(
      120,
      88,
      22,
      C_RED
    );
  }

  centerText(
    "OFFLINE",
    122,
    3,
    C_RED
  );

  centerText(
    "Connecting to server",
    164,
    1,
    C_MUTED
  );

  centerText(
    String(IOT_SERVER_HOST),
    184,
    1,
    C_CYAN
  );
}

void renderAvailable() {
  tft.fillScreen(
    C_BG
  );

  drawHeader();

  drawStatusPill(
    "AVAILABLE",
    C_GREEN
  );

  centerText(
    "Silakan digunakan",
    113,
    2,
    C_TEXT
  );

  centerText(
    "Scan QR untuk memesan",
    143,
    1,
    C_MUTED
  );

  if (
    reservationIsToday()
  ) {
    drawReservationCard();
  } else {
    centerText(
      "No reservation today",
      206,
      1,
      C_MUTED
    );
  }
}

void renderReserved() {
  /*
   * table_list boleh tetap status = 3 untuk reservation masa depan,
   * tetapi device hanya menampilkan RESERVED pada hari reservasinya.
   */
  if (
    !reservationIsToday()
  ) {
    renderAvailable();

    return;
  }

  tft.fillScreen(
    C_BG
  );

  drawHeader();

  drawStatusPill(
    "RESERVED",
    C_YELLOW
  );

  centerText(
    reservationClock(),
    108,
    4,
    C_TEXT
  );

  centerText(
    clip(
      reservationName,
      20
    ),
    153,
    2,
    C_CYAN
  );

  centerText(
    "Meja telah dipesan",
    192,
    1,
    C_MUTED
  );
}

void renderReady() {
  tft.fillScreen(
    C_BG
  );

  drawHeader();

  uint16_t readyColor =
    blinkFrame
      ? C_CYAN
      : C_BLUE;

  tft.fillRoundRect(
    12,
    45,
    216,
    76,
    12,
    readyColor
  );

  tft.setTextColor(
    C_TEXT,
    readyColor
  );

  tft.setTextSize(
    3
  );

  String readyText =
    blinkFrame
      ? "READY!"
      : "ORDER READY";

  int16_t x1;
  int16_t y1;

  uint16_t w;
  uint16_t h;

  tft.getTextBounds(
    readyText,
    0,
    0,
    &x1,
    &y1,
    &w,
    &h
  );

  tft.setCursor(
    (
      240 -
      static_cast<int>(w)
    ) /
    2,
    68
  );

  tft.print(
    readyText
  );

  centerText(
    clip(
      orderCode,
      16
    ),
    133,
    2,
    C_TEXT
  );

  centerText(
    "Pesanan sudah siap",
    158,
    1,
    C_GREEN
  );

  drawReservationCard();
}

void renderOccupied() {
  /*
   * Layar READY mengikuti lifecycle order.
   * Pager manual hanya membunyikan buzzer + LED biru dan tidak
   * memalsukan status order pada layar.
   */
  if (
    orderStatus ==
    "ready"
  ) {
    renderReady();

    return;
  }

  tft.fillScreen(
    C_BG
  );

  drawHeader();

  if (
    paymentStatus ==
    "1"
  ) {
    drawStatusPill(
      "WAITING PAYMENT",
      C_ORANGE
    );
  } else {
    drawStatusPill(
      "OCCUPIED",
      C_RED
    );
  }

  if (
    orderCode.length()
  ) {
    centerText(
      clip(
        orderCode,
        18
      ),
      105,
      3,
      C_TEXT
    );
  }

  String state =
    orderStatus;

  state.toUpperCase();

  if (
    state.length()
  ) {
    centerText(
      state,
      137,
      1,
      C_CYAN
    );
  }

  drawOrderProgress();

  if (
    hasReservation
  ) {
    drawReservationCard();
  }
}

void renderDisabled() {
  tft.fillScreen(
    C_BG
  );

  drawHeader();

  drawStatusPill(
    "DISABLED",
    C_RED
  );

  centerText(
    "Meja tidak aktif",
    126,
    2,
    C_TEXT
  );
}

void renderScreen() {
  screenDirty =
    false;

  if (
    !wifiOk
  ) {
    renderWifiSetup();

    return;
  }

  if (
    !wsOk ||
    !authOk
  ) {
    renderOffline();

    return;
  }

  if (
    tableStatus ==
    "available"
  ) {
    renderAvailable();

    return;
  }

  if (
    tableStatus ==
    "occupied"
  ) {
    renderOccupied();

    return;
  }

  if (
    tableStatus ==
    "reserved"
  ) {
    if (
      reservationIsToday()
    ) {
      renderReserved();
    } else {
      /*
       * DB tetap RESERVED, tetapi reservation bukan hari ini.
       * Tampilan device tidak perlu menunjukkan RESERVED.
       */
      renderAvailable();
    }

    return;
  }

  if (
    tableStatus ==
    "disabled"
  ) {
    renderDisabled();

    return;
  }

  tft.fillScreen(
    C_BG
  );

  drawHeader();

  centerText(
    "SYNCING...",
    108,
    2,
    C_CYAN
  );
}

void handleUi() {
  /*
   * Cek perubahan hari secara periodik.
   * Ini membuat reservation besok otomatis muncul setelah tanggal
   * berganti tanpa perlu menunggu snapshot WebSocket baru.
   */
  static unsigned long
    lastReservationDateCheck =
      0;

  static bool
    lastReservationToday =
      false;

  const unsigned long now =
    millis();

  if (
    now -
      lastReservationDateCheck >=
    1000UL
  ) {
    lastReservationDateCheck =
      now;

    const bool reservationToday =
      reservationIsToday();

    if (
      reservationToday !=
      lastReservationToday
    ) {
      lastReservationToday =
        reservationToday;

      screenDirty =
        true;
    }
  }

  const bool animated =
    !wsOk ||
    !authOk ||
    pagerActive ||
    orderStatus ==
      "ready";

  if (
    animated &&
    now -
      lastUiFrame >=
      450
  ) {
    lastUiFrame =
      now;

    blinkFrame =
      !blinkFrame;

    screenDirty =
      true;
  }

  if (
    screenDirty
  ) {
    renderScreen();
  }
}

// ============================================================
// LED
// ============================================================

void setLed(
  int pin,
  bool value
) {
  digitalWrite(
    pin,
    value
      ? HIGH
      : LOW
  );
}

void updateLed(
  const String& mode,
  int pin,
  unsigned long& timer,
  bool& state
) {
  if (
    mode ==
    "off"
  ) {
    state =
      false;

    setLed(
      pin,
      false
    );

    return;
  }

  if (
    mode ==
    "on"
  ) {
    state =
      true;

    setLed(
      pin,
      true
    );

    return;
  }

  const unsigned long interval =
    mode ==
    "fast_blink"
      ? 250
      : 800;

  if (
    millis() -
      timer >=
      interval
  ) {
    timer =
      millis();

    state =
      !state;

    setLed(
      pin,
      state
    );
  }
}

void handleLeds() {
  if (
    !wsOk ||
    !authOk
  ) {
    updateLed(
      "fast_blink",
      LED_RED,
      lastRedBlink,
      redState
    );

    setLed(
      LED_YELLOW,
      false
    );

    setLed(
      LED_BLUE,
      false
    );

    return;
  }

  updateLed(
    redMode,
    LED_RED,
    lastRedBlink,
    redState
  );

  updateLed(
    reservationLedMode(),
    LED_YELLOW,
    lastYellowBlink,
    yellowState
  );

  updateLed(
    blueMode,
    LED_BLUE,
    lastBlueBlink,
    blueState
  );
}

// ============================================================
// BUZZER
// ============================================================

void buzzerStartTone() {
  tone(
    BUZZER_PIN,
    BUZZER_FREQUENCY
  );
}

void buzzerStopTone() {
  noTone(
    BUZZER_PIN
  );
}

/*
 * Delay yang bisa berhenti lebih cepat bila status READY dicabut.
 *
 * Untuk jeda panjang 1300 ms kita cek setiap 20 ms supaya buzzer
 * cepat berhenti ketika order berubah dari READY.
 */
bool buzzerWait(
  uint32_t durationMs,
  bool stopIfPagerOff = true
) {
  const uint32_t startedAt =
    millis();

  while (
    millis() -
      startedAt <
    durationMs
  ) {
    if (
      stopIfPagerOff &&
      !buzzerShouldBuzz
    ) {
      return false;
    }

    vTaskDelay(
      pdMS_TO_TICKS(
        10
      )
    );
  }

  return true;
}

/*
 * Task khusus buzzer.
 *
 * Dipin ke Core 1 dengan priority 2.
 *
 * Pola:
 *
 * BEEP 1 = 140 ms
 * OFF    =  80 ms
 * BEEP 2 = 140 ms
 * OFF    =  80 ms
 * BEEP 3 = 140 ms
 * OFF    =  80 ms
 * BEEP 4 = 140 ms
 * OFF    = 1300 ms
 *
 * Frequency = 500 Hz.
 */
void buzzerTask(
  void* parameter
) {
  (void) parameter;

  for (;;) {
    if (
      !buzzerShouldBuzz
    ) {
      buzzerStopTone();

      vTaskDelay(
        pdMS_TO_TICKS(
          20
        )
      );

      continue;
    }

    for (
      int beepIndex = 0;
      beepIndex < 4;
      beepIndex++
    ) {
      if (
        !buzzerShouldBuzz
      ) {
        break;
      }

      buzzerStartTone();

      /*
       * Selama tone aktif, task tidur sendiri.
       * Main loop, TFT, WebSocket, dan LED tetap berjalan.
       */
      if (
        !buzzerWait(
          BUZZER_ON_MS
        )
      ) {
        buzzerStopTone();
        break;
      }

      buzzerStopTone();

      if (
        !buzzerShouldBuzz
      ) {
        break;
      }

      /*
       * Tiga beep pertama mendapat gap 80 ms.
       * Setelah beep keempat masuk ke jeda loop panjang.
       */
      if (
        beepIndex <
        3
      ) {
        if (
          !buzzerWait(
            BUZZER_GAP_MS
          )
        ) {
          break;
        }
      }
    }

    buzzerStopTone();

    if (
      buzzerShouldBuzz
    ) {
      /*
       * Jeda antar satu kelompok 4 beep.
       * Tetap interruptible supaya READY -> completed
       * bisa menghentikan pager dengan cepat.
       */
      buzzerWait(
        BUZZER_LOOP_PAUSE_MS
      );
    }
  }
}

/*
 * Main loop tidak lagi mengatur timing tone.
 * Ia hanya mengirim state READY ke task buzzer.
 */
void handleBuzzer() {
  /*
   * Buzzer hanya mengikuti pager.active dari gateway.
   *
   * Dengan ini:
   * - order ready + pager false = READY tanpa suara
   * - order ready + pager true  = READY + suara
   * - manual pager true         = suara tanpa mengubah status order
   */
  buzzerShouldBuzz =
    wsOk &&
    authOk &&
    pagerActive;
}

// ============================================================
// SNAPSHOT
// ============================================================

void readSnapshot(
  JsonDocument& doc
) {
  tableName =
    doc["table"]["name"]
      .as<String>();

  tableStatus =
    doc["table"]["status"]
      .as<String>();

  if (
    doc["order"].isNull()
  ) {
    orderCode = "";
    orderStatus = "";
    paymentStatus = "";
    customerName = "";
  } else {
    orderCode =
      doc["order"]["code"]
        .as<String>();

    orderStatus =
      doc["order"]["status"]
        .as<String>();

    paymentStatus =
      doc["order"]["payment_status"]
        .as<String>();

    customerName =
      doc["order"]["customer_name"]
        .as<String>();
  }

  hasReservation =
    !doc["reservation"]
      .isNull();

  if (
    hasReservation
  ) {
    reservationName =
      doc["reservation"]["customer_name"]
        .as<String>();

    reservationStart =
      doc["reservation"]["reserved_start"]
        .as<String>();
  } else {
    reservationName = "";
    reservationStart = "";
  }

  pagerActive =
    doc["pager"]["active"]
      .as<bool>();

  redMode =
    doc["leds"]["red"]
      .as<String>();

  yellowMode =
    doc["leds"]["yellow"]
      .as<String>();

  blueMode =
    doc["leds"]["blue"]
      .as<String>();

  screenDirty =
    true;
}

// ============================================================
// WEBSOCKET
// ============================================================

void sendAuth() {
  JsonDocument doc;

  doc["action"] =
    "auth";

  doc["hex_id"] =
    hexId;

  doc["secret_key"] =
    secretKey;

  String payload;

  serializeJson(
    doc,
    payload
  );

  webSocket.sendTXT(
    payload
  );
}

void handleWsText(
  uint8_t* payload,
  size_t length
) {
  JsonDocument doc;

  if (
    deserializeJson(
      doc,
      payload,
      length
    )
  ) {
    return;
  }

  const String type =
    doc["type"]
      .as<String>();

  if (
    type ==
    "auth.result"
  ) {
    authOk =
      doc["success"]
        .as<bool>();

    wsOk =
      authOk;

    if (
      authOk
    ) {
      webSocket.sendTXT(
        "{\"action\":\"sync\"}"
      );
    }

    screenDirty =
      true;

    return;
  }

  if (
    type ==
    "table.snapshot"
  ) {
    wsOk =
      true;

    authOk =
      true;

    readSnapshot(
      doc
    );
  }
}

void webSocketEvent(
  WStype_t type,
  uint8_t* payload,
  size_t length
) {
  switch (
    type
  ) {
    case WStype_CONNECTED:
      wsOk =
        true;

      authOk =
        false;

      sendAuth();

      screenDirty =
        true;

      break;

    case WStype_DISCONNECTED:
      wsOk =
        false;

      authOk =
        false;

      screenDirty =
        true;

      break;

    case WStype_TEXT:
      handleWsText(
        payload,
        length
      );

      break;

    default:
      break;
  }
}

// ============================================================
// INIT
// ============================================================

void initDisplay() {
  pinMode(
    TFT_RST,
    OUTPUT
  );

  digitalWrite(
    TFT_RST,
    HIGH
  );

  delay(
    40
  );

  digitalWrite(
    TFT_RST,
    LOW
  );

  delay(
    120
  );

  digitalWrite(
    TFT_RST,
    HIGH
  );

  delay(
    180
  );

  SPI.end();

  SPI.begin(
    TFT_SCLK,
    -1,
    TFT_MOSI,
    -1
  );

  tft.init(
    240,
    240,
    SPI_MODE3
  );

  tft.setRotation(
    2
  );

  tft.setTextWrap(
    false
  );

  renderBoot();
}

void initLeds() {
  pinMode(
    LED_RED,
    OUTPUT
  );

  pinMode(
    LED_YELLOW,
    OUTPUT
  );

  pinMode(
    LED_BLUE,
    OUTPUT
  );

  setLed(
    LED_RED,
    false
  );

  setLed(
    LED_YELLOW,
    false
  );

  setLed(
    LED_BLUE,
    false
  );
}

void initBuzzer() {
  pinMode(
    BUZZER_PIN,
    OUTPUT
  );

  buzzerShouldBuzz =
    false;

  buzzerStopTone();
}

void startBuzzerTask() {
  if (
    buzzerTaskHandle !=
    nullptr
  ) {
    return;
  }

  const BaseType_t taskResult =
    xTaskCreatePinnedToCore(
      buzzerTask,
      "KalooBuzzer",
      2048,
      nullptr,
      2,
      &buzzerTaskHandle,
      1
    );

  if (
    taskResult !=
    pdPASS
  ) {
    buzzerTaskHandle =
      nullptr;

    Serial.println(
      "[BUZZER] Gagal membuat BuzzerTask"
    );

    return;
  }

  Serial.println(
    "[BUZZER] Task aktif di Core 1"
  );
}

void connectWifi() {
  const String ssid =
    "KALOO-IOT-" +
    apHex;

  renderWifiSetup();

  WiFiManager wm;

  const bool connected =
    wm.autoConnect(
      ssid.c_str(),
      apHex.c_str()
    );

  if (
    !connected
  ) {
    ESP.restart();
  }

  wifiOk =
    true;

  screenDirty =
    true;
}

void connectWebSocket() {
  webSocket.begin(
    IOT_SERVER_HOST,
    IOT_SERVER_PORT,
    IOT_WS_PATH
  );

  webSocket.onEvent(
    webSocketEvent
  );

  webSocket.setReconnectInterval(
    3000
  );
}

// ============================================================
// SETUP / LOOP
// ============================================================

void setup() {
  Serial.begin(
    115200
  );

  initLeds();
  initBuzzer();
  initDisplay();

  startBuzzerTask();

  WiFi.mode(
    WIFI_STA
  );

  delay(
    100
  );

  hexId =
    getHexId();

  apHex =
    removeColon(
      hexId
    );

  secretKey =
    generateSecret(
      hexId
    );

  if (
    secretKey.length() !=
    64
  ) {
    centerText(
      "AUTH ERROR",
      108,
      2,
      C_RED
    );

    while (
      true
    ) {
      delay(
        1000
      );
    }
  }

  delay(3500);

  connectWifi();

  configTime(
    0,
    0,
    "pool.ntp.org",
    "time.google.com"
  );

  connectWebSocket();
}

void loop() {
  webSocket.loop();

  wifiOk =
    WiFi.status() ==
    WL_CONNECTED;

  if (
    !wifiOk
  ) {
    wsOk =
      false;

    authOk =
      false;
  }

  handleLeds();
  handleBuzzer();
  handleUi();

  delay(
    2
  );
}
