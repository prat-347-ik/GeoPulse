from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import mongodb_connection
from app.db.repository import EventRepository
from app.websocket_manager import websocket_manager
from typing import Optional
import json
import os
from datetime import datetime, timedelta, timezone
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
from app.services.orchestrator import analysis_orchestrator

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
events_store = analysis_orchestrator.event_store
validations_store = load_mock_validations()

# Repository instance (initialized at startup)
event_repo: Optional[EventRepository] = None


@app.on_event("startup")
async def startup_db_client():
    """Initialize MongoDB connection and create indexes"""
    global event_repo
    try:
        await mongodb_connection.connect()
        db = mongodb_connection.get_db()
        event_repo = EventRepository(db)
        await event_repo.create_all_indexes()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"⚠️  Could not connect to MongoDB: {e}")
        print("Using in-memory storage as fallback")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close MongoDB connection on shutdown"""
    await mongodb_connection.disconnect()


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
    sorted_events = analysis_orchestrator.list_events(limit)
    return {"status": "success", "data": sorted_events}


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    """Get a specific event by ID."""
    event = analysis_orchestrator.get_event(event_id)
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
    horizon: str = Query("1h", pattern="^(1h|6h|24h)$"),
):
    """Run or get validation for a specific event and horizon."""
    event = analysis_orchestrator.get_event(event_id)
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
            "validated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        
        validations_store.append(validation)
        return {"status": "success", "data": validation}
    
    raise HTTPException(status_code=400, detail="No assets to validate")


@app.get("/api/price")
async def get_price(
    ticker: str = Query(..., min_length=1, max_length=10),
    range: str = Query("1d", pattern="^(1h|1d|1w|1m)$"),
):
    """Get price data for a ticker (mock data for demo)."""
    # Generate mock price data
    now = datetime.now(timezone.utc)
    
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
    Uses the rule-based analysis pipeline for deterministic ripple-graph output.
    Broadcasts new events to all connected WebSocket clients in real-time.
    """
    headline_lower = request.headline.lower()
    article = {
        "headline": request.headline,
        "description": request.text or request.headline,
        "source": request.source,
        "timestamp": request.timestamp or datetime.now(timezone.utc),
        "severity": "HIGH" if any(word in headline_lower for word in ["war", "attack", "tariff", "cut", "hike"]) else "MEDIUM",
        "event_sentiment": "POSITIVE" if any(word in headline_lower for word in ["approval", "stimulus", "beat", "cut"]) else "NEGATIVE" if any(word in headline_lower for word in ["attack", "tariff", "ban", "miss"]) else "MIXED",
        "market_pressure": "RISK_ON" if any(word in headline_lower for word in ["stimulus", "approval", "cut", "beat"]) else "INFLATIONARY" if any(word in headline_lower for word in ["oil", "opec", "crude"]) else "DEFENSIVE" if any(word in headline_lower for word in ["regulation", "tariff", "war"]) else "RISK_OFF",
        "prediction_horizon": "SHORT_TERM",
        "context_meta": {"context_confidence": 0.72},
    }
    event = analysis_orchestrator.analyze_and_store(article)
    
    # Broadcast the new event to all connected WebSocket clients
    try:
        await websocket_manager.broadcast_event(event)
    except Exception as e:
        print(f"⚠️  Failed to broadcast event via WebSocket: {e}")

    return {"status": "success", "data": event}


@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time event streaming
    Clients connect and receive new events as they are ingested/processed
    """
    await websocket_manager.connect(websocket)
    try:
        # Send initial connection status
        await websocket_manager.send_connection_status(websocket, "connected")
        
        # Keep connection alive and listen for any client messages
        # (mostly for heartbeat/ping-pong, the server broadcasts events autonomously)
        while True:
            data = await websocket.receive_text()
            # Can handle client messages if needed (e.g., filters, subscriptions)
            if data:
                # Echo acknowledgment
                await websocket.send_json({
                    "type": "ack",
                    "message": "Message received"
                })
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        print(f"⚠️  Client disconnected. Active connections: {len(websocket_manager.active_connections)}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "events_count": analysis_orchestrator.event_count(),
        "validations_count": len(validations_store),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
