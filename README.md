# 🦟 Philippine Dengue Prediction Model & Web App

This repository contains our final machine learning project, which aims to predict Dengue cases and potential outbreaks in the Philippines by correlating official Department of Health (DOH) infection data with PAGASA/HDX weather metrics (rainfall, temperature, etc.).

## 📋 Project Overview
This project fulfills a 6-phase machine learning pipeline:
1. **Data Preprocessing:** Merging health and weather data, handling missing values, and formatting dates/regions.
2. **Feature Engineering:** Creating an "Outbreak" classification target, polynomial features, and weather-lag features.
3. **Descriptive Analysis & EDA:** Visualizing dengue trends, seasonal distributions, and weather correlations.
4. **Algorithm Selection:** Training multiple models including ensemble methods (e.g., Random Forest, XGBoost) for both Regression (predicting case counts) and Classification (predicting outbreaks).
5. **Evaluation:** Hyperparameter tuning via GridSearchCV and visualizing performance (Confusion Matrices, Decision Boundaries).
6. **Web Application:** Deploying the best-performing model into an interactive web dashboard.

---

## 📂 Project Structure
```text
dengue-predictor/
│
├── data/                      # Dataset directory
│   ├── raw/                   # Original DOH and HDX CSVs
│   │   ├── ph_dengue_cases2016-2020.csv
│   │   └── phl-rainfall-subnat-full.csv
│   └── processed/             # Cleaned and engineered data
│       ├── engineered_dengue_weather.csv
│       └── final_dengue_weather.csv
│
├── models/                    # Exported ML Model(s)
│
├── notebooks/                 # Data Science Pipeline
│   ├── 01_preprocessing.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_eda_and_visualization.ipynb
│   ├── 04_modeling_and_evaluation.ipynb
│   └── 05_evaluation.ipynb
│
├── web-app/                   # Full-Stack Application
│   ├── backend/               # FastAPI (Python) - Model API
│   └── frontend/              # ReactJS - User Interface
│
├── requirements.txt           # Python Dependency List
└── README.md                  # Project Documentation
```

### Current Implementation
The repository now includes a working backend and frontend slice that follows the README contract.

* **Backend:** `web-app/backend/main.py` serves `/health`, `/model-info`, and `/predict`.
* **Frontend:** `web-app/frontend` contains the React dashboard, prediction form, charts, and risk panels.
* **Model artifact:** The backend trains and saves `models/dengue_model.joblib` and `models/dengue_model_metadata.joblib` on first run if they are missing.
---
# 🛠️ Data Science Summary (Phases 1-5)

### 1. Preprocessing & Engineering
* **Data Source:** Merged DOH Dengue reports with PAGASA/HDX rainfall data (1,020 total records).
* **Target Variable:** `Is_Outbreak` (Binary classification based on the 75th percentile of cases per region).
* **Key Feature:** `rfh_lag1` (Rainfall from the previous month), identifying the biological lag in mosquito breeding.
* **Polynomial Expansion:** Added non-linear weather interactions to capture extreme weather events.

### 2. Model Selection & Tuning
* **Algorithm:** Random Forest Classifier (Ensemble Bagging Method).
* **Optimization:** Used `GridSearchCV` to prevent overfitting by capping `max_depth` at 10.
* **Performance:** Achieved a generalized accuracy of ~77.6% on unseen test data.
---



# 🚀 Web App Handover Instructions (React Team)

The model is ready to be integrated into the React application via a Python backend (FastAPI).

### 1. The Data Contract
The React frontend must collect the following raw values from the user. **Note:** The frontend does NOT need to perform scaling or polynomial math; the backend handles all transformations.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `rfh` | Float | Current month's rainfall in mm. |
| `rfh_avg` | Float | Historical average rainfall for the current month. |
| `rfh_lag1` | Float | Total rainfall from the previous month. |

### 2. API Implementation
The React app should send a **POST** request to the `/predict` endpoint.

prediction: 1 → Trigger Red/Warning UI.
prediction: 0 → Trigger Green/Normal UI.

**Sample Request (JSON):**
```json
{
  "rfh": 180.5,
  "rfh_avg": 140.0,
  "rfh_lag1": 155.2
}
```

**Sample Response (JSON):**
```json
{
  "prediction": 1,
  "status": "Outbreak Detected - High Risk",
  "probability": 0.82
}
```

Interpretation:
- `prediction: 1` → Trigger Red/Warning UI.
- `prediction: 0` → Trigger Green/Normal UI.

### 3. Backend Execution
To serve the model, the backend team must run:

cd web-app/backend
uvicorn main:app --reload

### 4. Frontend Execution
To launch the dashboard, the frontend team must run:

cd web-app/frontend
npm install
npm run dev

⚙️ Requirements
To install the necessary Python environment:
pip install -r requirements.txt

---

# 🖥️ Expected Web App Outputs & Features

## 1. The Prediction Dashboard (The Core)
This is the most important part of the app.

- **Input Form:** Clean fields for Current Rainfall, Historical Average, and Previous Month's Rainfall.
- **Risk Indicator:** A large, color-coded card that changes based on the model's result.
  - 🔴 **HIGH RISK:** If the model predicts an outbreak.
  - 🟢 **LOW RISK:** If the model predicts a normal month.
- **Confidence Score:** A percentage showing how sure the model is (e.g., "82% Probability of Outbreak").

## 2. The "Actionable Insights" Section
Don't just give them a "High Risk" warning—tell them why and what to do.

- **Key Driver Alert:**
  - A text box that says: "Warning: The 15% increase in rainfall from last month (rfh_lag1) is the primary driver for this prediction."
- **Recommended Actions:**
  - Clear stagnant water in residential areas.
  - Increase community fogging in identified hotspots.
  - Distribute insecticide-treated nets.

## 3. Interactive Data Visualizations
Use charts to give the user context. Since you're using React, your groupmates can use libraries like Recharts or Chart.js.

- **Regional Heatmap:** A map of the Philippines where regions are shaded darker based on current risk levels.
- **Trend Line:** A graph showing historical Dengue cases vs. Rainfall for that specific month to show the user that "This happened in 2018 under similar weather conditions."

## 4. Technical Transparency (The "Footnote")
To make the app look professional and academic, include a small section at the bottom:

- **Model Info:** "Powered by a Tuned Random Forest Classifier (77.6% Accuracy)."
- **Data Source:** "Climate data provided by PAGASA/HDX; Health data provided by DOH."
- **Last Updated:** The timestamp of the last data sync or model training.