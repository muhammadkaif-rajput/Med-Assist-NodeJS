import sys
import json
import os
import numpy as np
import joblib

# Read JSON from stdin (Windows-safe, no quoting issues)
try:
    input_json = sys.stdin.read().strip()
    data = json.loads(input_json)
except Exception as e:
    print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
    sys.exit(1)

# Absolute path to model files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'Diabetes_Pridiction_Project', 'model', 'diabetes_model.pkl')
scaler_path = os.path.join(BASE_DIR, 'Diabetes_Pridiction_Project', 'model', 'scaler.pkl')

if not os.path.exists(model_path):
    print(json.dumps({"error": f"Model not found at: {model_path}"}))
    sys.exit(1)

if not os.path.exists(scaler_path):
    print(json.dumps({"error": f"Scaler not found at: {scaler_path}"}))
    sys.exit(1)

try:
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
except Exception as e:
    print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
    sys.exit(1)

# Features: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age
features = np.array([[
    float(data.get('pregnancies', 0)),
    float(data.get('glucose', 0)),
    float(data.get('bp', 0)),
    float(data.get('skin', 0)),
    float(data.get('insulin', 0)),
    float(data.get('bmi', 0)),
    float(data.get('dpf', 0)),
    float(data.get('age', 0))
]])

try:
    scaled = scaler.transform(features)
    pred = int(model.predict(scaled)[0])
    prob = float(model.predict_proba(scaled)[0][1])
    print(json.dumps({"prediction": pred, "probability": round(prob, 4)}))
except Exception as e:
    print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
    sys.exit(1)
