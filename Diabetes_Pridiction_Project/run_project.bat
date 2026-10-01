@echo off
echo ==========================================
echo   Diabetes Prediction Project Setup
echo ==========================================

echo.
echo [1/3] Installing required libraries...
py -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install libraries. Please check your internet connection.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Training the machine learning model...
py train_model.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Model training failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Launching the Web Application...
echo.
echo The application should open in your browser shortly.
echo Press Ctrl+C in this window to stop the server.
echo.
py -m streamlit run app.py
pause