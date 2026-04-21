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

⚙️ Requirements
To install the necessary Python environment:
pip install -r requirements.txt