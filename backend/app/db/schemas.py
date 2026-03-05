from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum


class SeverityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SentimentEnum(str, Enum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    MIXED = "MIXED"


class HorizonEnum(str, Enum):
    SHORT_TERM = "SHORT_TERM"
    MEDIUM_TERM = "MEDIUM_TERM"
    LONG_TERM = "LONG_TERM"


class MarketPressureEnum(str, Enum):
    INFLATIONARY = "INFLATIONARY"
    DEFENSIVE = "DEFENSIVE"
    RISK_OFF = "RISK_OFF"
    RISK_ON = "RISK_ON"
    COST_PRESSURE = "COST_PRESSURE"
    LIQUIDITY = "LIQUIDITY"


class PredictionEnum(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class AssetClassEnum(str, Enum):
    EQUITY = "Equity"
    COMMODITY = "Commodity"
    CRYPTO = "Crypto"
    FOREX = "Forex"


class LogicChainNode(BaseModel):
    type: Literal["event", "macro", "sector", "asset"]
    text: str


class ConfidenceComponents(BaseModel):
    llm_score: float = Field(ge=0, le=1)
    sentiment_strength: float = Field(ge=0, le=1)
    historical_similarity: float = Field(ge=0, le=1)


class EventMeta(BaseModel):
    llm_model: str = "demo-gpt"
    llm_prompt_version: str = "v1"
    confidence_components: ConfidenceComponents
    confidence_formula: str = "0.4*llm_score+0.3*sentiment_strength+0.3*historical_similarity"


class AffectedAsset(BaseModel):
    ticker: str
    name: str
    asset_class: AssetClassEnum
    sector: str
    prediction: PredictionEnum
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(max_length=200)


class Event(BaseModel):
    event_id: str
    headline: str
    source: str
    timestamp: datetime
    severity: SeverityEnum
    event_sentiment: SentimentEnum
    macro_effect: str
    prediction_horizon: HorizonEnum
    market_pressure: MarketPressureEnum
    logic_chain: List[LogicChainNode]
    affected_assets: List[AffectedAsset]
    why: str = Field(max_length=200)
    meta: EventMeta


class ValidationStatus(str, Enum):
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"
    PENDING = "PENDING"


class Validation(BaseModel):
    event_id: str
    headline: str
    predicted_direction: PredictionEnum
    predicted_ticker: str
    predicted_confidence: float = Field(ge=0, le=1)
    horizon: str
    price_at_event: float
    price_at_validation: Optional[float] = None
    actual_change_percent: Optional[float] = None
    status: ValidationStatus = ValidationStatus.PENDING
    validated_at: Optional[datetime] = None


class AnalyzeRequest(BaseModel):
    headline: str
    source: str = "Unknown"
    timestamp: Optional[datetime] = None
    text: Optional[str] = None


class EventsResponse(BaseModel):
    status: str = "success"
    data: List[Event]


class ValidationResponse(BaseModel):
    status: str = "success"
    data: List[Validation]


class PricePoint(BaseModel):
    time: datetime
    price: float


class PriceData(BaseModel):
    ticker: str
    prices: List[PricePoint]
