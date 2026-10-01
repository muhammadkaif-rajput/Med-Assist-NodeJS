# Diabetes Prediction System

This project implements a Machine Learning system to predict diabetes using the PIMA Indians Diabetes Dataset. It includes a model training script and a Streamlit frontend application.

## Project Structure
- `data/diabetes.csv`: The dataset file.
- `train_model.py`: Script to train the ML models (Logistic Regression & SVM) and save them.
- `app.py`: The user interface application powered by Streamlit.
- `requirements.txt`: List of Python dependencies.
- `model/`: Directory where trained models and scalers will be saved.

## Setup Instructions

### 1. Install Python
Ensure you have Python installed on your system. You can download it from [python.org](https://www.python.org/downloads/).

### 2. Install Dependencies
Open a terminal (Command Prompt or PowerShell) in this folder and run:
```bash
pip install -r requirements.txt
```

### 3. Train the Model
Before running the app, you must train the models. Run the following command:
```bash
python train_model.py
```
This will generate `diabetes_model.pkl` and `scaler.pkl` in the `model/` directory.

### 4. Run the Application
Start the frontend application by running:
```bash
streamlit run app.py
```
The application will open in your web browser.

## Features
- **Model Training**: Preprocesses data, handles missing values, and trains Logistic Regression and SVM models.
- **Evaluation**: Selects the best performing model based on accuracy.
- **Prediction**: Simple UI to input patient data and get a real-time prediction.
