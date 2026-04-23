# Philippine Dengue Prediction Model & Web App

This repository contains a machine learning project that predicts dengue outbreak risk in the Philippines by correlating Department of Health (DOH) infection data with PAGASA/HDX weather metrics (rainfall and related fields).

---

## Quickstart

From the project root (`dengue-predictor/`):

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Export or retrain the deployable pipeline bundle:

```bash
python export_pipeline.py
```

This creates `models/pipeline.pkl`.

3. Start the API and static frontend:

```bash
python app.py
```

4. Open the app: `http://127.0.0.1:5000/`

---

## Project overview (ML pipeline)

This work follows a typical end-to-end ML workflow:

1. **Data preprocessing:** Merging health and weather data, handling missing values, and formatting dates and regions.
2. **Feature engineering:** Outbreak classification target, polynomial features, and weather lag features.
3. **Descriptive analysis and EDA:** Dengue trends, seasonality, and weather correlations.
4. **Algorithm selection:** Ensemble methods (e.g. Random Forest) for classification (outbreak vs normal).
5. **Evaluation:** Hyperparameter tuning with `GridSearchCV` and performance visualization.
6. **Web application:** Serving the chosen model through a Flask API and a browser UI (`web-app/`).

---

## What this system does

The deployed stack combines:

- Notebook-based exploration and training (`notebooks/`)
- Reproducible export and training (`export_pipeline.py`)
- Flask inference and static file hosting (`app.py`)
- A browser frontend (`web-app/`) using React, Leaflet, and Chart.js (loaded from CDNs)

---

## End-to-end flow

1. Raw data is cleaned and merged in `notebooks/01_preprocessing.ipynb`.
2. Features are engineered in `notebooks/02_feature_engineering.ipynb`.
3. Models are compared and tuned in `notebooks/04_modeling_and_evaluation.ipynb` and `notebooks/05_evaluation.ipynb`.
4. `export_pipeline.py` mirrors that engineering and training logic and writes `models/pipeline.pkl`.
5. `app.py` loads the bundle at startup and exposes JSON prediction endpoints.
6. `web-app/app.js` calls those endpoints and renders the form, results, feature-importance chart, and regional map.

---

## Project structure

```text
dengue-predictor/
├── app.py
├── export_pipeline.py
├── data/
│   ├── raw/
│   │   ├── ph_dengue_cases2016-2020.csv
│   │   └── phl-rainfall-subnat-full.csv
│   └── processed/
│       ├── final_dengue_weather.csv
│       └── engineered_dengue_weather.csv
├── models/
│   ├── .gitkeep
│   └── pipeline.pkl
├── notebooks/
│   ├── 01_preprocessing.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_eda_and_visualization.ipynb
│   ├── 04_modeling_and_evaluation.ipynb
│   └── 05_evaluation.ipynb
├── web-app/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── requirements.txt
└── README.md
```

---

## Data science summary

<<<<<<< Updated upstream
# 🚀 Web App Handover Instructions (React Team)
=======
### Preprocessing and engineering

- **Data source:** Merged DOH dengue reports with PAGASA/HDX rainfall data (on the order of 1,000+ monthly records, depending on the cleaned export).
- **Target variable:** `Is_Outbreak` — binary classification using a high-case threshold (75th percentile of cases within each region in the training export script).
- **Key feature:** `rfh_lag1` (previous month’s rainfall), capturing lag effects relevant to mosquito breeding cycles.
- **Polynomial expansion:** Degree-2 polynomial interactions on `rfh`, `rfh_avg`, and `rfh_lag1`, then standardized scaling — matching the notebook pipeline and reproduced in `export_pipeline.py` / `app.py`.
>>>>>>> Stashed changes

### Model selection and tuning

- **Algorithm:** Random Forest classifier.
- **Optimization:** `GridSearchCV` over `n_estimators`, `max_depth`, and `min_samples_split` (see `export_pipeline.py` for the exact grid).
- **Performance:** Notebook runs reported roughly **~77.6%** generalized accuracy on held-out data; re-run `export_pipeline.py` to print the current cross-validated score stored in the bundle metadata.

