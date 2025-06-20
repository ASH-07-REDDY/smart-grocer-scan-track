
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
float calibration_factor = 2280.0;
String sensorId = "ESP32_SCALE_001";
String userId = "3424388f-d99f-4e58-b319-bfaefabbe350"; // Replace with actual user ID
String currentBarcode = "";
String currentProductName = "";
bool calibrationMode = false;

// Timing variables
unsigned long lastWeightSend = 0;
const unsigned long SEND_INTERVAL = 2000; // Send data every 2 seconds
float lastSentWeight = 0;
const float WEIGHT_THRESHOLD = 5; // Send if weight changes by more than 5g

void setup() {
  Serial.begin(115200);
  Serial.println("Smart Scale with Serial Barcode Input v2.0");
  Serial.println("Commands: 'c' = calibration, 'r' = reset, or enter barcode");

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Scale v2.0");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  
  // Initialize WiFi
  connectToWiFi();
  
  // Initialize HX711
  initializeScale();
  
  Serial.println("=== SYSTEM READY ===");
  Serial.println("Enter barcode and place item on scale");
  displayReady();
}

void loop() {
  // Handle serial commands and barcode input
  handleSerialInput();
  
  if (!calibrationMode) {
    // Get current weight
    float currentWeight = getCurrentWeight();
    
    // Display weight and product info
    displayWeightAndProduct(currentWeight);
    
    // Send data to Supabase if conditions are met and we have a barcode
    if (shouldSendData(currentWeight) && currentBarcode != "") {
      sendWeightToSupabase(currentWeight);
      lastSentWeight = currentWeight;
      lastWeightSend = millis();
    }
  }

  delay(500);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(1000);
    Serial.print(".");
    lcd.setCursor(0, 1);
    lcd.print("WiFi connecting.");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    lcd.setCursor(0, 1);
    lcd.print("WiFi connected! ");
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    lcd.setCursor(0, 1);
    lcd.print("WiFi failed!    ");
  }
  delay(2000);
}

void initializeScale() {
  scale.begin(DT, SKC);
  
  // Wait for HX711 to be ready
  int attempts = 0;
  while (!scale.is_ready() && attempts < 10) {
    Serial.println("Waiting for HX711...");
    lcd.setCursor(0, 1);
    lcd.print("Scale not ready ");
    delay(1000);
    attempts++;
  }
  
  if (scale.is_ready()) {
    scale.set_scale(calibration_factor);
    delay(2000);
    scale.tare();
    Serial.println("Scale initialized and tared");
    Serial.println("Calibration factor: " + String(calibration_factor));
  } else {
    Serial.println("Scale initialization failed!");
    lcd.setCursor(0, 1);
    lcd.print("Scale failed!   ");
  }
}

void handleSerialInput() {
  if (Serial.available()) {
    String input = Serial.readString();
    input.trim();
    
    if (input == "c" || input == "C") {
      enterCalibrationMode();
    } else if (input == "r" || input == "R") {
      resetSystem();
    } else if (input.length() >= 8 && input.length() <= 13) {
      // Assume it's a barcode
      processBarcode(input);
    } else if (calibrationMode) {
      handleCalibrationInput(input);
    }
  }
}

void processBarcode(String barcode) {
  barcode.trim();
  Serial.println("Barcode entered: " + barcode);
  
  currentBarcode = barcode;
  
  // Look up product information
  lookupProductInfo(barcode);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Barcode set:");
  lcd.setCursor(0, 1);
  lcd.print(barcode.substring(0, 16));
  delay(2000);
  
  Serial.println("Now place item on scale...");
}

void lookupProductInfo(String barcode) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - cannot lookup product");
    return;
  }
  
  HTTPClient http;
  http.begin(String(supabaseUrl) + "/rest/v1/barcode_products?barcode=eq." + barcode);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    // Parse JSON response
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    if (doc.size() > 0) {
      currentProductName = doc[0]["product_name"].as<String>();
      Serial.println("Product found: " + currentProductName);
    } else {
      Serial.println("Product not found in database");
      currentProductName = "Unknown Product";
    }
  } else {
    Serial.println("Failed to lookup product: " + String(httpResponseCode));
    currentProductName = "Lookup Failed";
  }
  
  http.end();
}

float getCurrentWeight() {
  if (!scale.is_ready()) {
    return 0.0;
  }
  
  // Get average of 3 readings for stability
  float weight = scale.get_units(3);
  float weightGrams = weight * 1000;
  
  // Filter out negative weights and very small weights (noise)
  if (weightGrams < 0 || weightGrams < 2) {
    weightGrams = 0;
  }
  
  return weightGrams;
}

