#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <LiquidCrystal_I2C.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "https://yzcpouogmvmfycnrauqr.supabase.co";
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y3BvdW9nbXZtZnljbnJhdXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODc5NzYsImV4cCI6MjA2NTA2Mzk3Nn0.hm2DajmHYlXRzyTLxnpCK90u-C1OmaDY9K6AtiaStrI";

// HX711 pins
const int LOADCELL_DOUT_PIN = 2;
const int LOADCELL_SCK_PIN = 3;

// LCD setup (I2C address 0x27, 16 chars, 2 lines)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// HX711 setup
HX711 scale;

// Configuration
const float CALIBRATION_FACTOR = -7050.0; // Adjust this value for your load cell
const String SENSOR_ID = "ESP32_SCALE_001";
const String USER_ID = "your-user-id"; // Replace with actual user ID
const unsigned long SEND_INTERVAL = 5000; // Send data every 5 seconds
const float WEIGHT_THRESHOLD = 5.0; // Minimum weight change to trigger send (grams)

// Variables
float lastWeight = 0.0;
unsigned long lastSendTime = 0;
String currentBarcode = "";

void setup() {
  Serial.begin(115200);
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Initializing...");
  
  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); // Reset scale to 0
  
  // Connect to WiFi
  connectToWiFi();
  
  // Display ready message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready");
  lcd.setCursor(0, 1);
  lcd.print("Place item...");
  
  Serial.println("System ready. Enter barcode via serial or place item on scale.");
}

void loop() {
  // Handle serial input for barcode
  handleSerialInput();
  
  // Read weight
  float currentWeight = getCurrentWeight();
  
  // Display weight on LCD
  displayWeight(currentWeight);
  
  // Send data to Supabase if conditions are met
  if (shouldSendData(currentWeight)) {
    sendWeightToSupabase(currentWeight);
    lastWeight = currentWeight;
    lastSendTime = millis();
  }
  
  delay(500); // Update every 500ms
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    delay(2000);
  } else {
    Serial.println("WiFi connection failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
    delay(2000);
  }
}

void handleSerialInput() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    
    if (input.length() > 0) {
      currentBarcode = input;
      Serial.println("Barcode set: " + currentBarcode);
      
      // Display barcode on LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Barcode:");
      lcd.setCursor(0, 1);
      lcd.print(currentBarcode.substring(0, 16)); // Display first 16 chars
      delay(2000);
    }
  }
}

float getCurrentWeight() {
  if (scale.is_ready()) {
    float weight = scale.get_units(10); // Average of 10 readings
    
    // Filter out negative weights and very small values
    if (weight < 0 || weight < 0.5) {
      weight = 0;
    }
    
    return weight;
  }
  return 0;
}

void displayWeight(float weight) {
  lcd.clear();
  lcd.setCursor(0, 0);
  
  if (currentBarcode.length() > 0) {
    lcd.print("BC:" + currentBarcode.substring(0, 13));
  } else {
    lcd.print("No Barcode");
  }
  
  lcd.setCursor(0, 1);
  if (weight > 0) {
    lcd.print("Weight: ");
    lcd.print(weight, 1);
    lcd.print("g");
  } else {
    lcd.print("No weight");
  }
}

bool shouldSendData(float currentWeight) {
  unsigned long currentTime = millis();
  
  // Send if enough time has passed and weight has changed significantly
  if ((currentTime - lastSendTime >= SEND_INTERVAL) && 
      (abs(currentWeight - lastWeight) >= WEIGHT_THRESHOLD)) {
    return true;
  }
  
  // Send if weight is detected and we have a barcode
  if (currentWeight > 0 && currentBarcode.length() > 0 && lastWeight == 0) {
    return true;
  }
  
  return false;
}

void sendWeightToSupabase(float weightGrams) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }
  
  HTTPClient http;
  http.begin("https://yzcpouogmvmfycnrauqr.supabase.co/functions/v1/esp32-weight-receiver");
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  http.addHeader("apikey", supabaseAnonKey);
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["barcode"] = currentBarcode.length() > 0 ? currentBarcode : "DEMO123";
  doc["weight_value"] = weightGrams;
  doc["sensor_id"] = SENSOR_ID;
  doc["user_id"] = USER_ID;
  doc["weight_unit"] = "grams";
  
  // Add sensor data (optional)
  doc["temperature"] = 25.0; // You can add actual temperature sensor
  doc["battery_level"] = 100; // You can add actual battery monitoring
  doc["signal_strength"] = WiFi.RSSI();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending data: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    // Show success on LCD briefly
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Data Sent!");
    lcd.setCursor(0, 1);
    lcd.print("Code: " + String(httpResponseCode));
    delay(1000);
    
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
    
    // Show error on LCD briefly
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Send Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Error: " + String(httpResponseCode));
    delay(1000);
  }
  
  http.end();
}

// Calibration function (call this when needed)
void calibrateScale() {
  Serial.println("Starting calibration...");
  Serial.println("Remove all weight from scale and send 't' to tare");
  
  while (!Serial.available()) {
    delay(100);
  }
  
  String input = Serial.readStringUntil('\n');
  if (input == "t") {
    scale.tare();
    Serial.println("Scale tared. Place known weight and enter weight in grams:");
    
    while (!Serial.available()) {
      delay(100);
    }
    
    float knownWeight = Serial.parseFloat();
    float reading = scale.get_units(10);
    
    float newCalibration = reading / knownWeight;
    Serial.println("New calibration factor: " + String(newCalibration));
    Serial.println("Update CALIBRATION_FACTOR in code with this value");
  }
}