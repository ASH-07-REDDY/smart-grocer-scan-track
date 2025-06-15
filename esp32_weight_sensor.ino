#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "https://yzcpouogmvmfycnrauqr.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y3BvdW9nbXZtZnljbnJhdXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODc5NzYsImV4cCI6MjA2NTA2Mzk3Nn0.hm2DajmHYlXRzyTLxnpCK90u-C1OmaDY9K6AtiaStrI";

// HX711 pins
#define DT 2    // DOUT to GPIO2
#define SCK 4   // SCK to GPIO4

// LCD I2C address (usually 0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// HX711 object
HX711 scale;

// Configuration
float calibration_factor = 2280.0;
String sensorId = "ESP32_SCALE_001"; // Unique sensor ID
String userId = "YOUR_USER_ID"; // Replace with actual user ID
String productId = ""; // Will be set when product is detected
String currentBarcode = ""; // Current product barcode

// Timing variables
unsigned long lastWeightSend = 0;
const unsigned long SEND_INTERVAL = 5000; // Send data every 5 seconds
float lastSentWeight = 0;
const float WEIGHT_THRESHOLD = 0.05; // Only send if weight changes by more than 50g

void setup() {
  Serial.begin(115200);
  Serial.println("Smart Scale with Supabase Integration");

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Scale v1.0");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  
  // Initialize WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
    lcd.setCursor(0, 1);
    lcd.print("WiFi connecting.");
  }
  
  Serial.println("WiFi connected!");
  lcd.setCursor(0, 1);
  lcd.print("WiFi connected! ");
  delay(1000);

  // Initialize HX711
  scale.begin(DT, SCK);

  // Wait for HX711 to be ready
  while (!scale.is_ready()) {
    Serial.println("Waiting for HX711...");
    lcd.setCursor(0, 1);
    lcd.print("Sensor not ready");
    delay(500);
  }

  // Set the scale factor
  scale.set_scale(calibration_factor);

  // Allow time to stabilize before taring
  delay(2000);
  scale.tare();

  Serial.println("Sensor Ready and Tared");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Sensor Ready");
  lcd.setCursor(0, 1);
  lcd.print("Place product...");
  delay(1500);
}

void loop() {
  // Get the average weight (over 5 readings)
  float weight = scale.get_units(5);
  
  // Convert to grams for better precision
  float weightGrams = weight * 1000;

  // Display current weight
  displayWeight(weightGrams);

  // Check if we should send data to Supabase
  if (shouldSendData(weightGrams)) {
    sendWeightToSupabase(weightGrams);
    lastSentWeight = weightGrams;
    lastWeightSend = millis();
  }

  delay(1000);
}

void displayWeight(float weightGrams) {
  // Print to Serial Monitor
  Serial.print("Weight: ");
  Serial.print(weightGrams, 1);
  Serial.println(" grams");

  // Display on LCD
  lcd.setCursor(0, 0);
  if (currentBarcode != "") {
    lcd.print("Product detected");
  } else {
    lcd.print("Weight:         ");
  }
  
  lcd.setCursor(0, 1);
  lcd.print("               "); // Clear line
  lcd.setCursor(0, 1);
  if (weightGrams < 1000) {
    lcd.print(weightGrams, 1);
    lcd.print("g");
  } else {
    lcd.print(weightGrams / 1000, 2);
    lcd.print("kg");
  }
  
  // Show WiFi status
  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(13, 1);
    lcd.print("W");
  }
}

bool shouldSendData(float currentWeight) {
  // Send data if:
  // 1. Enough time has passed AND
  // 2. Weight has changed significantly OR
  // 3. It's the first reading
  return (millis() - lastWeightSend > SEND_INTERVAL) && 
         (abs(currentWeight - lastSentWeight) > WEIGHT_THRESHOLD || lastWeightSend == 0);
}

void sendWeightToSupabase(float weightGrams) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(String(supabaseUrl) + "/rest/v1/weights");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Prefer", "return=minimal");

  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["sensor_id"] = sensorId;
  doc["user_id"] = userId;
  doc["weight_value"] = weightGrams;
  doc["unit"] = "grams";
  
  // Add product_id if we have a barcode
  if (productId != "") {
    doc["product_id"] = productId;
  }
  
  // Add sensor metadata
  doc["signal_strength"] = WiFi.RSSI();
  doc["battery_level"] = 85; // You can add actual battery monitoring
  
  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("Sending to Supabase: " + jsonString);

  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    if (httpResponseCode == 201) {
      Serial.println("Data sent successfully!");
      lcd.setCursor(15, 0);
      lcd.print("✓");
    } else {
      Serial.println("Error response: " + response);
    }
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}

// Function to set product information (call this when barcode is scanned)
void setProduct(String barcode, String prodId) {
  currentBarcode = barcode;
  productId = prodId;
  Serial.println("Product set: " + barcode + " (ID: " + prodId + ")");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Product: ");
  lcd.print(barcode.substring(0, 7));
  delay(2000);
}

// Function to clear current product
void clearProduct() {
  currentBarcode = "";
  productId = "";
  Serial.println("Product cleared");
}