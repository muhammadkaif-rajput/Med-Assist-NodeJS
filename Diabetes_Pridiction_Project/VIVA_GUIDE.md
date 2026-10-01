# Diabetes Prediction Project - Viva Guide 🎓

Use this guide to explain your project during your viva. It breaks down **what** you did and **why**.

---

## 1. Project Overview (Project Kya Hai?)
This is a **Diabetes Prediction System** using Machine Learning. 
*   **Goal**: To predict if a patient has diabetes based on health metrics (like Glucose, BMI, Age, etc.).
*   **Tech Stack**: Python, Scikit-Learn (for Mobile), Streamlit (for Website/App).

---

## 2. File Explanations (Kaunsi File Kya Karti Hai?)

### `train_model.py` (The "Brain" Builder)
This is the most important backend file. It creates the AI model.
*   **Step 1: Loading Data**: Reads `diabetes.csv`.
*   **Step 2: Data Cleaning**: The dataset had "0" value for things like Glucose and Blood Pressure, which is impossible. I replaced these zeros with the **average (mean)** value of that column.
*   **Step 3: Splitting**: Divided data into 80% Training (to teach) and 20% Testing (to exam).
*   **Step 4: Scaling**: Used `StandardScaler` to bring all numbers to a similar range (so high Insulin values don't dominate low DPF values).
*   **Step 5: Training**: I tested two algorithms:
    1.  **Logistic Regression**
    2.  **Support Vector Machine (SVM)**
*   **Step 6: Saving**: The code automatically picks the one with higher accuracy and saves it as `model/diabetes_model.pkl`.

### `app.py` (The User Interface)
This is the frontend that the user sees.
*   **Library**: I used **Streamlit** because it's fast for Data Science apps.
*   **Design**: Calculated BMI automatically from Height/Weight.
*   **Process**: It loads the saved `.pkl` model and Scaler. It takes user inputs, scales them, and asks the model for a prediction.
*   **Features**: It has a "Premium" dark theme and a step-by-step wizard interface.

### `model/` directory
*   `diabetes_model.pkl`: The trained AI model (saved as a binary file).
*   `scaler.pkl`: The math tool to scale user inputs exactly like the training data.

---

## 3. Likely Viva Questions & Answers

**Q: Why did you replace zeros with Mean?**
**A:** "Because in medical data, 0 glucose or blood pressure is impossible. It was actually missing data. Dropping those rows would lose too much data, so I filled them with the average."

**Q: Why did you use StandardScaler?**
**A:** "Machine learning models get confused if one number is 800 (Insulin) and another is 0.5 (Diabetes Function). Scaling makes them all have a mean of 0 and variance of 1, so they are treated equally."

**Q: Which model was better?**
**A:** (Check your `model_info.txt` or run output, usually Logistic Regression performs very well on this simple dataset, but SVM is often more powerful for complex boundaries).

**Q: How do you connect the model to the app?**
**A:** "I used the `joblib` library to save the trained model object to a file (`.pkl`) and then loaded that same file in `app.py` to make predictions."
