#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFiManager.h>

// HX711 pins
const int LOADCELL_DOUT_PIN = 2;
const int LOADCELL_SCK_PIN = 3;

// LCD setup (I2C address 0x27, 16 chars, 2 lines)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// HX711 setup
HX711 scale;

// Web server for device configuration
WebServer server(80);

// Preferences for storing device settings
Preferences preferences;

// Configuration
float calibrationFactor = -7050.0;
String deviceId = "";
String deviceToken = "";
String deviceName = "Smart Scale";
String supabaseUrl = "https://yzcpouogmvmfycnrauqr.supabase.co";
String userId = "";
bool deviceRegistered = false;

const unsigned long SEND_INTERVAL = 5000; // Send data every 5 seconds
const float WEIGHT_THRESHOLD = 5.0; // Minimum weight change to trigger send (grams)

// Variables
float lastWeight = 0.0;
unsigned long lastSendTime = 0;
String currentBarcode = "";

void setup() {
  Serial.begin(115200);
  
  // Initialize preferences
  preferences.begin("scale_config", false);
  
  // Load saved configuration
  loadConfiguration();
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Initializing...");
  
  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(calibrationFactor);
  scale.tare(); // Reset scale to 0
  
  // WiFi setup with WiFiManager
  WiFiManager wifiManager;
  
  // Set custom AP name
  String apName = "SmartScale_" + String(ESP.getEfuseMac(), HEX);
  
  if (!wifiManager.autoConnect(apName.c_str())) {
    Serial.println("Failed to connect and hit timeout");
    ESP.restart();
  }
  
  Serial.println("WiFi connected!");
  
  // Start web server for device registration
  setupWebServer();
  
  // Check if device is registered
  if (!deviceRegistered) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Setup Required");
    lcd.setCursor(0, 1);
    lcd.print("Check IP:");
    delay(2000);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(WiFi.localIP().toString());
    Serial.println("Device not registered. Visit: http://" + WiFi.localIP().toString());
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Ready");
    lcd.setCursor(0, 1);
    lcd.print("Place item...");
  }
}

