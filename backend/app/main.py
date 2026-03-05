from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import os
from datetime import datetime, timedelta
import random

from app.db.schemas import (
    Event,
    Validation,
    EventsResponse,
    ValidationResponse,
    PriceData,
    PricePoint,
    AnalyzeRequest,
)

app = FastAPI(
    title="GeoPulse AI API",
    description="News-to-market-impact prediction API",
    version="1.0.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load mock data
MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "mock_data", "mock_data.json")
MOCK_VALIDATIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "mock_data", "mock_validations.json")


def load_mock_events():
    try:
        with open(MOCK_DATA_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def load_mock_validations():
    try:
        with open(MOCK_VALIDATIONS_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


# In-memory storage (would be MongoDB in production)
events_store = load_mock_events()
validations_store = load_mock_validations()


@app.get("/")
async def root():
    return {
        "message": "GeoPulse AI API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/api/events", response_model=EventsResponse)
async def get_events(limit: int = Query(10, ge=1, le=50)):
    """Get latest events sorted by timestamp (newest first)."""
    sorted_events = sorted(
        events_store,
        key=lambda x: x.get("timestamp", ""),
        reverse=True,
    )[:limit]
    return {"status": "success", "data": sorted_events}


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    """Get a specific event by ID."""
    event = next((e for e in events_store if e.get("event_id") == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Include validation info if available
    validation = next(
        (v for v in validations_store if v.get("event_id") == event_id),
        None,
    )
    
    return {
        "status": "success",
        "data": event,
        "validation": validation,
    }


@app.get("/api/validations", response_model=ValidationResponse)
async def get_validations(limit: int = Query(20, ge=1, le=100)):
    """Get validation results."""
    sorted_validations = sorted(
        validations_store,
        key=lambda x: x.get("validated_at", ""),
        reverse=True,
    )[:limit]
    return {"status": "success", "data": sorted_validations}


@app.get("/api/validate/{event_id}")
async def validate_event(
    event_id: str,
    horizon: str = Query("1h", regex="^(1h|6h|24h)$"),
):
    """Run or get validation for a specific event and horizon."""
    event = next((e for e in events_store if e.get("event_id") == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check existing validation
    existing = next(
        (v for v in validations_store 
         if v.get("event_id") == event_id and v.get("horizon") == horizon),
        None,
    )
    
    if existing:
        return {"status": "success", "data": existing}
    
    # Generate mock validation (in production, would fetch real prices)
    if event.get("affected_assets"):
        asset = event["affected_assets"][0]
        predicted_direction = asset.get("prediction", "NEUTRAL")
        predicted_confidence = asset.get("confidence", 0.5)
        predicted_ticker = asset.get("ticker", "SPY")
        
        # Simulate price movement
        mock_price_at_event = 100.0
        # 70% chance to match prediction (for demo purposes)
        direction_matches = random.random() < 0.70
        
        if predicted_direction == "BULLISH":
            change = random.uniform(0.5, 3.0) if direction_matches else random.uniform(-3.0, -0.5)
        elif predicted_direction == "BEARISH":
            change = random.uniform(-3.0, -0.5) if direction_matches else random.uniform(0.5, 3.0)
        else:
            change = random.uniform(-1.0, 1.0)
        
        mock_price_at_validation = mock_price_at_event * (1 + change / 100)
        
        # Determine if prediction was correct
        thresholds = {"1h": 0.5, "6h": 1.5, "24h": 3.0}
        threshold = thresholds.get(horizon, 1.0)
        
        if predicted_direction == "BULLISH" and change > threshold:
            status = "CORRECT"
        elif predicted_direction == "BEARISH" and change < -threshold:
            status = "CORRECT"
        elif abs(change) < threshold:
            status = "PENDING"
        else:
            status = "INCORRECT"
        
        validation = {
            "event_id": event_id,
            "headline": event.get("headline", ""),
            "predicted_direction": predicted_direction,
            "predicted_ticker": predicted_ticker,
            "predicted_confidence": predicted_confidence,
            "horizon": horizon,
            "price_at_event": mock_price_at_event,
            "price_at_validation": round(mock_price_at_validation, 2),
            "actual_change_percent": round(change, 2),
            "status": status,
            "validated_at": datetime.utcnow().isoformat() + "Z",
        }
        
        validations_store.append(validation)
        return {"status": "success", "data": validation}
    
    raise HTTPException(status_code=400, detail="No assets to validate")


@app.get("/api/price")
async def get_price(
    ticker: str = Query(..., min_length=1, max_length=10),
    range: str = Query("1d", regex="^(1h|1d|1w|1m)$"),
):
    """Get price data for a ticker (mock data for demo)."""
    # Generate mock price data
    now = datetime.utcnow()
    
    range_hours = {
        "1h": 1,
        "1d": 24,
        "1w": 168,
        "1m": 720,
    }
    hours = range_hours.get(range, 24)
    
    base_price = 100.0
    # Add some variety based on ticker
    ticker_seed = sum(ord(c) for c in ticker)
    random.seed(ticker_seed)
    base_price = 50 + random.random() * 200
    
    prices = []
    for i in range(hours):
        time = now - timedelta(hours=hours - i)
        # Generate somewhat realistic price movement
        noise = random.gauss(0, 0.5)
        trend = 0.01 * (i / hours)  # Slight upward trend
        price = base_price * (1 + trend + noise / 100)
        prices.append({
            "time": time.isoformat() + "Z",
            "price": round(price, 2),
        })
    
    random.seed()  # Reset seed
    
    return {
        "ticker": ticker,
        "prices": prices,
    }


@app.post("/api/analyze")
async def analyze_news(request: AnalyzeRequest):
    """
    Analyze news and generate predictions.
    In production, this would call the LLM.
    For demo, returns a mock analysis.
    """
    #replace with analysis.py when that gets made - anni

    # Mock LLM response (in production, would call OpenAI/Gemini)
    event_id = f"evt_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    # Simple keyword-based mock analysis
    headline_lower = request.headline.lower()
    
    if any(word in headline_lower for word in ["oil", "opec", "saudi", "energy"]):
        macro_effect = "Supply Shock"
        market_pressure = "INFLATIONARY"
        severity = "HIGH"
        affected_assets = [
            {
                "ticker": "XOM",
                "name": "Exxon Mobil",
                "asset_class": "Equity",
                "sector": "Energy",
                "prediction": "BULLISH",
                "confidence": 0.85,
                "reason": "Oil price increases benefit energy producers.",
            }
        ]
        logic_chain = [
            {"type": "event", "text": "Oil news"},
            {"type": "macro", "text": "Supply Shock"},
            {"type": "sector", "text": "Energy"},
            {"type": "asset", "text": "XOM"},
        ]
    elif any(word in headline_lower for word in ["fed", "rate", "interest", "monetary"]):
        macro_effect = "Monetary Policy Shift"
        market_pressure = "RISK_ON" if "cut" in headline_lower else "DEFENSIVE"
        severity = "HIGH"
        affected_assets = [
            {
                "ticker": "SPY",
                "name": "S&P 500 ETF",
                "asset_class": "Equity",
                "sector": "Broad Market",
                "prediction": "BULLISH" if "cut" in headline_lower else "BEARISH",
                "confidence": 0.80,
                "reason": "Rate changes affect equity valuations.",
            }
        ]
        logic_chain = [
            {"type": "event", "text": "Fed announcement"},
            {"type": "macro", "text": macro_effect},
            {"type": "sector", "text": "Financials"},
            {"type": "asset", "text": "SPY"},
        ]
    elif any(word in headline_lower for word in ["ai", "regulation", "tech", "microsoft", "google"]):
        macro_effect = "Regulatory Impact"
        market_pressure = "DEFENSIVE"
        severity = "MEDIUM"
        affected_assets = [
            {
                "ticker": "MSFT",
                "name": "Microsoft",
                "asset_class": "Equity",
                "sector": "Technology",
                "prediction": "BEARISH" if "regulation" in headline_lower else "BULLISH",
                "confidence": 0.70,
                "reason": "Tech sector faces regulatory changes.",
            }
        ]
        logic_chain = [
            {"type": "event", "text": "Tech news"},
            {"type": "macro", "text": macro_effect},
            {"type": "sector", "text": "Technology"},
            {"type": "asset", "text": "MSFT"},
        ]
    else:
        macro_effect = "Market Uncertainty"
        market_pressure = "RISK_OFF"
        severity = "LOW"
        affected_assets = [
            {
                "ticker": "GLD",
                "name": "Gold ETF",
                "asset_class": "Commodity",
                "sector": "Precious Metals",
                "prediction": "BULLISH",
                "confidence": 0.55,
                "reason": "Uncertainty drives safe haven demand.",
            }
        ]
        logic_chain = [
            {"type": "event", "text": "General news"},
            {"type": "macro", "text": macro_effect},
            {"type": "sector", "text": "Safe Haven"},
            {"type": "asset", "text": "GLD"},
        ]
    
    event = {
        "event_id": event_id,
        "headline": request.headline,
        "source": request.source,
        "timestamp": (request.timestamp or datetime.utcnow()).isoformat() + "Z",
        "severity": severity,
        "event_sentiment": "NEGATIVE" if "cut" not in headline_lower and "positive" not in headline_lower else "POSITIVE",
        "macro_effect": macro_effect,
        "prediction_horizon": "SHORT_TERM",
        "market_pressure": market_pressure,
        "logic_chain": logic_chain,
        "affected_assets": affected_assets,
        "why": f"Analysis based on {macro_effect.lower()} implications.",
        "meta": {
            "llm_model": "demo-gpt",
            "llm_prompt_version": "v1",
            "confidence_components": {
                "llm_score": 0.75,
                "sentiment_strength": 0.6,
                "historical_similarity": 0.5,
            },
            "confidence_formula": "0.4*llm_score+0.3*sentiment_strength+0.3*historical_similarity",
        },
    }
    
    # Add to store
    events_store.insert(0, event)
    
    return {"status": "success", "data": event}


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "events_count": len(events_store),
        "validations_count": len(validations_store),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
