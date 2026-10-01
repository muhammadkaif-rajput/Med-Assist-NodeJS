import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# Ensure model directory exists
if not os.path.exists('model'):
    os.makedirs('model')

def train_models():
    print("Loading dataset...")
    try:
        df = pd.read_csv('data/diabetes.csv')
    except FileNotFoundError:
        print("Error: data/diabetes.csv not found.")
        return

    # Preprocessing: Handle missing values (0s in specific columns)
    print("Preprocessing data...")
    zero_fields = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    df[zero_fields] = df[zero_fields].replace(0, np.nan)

    # Impute missing values with mean
    for col in zero_fields:
        df[col] = df[col].fillna(df[col].mean())

    # Split Features and Target
    X = df.drop('Outcome', axis=1)
    y = df['Outcome']

    # Train-test split (80-20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Standard Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Save scaler
    joblib.dump(scaler, 'model/scaler.pkl')
    print("Scaler saved to model/scaler.pkl")

    # define models (Optimized)
    models = {
        'Logistic Regression': LogisticRegression(C=0.1, solver='lbfgs', max_iter=1000, random_state=42),
        'Support Vector Machine': SVC(C=1, kernel='rbf', gamma='scale', probability=True, random_state=42)
    }

    best_model = None
    best_accuracy = 0
    best_model_name = ""

    print("\nTraining and Evaluating Models:")
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
        
        # Evaluation
        acc = accuracy_score(y_test, y_pred)
        print(f"Accuracy: {acc:.4f}")
        print("Classification Report:")
        print(classification_report(y_test, y_pred))
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model = model
            best_model_name = name

    # Save Best Model
    print(f"\nBest Model: {best_model_name} with Accuracy: {best_accuracy:.4f}")
    joblib.dump(best_model, 'model/diabetes_model.pkl')
    print(f"Best model saved to model/diabetes_model.pkl")

    # Save model info
    with open('model/model_info.txt', 'w') as f:
        f.write(f"Best Model: {best_model_name}\n")
        f.write(f"Accuracy: {best_accuracy}\n")

if __name__ == "__main__":
    train_models()