void loop() {
  server.handleClient();
  
  if (!deviceRegistered) {
    delay(1000);
    return;
  }
  
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

void loadConfiguration() {
  deviceId = preferences.getString("device_id", "");
  deviceToken = preferences.getString("device_token", "");
  deviceName = preferences.getString("device_name", "Smart Scale");
  userId = preferences.getString("user_id", "");
  calibrationFactor = preferences.getFloat("cal_factor", -7050.0);
  deviceRegistered = preferences.getBool("registered", false);
  
  if (deviceId == "") {
    // Generate unique device ID
    deviceId = "scale_" + String(ESP.getEfuseMac(), HEX);
    preferences.putString("device_id", deviceId);
  }
}

void saveConfiguration() {
  preferences.putString("device_id", deviceId);
  preferences.putString("device_token", deviceToken);
  preferences.putString("device_name", deviceName);
  preferences.putString("user_id", userId);
  preferences.putFloat("cal_factor", calibrationFactor);
  preferences.putBool("registered", deviceRegistered);
}

void setupWebServer() {
  server.on("/", handleRoot);
  server.on("/register", HTTP_POST, handleRegister);
  server.on("/calibrate", HTTP_POST, handleCalibrate);
  server.on("/status", handleStatus);
  
  server.begin();
  Serial.println("Web server started");
}

void handleRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
    <title>Smart Scale Setup</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 500px; margin: 0 auto; }
        input, button, select { width: 100%; padding: 10px; margin: 5px 0; box-sizing: border-box; }
        button { background-color: #4CAF50; color: white; border: none; cursor: pointer; }
        button:hover { background-color: #45a049; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background-color: #d4edda; color: #155724; }
        .error { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Smart Scale Setup</h1>
        <p>Device ID: )" + deviceId + R"(</p>
        <p>Status: )" + (deviceRegistered ? "Registered" : "Not Registered") + R"(</p>
        
        <form action="/register" method="post">
            <h3>Device Registration</h3>
            <input type="text" name="device_name" placeholder="Device Name" value=")" + deviceName + R"(" required>
            <input type="text" name="user_id" placeholder="User ID" value=")" + userId + R"(" required>
            <button type="submit">Register Device</button>
        </form>
        
        <form action="/calibrate" method="post">
            <h3>Calibration</h3>
            <input type="number" name="known_weight" placeholder="Known Weight (grams)" step="0.1" required>
            <button type="submit">Calibrate</button>
        </form>
        
        <div id="status"></div>
    </div>
</body>
</html>
  )";
  
  server.send(200, "text/html", html);
}

void handleRegister() {
  if (server.hasArg("device_name") && server.hasArg("user_id")) {
    deviceName = server.arg("device_name");
    userId = server.arg("user_id");
    
    // Generate device token
    deviceToken = generateDeviceToken();
    
    // Register device with Supabase
    if (registerDeviceWithSupabase()) {
      deviceRegistered = true;
      saveConfiguration();
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Registered!");
      lcd.setCursor(0, 1);
      lcd.print("Ready to use");
      
      server.send(200, "text/html", "<div class='status success'>Device registered successfully!</div>");
    } else {
      server.send(500, "text/html", "<div class='status error'>Registration failed!</div>");
    }
  } else {
    server.send(400, "text/html", "<div class='status error'>Missing required fields!</div>");
  }
}

void handleCalibrate() {
  if (server.hasArg("known_weight")) {
    float knownWeight = server.arg("known_weight").toFloat();
    
    // Tare the scale first
    scale.tare();
    delay(2000);
    
    // Ask user to place known weight
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Place weight:");
    lcd.setCursor(0, 1);
    lcd.print(String(knownWeight) + "g");
    
    delay(5000); // Give user time to place weight
    
    // Read the scale
    float reading = scale.get_units(10);
    
    if (reading != 0) {
      calibrationFactor = reading / knownWeight;
      scale.set_scale(calibrationFactor);
      saveConfiguration();
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Calibrated!");
      lcd.setCursor(0, 1);
      lcd.print("Factor:" + String(calibrationFactor, 1));
      
      server.send(200, "text/html", "<div class='status success'>Calibration successful! Factor: " + String(calibrationFactor) + "</div>");
    } else {
      server.send(500, "text/html", "<div class='status error'>Calibration failed - no reading!</div>");
    }
  } else {
    server.send(400, "text/html", "<div class='status error'>Missing known weight!</div>");
  }
}

void handleStatus() {
  StaticJsonDocument<300> doc;
  doc["device_id"] = deviceId;
  doc["device_name"] = deviceName;
  doc["registered"] = deviceRegistered;
  doc["user_id"] = userId;
  doc["calibration_factor"] = calibrationFactor;
  doc["current_weight"] = getCurrentWeight();
  doc["wifi_signal"] = WiFi.RSSI();
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
}

String generateDeviceToken() {
  // Generate a simple token based on device MAC and timestamp
  String mac = String(ESP.getEfuseMac(), HEX);
  String timestamp = String(millis());
  return mac + "_" + timestamp;
}

bool registerDeviceWithSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  HTTPClient http;
  http.begin(supabaseUrl + "/rest/v1/device_registry");
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y3BvdW9nbXZtZnljbnJhdXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODc5NzYsImV4cCI6MjA2NTA2Mzk3Nn0.hm2DajmHYlXRzyTLxnpCK90u-C1OmaDY9K6AtiaStrI");
  http.addHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y3BvdW9nbXZtZnljbnJhdXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODc5NzYsImV4cCI6MjA2NTA2Mzk3Nn0.hm2DajmHYlXRzyTLxnpCK90u-C1OmaDY9K6AtiaStrI");
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["device_id"] = deviceId;
  doc["device_name"] = deviceName;
  doc["user_id"] = userId;
  doc["device_token"] = deviceToken;
  doc["is_active"] = true;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  http.end();
  
  return (httpResponseCode == 201 || httpResponseCode == 200);
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
  if (!deviceRegistered) return false;
  
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
  if (WiFi.status() != WL_CONNECTED || !deviceRegistered) {
    Serial.println("Cannot send data - not connected or not registered");
    return;
  }
  
  HTTPClient http;
  http.begin(supabaseUrl + "/functions/v1/esp32-weight-receiver");
  
  // Set headers with device authentication
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + deviceToken);
  http.addHeader("X-Device-ID", deviceId);
  http.addHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y3BvdW9nbXZtZnljbnJhdXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODc5NzYsImV4cCI6MjA2NTA2Mzk3Nn0.hm2DajmHYlXRzyTLxnpCK90u-C1OmaDY9K6AtiaStrI");
  
  // Create JSON payload
  StaticJsonDocument<400> doc;
  doc["barcode"] = currentBarcode.length() > 0 ? currentBarcode : "DEMO123";
  doc["weight_value"] = weightGrams;
  doc["sensor_id"] = deviceId;
  doc["user_id"] = userId;
  doc["weight_unit"] = "grams";
  doc["device_token"] = deviceToken;
  
  // Add sensor data
  doc["temperature"] = 25.0; // You can add actual temperature sensor
  doc["battery_level"] = 100; // You can add actual battery monitoring
  doc["signal_strength"] = WiFi.RSSI();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending authenticated data: " + jsonString);
  
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