#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Aashrith";
const char* password = "aashrith0206";

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
float calibration_factor = 2280.0; // Common starting value - adjust as needed
String sensorId = "ESP32_SCALE_001"; // Unique sensor ID
String userId = "YOUR_USER_ID"; // Replace with actual user ID
String productId = ""; // Will be set when product is detected
String currentBarcode = ""; // Current product barcode
bool calibrationMode = false;

// Timing variables
unsigned long lastWeightSend = 0;
const unsigned long SEND_INTERVAL = 5000; // Send data every 5 seconds
float lastSentWeight = 0;
const float WEIGHT_THRESHOLD = 50; // Only send if weight changes by more than 50g

void setup() {
  Serial.begin(115200);
  Serial.println("Smart Scale with Supabase Integration");
  Serial.println("Send 'c' to enter calibration mode");

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
  Serial.println("Current calibration factor: " + String(calibration_factor));
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Sensor Ready");
  lcd.setCursor(0, 1);
  lcd.print("Place product...");
  delay(1500);
}

void loop() {
  // Check for calibration command
  if (Serial.available()) {
    char command = Serial.read();
    if (command == 'c' || command == 'C') {
      enterCalibrationMode();
      return;
    }
  }

  if (!calibrationMode) {
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
  }

  delay(1000);
}

void enterCalibrationMode() {
  calibrationMode = true;
  Serial.println("\n=== CALIBRATION MODE ===");
  Serial.println("1. Remove all weight from scale");
  Serial.println("2. Send 't' to tare (zero)");
  Serial.println("3. Place known weight (e.g., 100g, 500g, 1kg)");
  Serial.println("4. Send weight value (e.g., 100, 500, 1000)");
  Serial.println("5. Send 'e' to exit calibration");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibration Mode");
  lcd.setCursor(0, 1);
  lcd.print("Check Serial...");

  while (calibrationMode) {
    if (Serial.available()) {
      String input = Serial.readString();
      input.trim();
      
      if (input == "t" || input == "T") {
        scale.tare();
        Serial.println("Scale tared (zeroed)");
        lcd.setCursor(0, 1);
        lcd.print("Tared!         ");
      }
      else if (input == "e" || input == "E") {
        calibrationMode = false;
        Serial.println("Exiting calibration mode");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Calibration Done");
        lcd.setCursor(0, 1);
        lcd.print("Factor: " + String(calibration_factor, 0));
        delay(2000);
      }
      else {
        // Try to parse as weight value
        float knownWeight = input.toFloat();
        if (knownWeight > 0) {
          float reading = scale.get_units(10);
          if (reading != 0) {
            calibration_factor = reading / (knownWeight / 1000.0); // Convert grams to kg
            scale.set_scale(calibration_factor);
            Serial.println("Known weight: " + String(knownWeight) + "g");
            Serial.println("Raw reading: " + String(reading));
            Serial.println("New calibration factor: " + String(calibration_factor));
            Serial.println("Test reading: " + String(scale.get_units(5) * 1000) + "g");
          } else {
            Serial.println("Error: No weight detected");
          }
        }
      }
    }
    
    // Show current reading during calibration
    float currentReading = scale.get_units(1) * 1000;
    Serial.print("Current: ");
    Serial.print(currentReading, 1);
    Serial.println("g");
    delay(1000);
  }
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
  // Use the ESP32 weight receiver edge function
  http.begin(String(supabaseUrl) + "/functions/v1/esp32-weight-receiver");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);

  // Create JSON payload for the edge function
  DynamicJsonDocument doc(1024);
  doc["sensor_id"] = sensorId;
  doc["user_id"] = userId;
  doc["weight_value"] = weightGrams;
  
  // Use a demo barcode if no specific product is set
  // You can modify this to cycle through test barcodes or use barcode scanner
  String testBarcodes[] = {"123456789012", "234567890123", "345678901234"};
  String barcode = testBarcodes[millis() / 30000 % 3]; // Change every 30 seconds
  doc["barcode"] = barcode;
  
  // Add sensor metadata
  doc["signal_strength"] = WiFi.RSSI();
  doc["battery_level"] = 85; // You can add actual battery monitoring
  doc["temperature"] = 22.5; // You can add temperature sensor
  
  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("Sending to Edge Function: " + jsonString);

  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    if (httpResponseCode == 200) {
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