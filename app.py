from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS


PIPELINE_PATH = Path("models/pipeline.pkl")
WEB_APP_DIR = Path("web-app")

app = Flask(__name__)
CORS(app)

if not PIPELINE_PATH.exists():
    raise FileNotFoundError(
        "models/pipeline.pkl not found. Run `python export_pipeline.py` first."
    )

bundle = joblib.load(PIPELINE_PATH)
if len(bundle) == 3:
    model, scaler, feature_columns = bundle
    metadata = {}
else:
    model, scaler, feature_columns, metadata = bundle

feature_columns = list(feature_columns)
poly_feature_order = metadata.get("poly_feature_order", feature_columns)
regions = metadata.get("regions", [])
region_default_lag = metadata.get("region_default_lag", {})


def risk_level_from_probability(probability: float) -> str:
    if probability < 0.4:
        return "low"
    if probability < 0.7:
        return "medium"
    return "high"


def build_feature_row(payload: dict) -> pd.DataFrame:
    region = payload.get("region")
    rfh = float(payload["rfh"])
    rfh_avg = float(payload["rfh_avg"])
    rfh_lag1 = payload.get("rfh_lag1")
    if rfh_lag1 is None:
        rfh_lag1 = float(region_default_lag.get(region, 0.0))
    else:
        rfh_lag1 = float(rfh_lag1)

    # Replicate notebook feature creation order.
    raw_poly = pd.DataFrame(
        [
            {
                "rfh": rfh,
                "rfh_avg": rfh_avg,
                "rfh_lag1": rfh_lag1,
                "rfh^2": rfh * rfh,
                "rfh rfh_avg": rfh * rfh_avg,
                "rfh rfh_lag1": rfh * rfh_lag1,
                "rfh_avg^2": rfh_avg * rfh_avg,
                "rfh_avg rfh_lag1": rfh_avg * rfh_lag1,
                "rfh_lag1^2": rfh_lag1 * rfh_lag1,
            }
        ]
    )
    raw_poly = raw_poly[poly_feature_order]

    scaled = scaler.transform(raw_poly)
    features_df = pd.DataFrame(scaled, columns=poly_feature_order)
    features_df = features_df.reindex(columns=feature_columns)
    return features_df


def build_prediction_payload(payload: dict):
    feature_row = build_feature_row(payload)
    prediction = int(model.predict(feature_row)[0])

    if hasattr(model, "predict_proba"):
        probability = float(model.predict_proba(feature_row)[0][1])
    else:
        probability = float(prediction)

    top_features = []
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        pairs = list(zip(feature_columns, importances))
        top = sorted(pairs, key=lambda x: x[1], reverse=True)[:5]
        top_features = [{"name": name, "importance": float(importance)} for name, importance in top]

    return {
        "is_outbreak": bool(prediction),
        "probability": probability,
        "risk_level": risk_level_from_probability(probability),
        "top_features": top_features,
    }


@app.get("/")
def serve_frontend_index():
    return send_from_directory(WEB_APP_DIR, "index.html")


@app.get("/<path:filename>")
def serve_frontend_asset(filename: str):
    asset_path = WEB_APP_DIR / filename
    if asset_path.exists() and asset_path.is_file():
        return send_from_directory(WEB_APP_DIR, filename)
    return jsonify({"error": "Not found"}), 404


@app.get("/regions")
def get_regions():
    return jsonify({"regions": regions})


@app.post("/predict")
def predict():
    try:
        payload = request.get_json(force=True) or {}
        required_fields = ["region", "year", "month", "rfh", "rfh_avg"]
        missing = [field for field in required_fields if field not in payload]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        region = payload["region"]
        if regions and region not in regions:
            return jsonify({"error": f"Invalid region '{region}'"}), 400

        return jsonify(build_prediction_payload(payload))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/predict-all-regions")
def predict_all_regions():
    try:
        payload = request.get_json(force=True) or {}
        required_fields = ["year", "month", "rfh", "rfh_avg"]
        missing = [field for field in required_fields if field not in payload]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        region_results = []
        for region in regions:
            region_payload = {
                "region": region,
                "year": payload["year"],
                "month": payload["month"],
                "rfh": payload["rfh"],
                "rfh_avg": payload["rfh_avg"],
            }
            if "rfh_lag1_by_region" in payload and isinstance(payload["rfh_lag1_by_region"], dict):
                if region in payload["rfh_lag1_by_region"]:
                    region_payload["rfh_lag1"] = payload["rfh_lag1_by_region"][region]

            prediction = build_prediction_payload(region_payload)
            region_results.append({"region": region, **prediction})

        return jsonify({"regions": region_results})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
