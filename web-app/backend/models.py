from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    rfh: float = Field(..., description="Current month's rainfall in mm")
    rfh_avg: float = Field(..., description="Historical average rainfall for the current month")
    rfh_lag1: float = Field(..., description="Total rainfall from the previous month")


class PredictionResponse(BaseModel):
    prediction: int
    status: str
    probability: float
    key_driver: str
    recommended_actions: list[str]
    model_accuracy: float
