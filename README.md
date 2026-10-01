# 🏥 MedAssist — Smart Health Recommendation & Diabetes Prediction System

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)
![Python](https://img.shields.io/badge/Python-3.9+-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> **MedAssist** is an intelligent web application designed to bridge the gap between healthcare patients and doctors. It provides automated health recommendations, appointment management, disease lookup, and integrated Machine Learning (AI) diabetes risk prediction.

---

## 🌟 Key Features

- **🤖 AI Diabetes Risk Prediction**: Integrated Scikit-Learn Machine Learning model predicting diabetes probability based on diagnostic markers.
- **👨‍⚕️ Multi-Role Portal**: Dedicated dashboards for Patients, Doctors, and Administrators.
- **📅 Appointment Booking & Management**: Real-time appointment scheduling and status tracking.
- **💊 Health & Medicine Recommendations**: Intelligent suggestions based on medical profiles.
- **📚 Medical Knowledge Base**: Integrated health encyclopedia with summaries.
- **🔒 Secure Authentication**: Role-based access control with hashed passwords (`bcryptjs`) and session management.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS Templating Engine, CSS3, JavaScript
- **Database**: MySQL (`mysql2/promise`)
- **Machine Learning**: Python 3, Scikit-Learn, NumPy, Joblib
- **Authentication**: `express-session`, `bcryptjs`

---

## 🚀 Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL Server](https://www.mysql.com/) (or XAMPP)
- [Python 3.8+](https://www.python.org/)

### 1. Clone the Repository

```bash
git clone https://github.com/muhammadkaif-rajput/Med-Assist-NodeJS.git
cd Med-Assist-NodeJS
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Database Setup

1. Start your local MySQL server (e.g. via XAMPP).
2. Open MySQL client or phpMyAdmin.
3. Import the database schema and sample data:
   - Run `database.sql`
   - Run `seed.sql`

### 5. Configure Environment Variables

Create a `.env` file or update `db.js`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=med_assist
DB_PORT=3306
DB_SSL=false
```

### 6. Run the Application

```bash
npm start
```

Visit `http://localhost:3000` in your browser.

---

## ☁️ Deployment Instructions

### Deploy on Render.com (100% Free)

1. Fork or push this repository to your GitHub account.
2. Create a free MySQL database on [TiDB Cloud](https://tidbcloud.com/) or [Aiven](https://aiven.io/).
3. Import `database.sql` and `seed.sql` into your cloud database.
4. On [Render](https://render.com/), create a new **Web Service** and connect this repository:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && pip install -r requirements.txt`
   - **Start Command**: `npm start`
5. Add the following **Environment Variables** in Render dashboard:
   - `DB_HOST`: *Your cloud DB host*
   - `DB_USER`: *Your cloud DB user*
   - `DB_PASSWORD`: *Your cloud DB password*
   - `DB_NAME`: `med_assist`
   - `DB_PORT`: *Your cloud DB port*
   - `DB_SSL`: `true`

---

## 👨‍💻 Author

- **Muhammad Kaif** — [GitHub Profile](https://github.com/muhammadkaif-rajput)
- Email: `sigmaruler786@gmail.com`

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