void displayWeightAndProduct(float weight) {
  // Display product name or barcode on first line
  lcd.setCursor(0, 0);
  if (currentProductName != "" && currentProductName != "Unknown Product") {
    lcd.print("                "); // Clear line
    lcd.setCursor(0, 0);
    lcd.print(currentProductName.substring(0, 16));
  } else if (currentBarcode != "") {
    lcd.print("                "); // Clear line
    lcd.setCursor(0, 0);
    lcd.print("BC:" + currentBarcode.substring(0, 13));
  } else {
    lcd.print("Enter barcode   ");
  }
  
  // Display weight on second line
  lcd.setCursor(0, 1);
  lcd.print("                "); // Clear line
  lcd.setCursor(0, 1);
  
  if (weight < 1000) {
    lcd.print(String(weight, 1) + "g");
  } else {
    lcd.print(String(weight / 1000, 2) + "kg");
  }
  
  // Show WiFi status
  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(14, 1);
    lcd.print("W");
  }
  
  // Show data transmission indicator
  if (millis() - lastWeightSend < 1000) {
    lcd.setCursor(15, 1);
    lcd.print("S");
  }
}

bool shouldSendData(float currentWeight) {
  // Send data if:
  // 1. We have a barcode AND
  // 2. Enough time has passed AND
  // 3. Weight has changed significantly OR it's the first reading
  return (currentBarcode != "") &&
         (millis() - lastWeightSend > SEND_INTERVAL) && 
         (abs(currentWeight - lastSentWeight) > WEIGHT_THRESHOLD || lastWeightSend == 0);
}

void sendWeightToSupabase(float weightGrams) {
  if (WiFi.status() != WL_CONNECTED || currentBarcode == "") {
    Serial.println("Cannot send data - WiFi disconnected or no barcode");
    return;
  }

  HTTPClient http;
  http.begin(String(supabaseUrl) + "/functions/v1/esp32-weight-receiver");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));

  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["sensor_id"] = sensorId;
  doc["user_id"] = userId;
  doc["weight_value"] = weightGrams;
  doc["barcode"] = currentBarcode;
  doc["weight_unit"] = "grams";
  doc["signal_strength"] = WiFi.RSSI();
  doc["battery_level"] = 85; // Static for now
  doc["temperature"] = 22.5; // Static for now
  
  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("Sending weight data: " + String(weightGrams) + "g for barcode: " + currentBarcode);

  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    if (httpResponseCode == 200) {
      Serial.println("Data sent successfully!");
      lcd.setCursor(15, 1);
      lcd.print("✓");
    } else {
      Serial.println("Error response (" + String(httpResponseCode) + "): " + response);
    }
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
  }
  
  http.end();
}

void enterCalibrationMode() {
  calibrationMode = true;
  Serial.println("\n=== CALIBRATION MODE ===");
  Serial.println("1. Remove all weight from scale");
  Serial.println("2. Send 't' to tare (zero)");
  Serial.println("3. Place known weight (e.g., 100g, 500g, 1kg)");
  Serial.println("4. Send weight value in grams (e.g., 100, 500, 1000)");
  Serial.println("5. Send 'e' to exit calibration");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibration Mode");
  lcd.setCursor(0, 1);
  lcd.print("Check Serial...");
}

void handleCalibrationInput(String input) {
  if (input == "t" || input == "T") {
    scale.tare();
    Serial.println("Scale tared (zeroed)");
    lcd.setCursor(0, 1);
    lcd.print("Tared!         ");
  }
  else if (input == "e" || input == "E") {
    calibrationMode = false;
    Serial.println("Exiting calibration mode");
    Serial.println("New calibration factor: " + String(calibration_factor));
    displayReady();
  }
  else {
    float knownWeight = input.toFloat();
    if (knownWeight > 0) {
      float reading = scale.get_units(10);
      if (reading != 0) {
        calibration_factor = reading / (knownWeight / 1000.0);
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
  
  // Show current reading during calibration
  if (calibrationMode) {
    float currentReading = scale.get_units(1) * 1000;
    Serial.print("Current reading: ");
    Serial.print(currentReading, 1);
    Serial.println("g");
  }
}

void resetSystem() {
  Serial.println("=== SYSTEM RESET ===");
  currentBarcode = "";
  currentProductName = "";
  lastSentWeight = 0;
  lastWeightSend = 0;
  
  scale.tare();
  
  Serial.println("System reset complete");
  Serial.println("Enter a barcode to start weighing");
  displayReady();
}

void displayReady() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Enter Barcode");
  lcd.setCursor(0, 1);
  lcd.print("via Serial...");
}
