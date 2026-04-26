from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT_DIR / "data" / "processed" / "final_dengue_weather.csv"
MODELS_DIR = ROOT_DIR / "models"
MODEL_PATH = MODELS_DIR / "dengue_model.joblib"
METADATA_PATH = MODELS_DIR / "dengue_model_metadata.joblib"
FEATURE_COLUMNS = ["rfh", "rfh_avg", "rfh_lag1"]
RECOMMENDED_ACTIONS = [
    "Clear stagnant water in residential and public spaces.",
    "Increase community fogging in identified hotspots.",
    "Distribute insecticide-treated nets and reinforce prevention campaigns.",
]


@dataclass(slots=True)
class ModelBundle:
    pipeline: Pipeline
    accuracy: float
    report: dict[str, Any]
    feature_names: list[str]
    feature_importances: list[float]
    best_params: dict[str, Any]


def _load_training_frame() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")

    frame = pd.read_csv(DATA_PATH)
    frame["Date"] = pd.to_datetime(frame["Date"])
    frame = frame.sort_values(["Region", "Date"]).reset_index(drop=True)
    frame["rfh_lag1"] = frame.groupby("Region")["rfh"].shift(1)
    frame["rfh_lag1"] = frame.groupby("Region")["rfh_lag1"].transform(lambda series: series.bfill())
    thresholds = frame.groupby("Region")["Dengue_Cases"].transform(lambda series: series.quantile(0.75))
    frame["Is_Outbreak"] = (frame["Dengue_Cases"] > thresholds).astype(int)
    return frame


def build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("poly", PolynomialFeatures(degree=2, include_bias=False)),
            ("scale", StandardScaler()),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=50,
                    max_depth=10,
                    min_samples_split=2,
                    random_state=42,
                ),
            ),
        ]
    )


def train_model() -> ModelBundle:
    frame = _load_training_frame()
    features = frame[FEATURE_COLUMNS]
    target = frame["Is_Outbreak"]

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=0.2,
        random_state=42,
        stratify=target,
    )

    pipeline = build_pipeline()
    search = GridSearchCV(
        pipeline,
        param_grid={
            "model__n_estimators": [50, 100, 200],
            "model__max_depth": [5, 10, 15],
            "model__min_samples_split": [2, 5],
        },
        cv=5,
        scoring="accuracy",
        n_jobs=-1,
    )
    search.fit(x_train, y_train)

    best_pipeline = search.best_estimator_
    predictions = best_pipeline.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)

    poly = best_pipeline.named_steps["poly"]
    model = best_pipeline.named_steps["model"]
    feature_names = poly.get_feature_names_out(FEATURE_COLUMNS).tolist()
    feature_importances = model.feature_importances_.tolist()

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, MODEL_PATH)
    joblib.dump(
        {
            "accuracy": accuracy,
            "report": report,
            "best_params": search.best_params_,
            "feature_names": feature_names,
            "feature_importances": feature_importances,
            "recommended_actions": RECOMMENDED_ACTIONS,
        },
        METADATA_PATH,
    )

    return ModelBundle(
        pipeline=best_pipeline,
        accuracy=accuracy,
        report=report,
        feature_names=feature_names,
        feature_importances=feature_importances,
        best_params=search.best_params_,
    )


def load_or_train_model() -> ModelBundle:
    if MODEL_PATH.exists() and METADATA_PATH.exists():
        pipeline = joblib.load(MODEL_PATH)
        metadata = joblib.load(METADATA_PATH)
        return ModelBundle(
            pipeline=pipeline,
            accuracy=float(metadata["accuracy"]),
            report=dict(metadata["report"]),
            feature_names=list(metadata["feature_names"]),
            feature_importances=list(metadata["feature_importances"]),
            best_params=dict(metadata["best_params"]),
        )

    return train_model()


def predict_outbreak(bundle: ModelBundle, payload: dict[str, float]) -> dict[str, Any]:
    input_frame = pd.DataFrame([payload], columns=FEATURE_COLUMNS)
    probability = float(bundle.pipeline.predict_proba(input_frame)[0][1])
    prediction = int(probability >= 0.5)
    key_index = int(max(range(len(bundle.feature_importances)), key=bundle.feature_importances.__getitem__))
    key_driver = bundle.feature_names[key_index]

    if prediction == 1:
        status = "Outbreak Detected - High Risk"
    else:
        status = "No Outbreak Detected - Low Risk"

    return {
        "prediction": prediction,
        "status": status,
        "probability": probability,
        "key_driver": key_driver,
        "recommended_actions": RECOMMENDED_ACTIONS,
        "model_accuracy": bundle.accuracy,
    }
