#if __has_include("config.h")
#include "config.h"
#else
#include "config.example.h"
#endif
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <BlynkSimpleEsp32_SSL.h>
#include <ArduinoJson.h>
#include "tls-root.h"

constexpr int POT_PIN = 34, BUTTON_PIN = 27, LED_PIN = 26;
constexpr uint32_t SAMPLE_MS = 10000;
portMUX_TYPE counterMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t presses = 0;
volatile uint32_t lastPressTick = 0;
QueueHandle_t samples;
char sessionId[33];
uint32_t sequence = 0, lastSample = 0, lastConnectAttempt = 0;
struct Sample { uint32_t sequence, presses; int raw; bool pressed, led; float interval; };

// Interrupção evita perder cliques enquanto uma conexão TLS está sendo negociada.
void IRAM_ATTR buttonInterrupt() {
  uint32_t tick = xTaskGetTickCountFromISR();
  portENTER_CRITICAL_ISR(&counterMux);
  if (tick - lastPressTick >= pdMS_TO_TICKS(60)) { presses++; lastPressTick = tick; }
  portEXIT_CRITICAL_ISR(&counterMux);
}
BLYNK_WRITE(V2) { digitalWrite(LED_PIN, param.asInt() ? HIGH : LOW); }
BLYNK_CONNECTED() { Blynk.syncVirtual(V2); }

// Worker de HTTPS: o loop de sensores/Blynk continua durante o envio e as tentativas.
void uploadWorker(void *) {
  Sample sample;
  for (;;) {
    if (xQueueReceive(samples, &sample, portMAX_DELAY) != pdTRUE) continue;
    JsonDocument doc;
    doc["sessionId"] = sessionId; doc["sequence"] = sample.sequence;
    doc["analogRaw"] = sample.raw; doc["buttonPressed"] = sample.pressed;
    doc["buttonPresses"] = sample.presses; doc["intervalSeconds"] = sample.interval;
    doc["ledOn"] = sample.led; doc["source"] = DATA_SOURCE;
    String payload; serializeJson(doc, payload);
    bool accepted = false;
    for (int attempt = 0; attempt < 3 && !accepted; attempt++) {
      if (WiFi.status() == WL_CONNECTED && time(nullptr) > 1700000000) {
        WiFiClientSecure client; client.setCACert(API_ROOT_CA); client.setHandshakeTimeout(8);
        HTTPClient http; http.setTimeout(8000);
        String url = String(API_BASE) + "/api/v1/devices/" + DEVICE_ID + "/telemetry";
        if (http.begin(client, url)) {
          http.addHeader("Content-Type", "application/json"); http.addHeader("X-Device-Token", DEVICE_TOKEN);
          int code = http.POST(payload);
          accepted = code == 200 || code == 201;
          Serial.printf("Amostra %lu: HTTP %d\n", (unsigned long)sample.sequence, code);
          http.end();
        }
      }
      if (!accepted) vTaskDelay(pdMS_TO_TICKS(2000));
    }
    if (!accepted) Serial.println("Amostra descartada após 3 tentativas; lacuna no histórico.");
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(POT_PIN, INPUT); pinMode(BUTTON_PIN, INPUT_PULLUP); pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); analogReadResolution(12);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonInterrupt, FALLING);
  snprintf(sessionId, sizeof(sessionId), "%08lx%08lx%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random(), (unsigned long)esp_random(), (unsigned long)esp_random());
  samples = xQueueCreate(18, sizeof(Sample));
  if (!samples) { Serial.println("Sem memória para fila."); while (true) delay(1000); }
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS); WiFi.setAutoReconnect(true);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Blynk.config(BLYNK_AUTH_TOKEN, BLYNK_HOST, 443);
  xTaskCreatePinnedToCore(uploadWorker, "telemetry", 12288, nullptr, 1, nullptr, 0);
  lastSample = millis();
  Serial.println("Invista+: potenciômetro GPIO34, botão GPIO27, LED GPIO26.");
}
void loop() {
  const uint32_t now = millis();
  if (WiFi.status() == WL_CONNECTED && time(nullptr) > 1700000000) {
    if (Blynk.connected()) Blynk.run();
    else if (now - lastConnectAttempt >= 15000) { lastConnectAttempt = now; Blynk.connect(1000); }
  }
  const uint32_t sampleNow = millis();
  if (sampleNow - lastSample >= SAMPLE_MS) {
    Sample s; s.sequence = sequence++; s.raw = analogRead(POT_PIN);
    s.pressed = digitalRead(BUTTON_PIN) == LOW; s.led = digitalRead(LED_PIN) == HIGH;
    s.interval = (sampleNow - lastSample) / 1000.0f; lastSample = sampleNow;
    portENTER_CRITICAL(&counterMux); s.presses = presses; presses = 0; portEXIT_CRITICAL(&counterMux);
    if (xQueueSend(samples, &s, 0) != pdTRUE) Serial.println("Fila cheia; amostra descartada.");
    int risk = round(s.raw * 100.0 / 4095.0);
    if (Blynk.connected()) {
      Blynk.virtualWrite(V0, risk); Blynk.virtualWrite(V1, s.pressed ? 1 : 0);
      Blynk.virtualWrite(V3, s.presses); Blynk.virtualWrite(V4, s.raw); Blynk.virtualWrite(V5, s.led ? 1 : 0);
    }
    Serial.printf("ADC=%d risco=%d cliques=%lu LED=%d\n", s.raw, risk, (unsigned long)s.presses, s.led);
  }
  delay(5);
}
