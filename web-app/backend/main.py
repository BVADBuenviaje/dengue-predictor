from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from .models import PredictionRequest, PredictionResponse
    from .service import FEATURE_COLUMNS, load_or_train_model, predict_outbreak
except ImportError:  # pragma: no cover - supports running as `uvicorn main:app`
    from models import PredictionRequest, PredictionResponse
    from service import FEATURE_COLUMNS, load_or_train_model, predict_outbreak

app = FastAPI(
    title="Dengue Predictor API",
    version="1.0.0",
    description="Predict dengue outbreak risk from rainfall features.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_BUNDLE = None


@app.on_event("startup")
def _startup() -> None:
    global MODEL_BUNDLE
    MODEL_BUNDLE = load_or_train_model()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/model-info")
def model_info() -> dict[str, object]:
    bundle = MODEL_BUNDLE or load_or_train_model()
    return {
        "accuracy": bundle.accuracy,
        "best_params": bundle.best_params,
        "feature_columns": FEATURE_COLUMNS,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    bundle = MODEL_BUNDLE or load_or_train_model()

    try:
        result = predict_outbreak(bundle, request.model_dump())
    except Exception as exc:  # pragma: no cover - surfaced as API error
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return PredictionResponse(**result)
