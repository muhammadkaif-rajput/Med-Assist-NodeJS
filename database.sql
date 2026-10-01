CREATE DATABASE IF NOT EXISTS med_assist;
USE med_assist;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    age INT,
    gender VARCHAR(20),
    role VARCHAR(50) DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id INT PRIMARY KEY,
    specialization VARCHAR(255),
    location VARCHAR(255),
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    appointment_date DATETIME,
    status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS symptoms (
    symptom_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS diseases (
    disease_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    severity VARCHAR(50),
    description TEXT
);

CREATE TABLE IF NOT EXISTS disease_symptoms (
    disease_id INT,
    symptom_id INT,
    PRIMARY KEY (disease_id, symptom_id),
    FOREIGN KEY (disease_id) REFERENCES diseases(disease_id) ON DELETE CASCADE,
    FOREIGN KEY (symptom_id) REFERENCES symptoms(symptom_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS disease_medicines (
    disease_id INT,
    medicine_id INT,
    PRIMARY KEY (disease_id, medicine_id),
    FOREIGN KEY (disease_id) REFERENCES diseases(disease_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS advice (
    advice_id INT AUTO_INCREMENT PRIMARY KEY,
    recommendation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disease_advice (
    disease_id INT,
    advice_id INT,
    PRIMARY KEY (disease_id, advice_id),
    FOREIGN KEY (disease_id) REFERENCES diseases(disease_id) ON DELETE CASCADE,
    FOREIGN KEY (advice_id) REFERENCES advice(advice_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patient_vitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    blood_pressure VARCHAR(50),
    blood_sugar FLOAT,
    heart_rate INT,
    weight FLOAT,
    temperature FLOAT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patient_medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    time_of_day VARCHAR(50),
    relation_to_food VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medicine_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT,
    log_date DATE,
    status VARCHAR(50),
    UNIQUE KEY (medicine_id, log_date),
    FOREIGN KEY (medicine_id) REFERENCES patient_medicines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS diet_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    meal_type VARCHAR(50),
    food_item VARCHAR(255),
    calories INT,
    log_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);