---

## API contract

### `GET /regions`

Returns valid Philippine region names from training metadata.

### `POST /predict`

**Request:**

```json
{
  "region": "Region I",
  "year": 2026,
  "month": 6,
  "rfh": 180.5,
  "rfh_avg": 140.0
}
```

Optional field: `rfh_lag1`. If omitted, the backend uses a per-region default from training data (see metadata in `pipeline.pkl`), with a safe fallback.

**Response:**

```json
{
  "is_outbreak": true,
  "probability": 0.82,
  "risk_level": "high",
  "top_features": [
    { "name": "rfh_lag1", "importance": 0.31 }
  ]
}
```

- `is_outbreak` / `probability` drive the main risk UI.
- `risk_level` is derived from probability bands in `app.py` (`low` / `medium` / `high`).
- `top_features` lists up to five Random Forest feature importances when available.

### `POST /predict-all-regions`

**Request:**

<<<<<<< Updated upstream
⚙️ Requirements
To install the necessary Python environment:
pip install -r requirements.txt
=======
```json
{
  "year": 2026,
  "month": 6,
  "rfh": 180.5,
  "rfh_avg": 140.0
}
```

**Response:** A `regions` array with one prediction object per trained region — used to color the Leaflet map. You may optionally pass `rfh_lag1_by_region` (object mapping region name to lag value) for finer control.

---

## Dashboard behavior (what the web app shows)

1. **Inputs:** Region, month, year, total monthly rainfall (`rfh`), and average daily rainfall (`rfh_avg`). Lag rainfall is optional at the API level; the UI relies on backend defaults unless you extend it.
2. **Prediction card:** Outbreak yes/no, probability bar, and discrete risk badge.
3. **Feature importances:** Horizontal bar chart (Chart.js) for the top contributing scaled polynomial features.
4. **Regional map:** Philippines regions shaded by predicted probability; tooltips show region-level risk.
5. **Transparency block (recommended in UI copy):** Model type (tuned Random Forest), data sources (DOH / PAGASA or HDX), and last training or data refresh date when you have one.

---

## Detailed file-by-file notes

### Core runtime

- **`export_pipeline.py`** — Reads `data/processed/final_dengue_weather.csv`, rebuilds targets and features (grouped lag, polynomials, `StandardScaler`), runs `GridSearchCV` on a `RandomForestClassifier`, and writes `models/pipeline.pkl` (model, scaler, column order, and metadata such as `regions`, `poly_feature_order`, and `region_default_lag`).

- **`app.py`** — Flask app: serves `web-app/` static assets, `GET /regions`, `POST /predict`, and `POST /predict-all-regions`. Loads `pipeline.pkl` once, rebuilds the feature row to match training column order, and returns JSON including optional top feature importances.

### Frontend

- **`web-app/index.html`** — Shell: Leaflet, Chart.js, React, ReactDOM, Babel standalone; mounts `#root`.
- **`web-app/app.js`** — React UI: region form, prediction flow, `FeatureChart`, `RegionRiskMap` (GeoJSON + Leaflet).
- **`web-app/style.css`** — Layout, cards, progress bar, risk badges, map height.

### Data and notebooks

- **`data/raw/`** — Source DOH and rainfall CSVs.
- **`data/processed/final_dengue_weather.csv`** — Merged monthly table used by export/training.
- **`data/processed/engineered_dengue_weather.csv`** — Notebook feature-engineering output for analysis.
- **`notebooks/`** — Preprocessing through evaluation; conceptual source for `export_pipeline.py` hyperparameters and feature logic.

### Other

- **`models/.gitkeep`** — Keeps `models/` in version control before `pipeline.pkl` exists.
- **`models/pipeline.pkl`** — Generated artifact; load with `joblib` (do not edit by hand).
- **`requirements.txt`** — Python dependencies for training export and the Flask server.
>>>>>>> Stashed changes
