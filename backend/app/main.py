from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
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
    SimulateRequest,
)
from app.services.orchestrator import analysis_orchestrator
from app.nlp.pipeline import enrich_article_with_nlp
from app.nlp.llm_client import warmup_local_llm
from app.nlp.llm_client import get_llm_runtime_health
from app.validation.market_validator import validate_event_assets
from app.core.config import (
    ENABLE_BACKGROUND_VALIDATOR,
    BACKGROUND_VALIDATOR_INTERVAL_SECONDS,
    BACKGROUND_VALIDATOR_LOOKBACK_HOURS,
    BACKGROUND_VALIDATOR_BATCH_SIZE,
)
from workers.scheduler import BackgroundValidatorScheduler


def _validated_at_sort_key(value):
    """Normalize various validated_at shapes to a timezone-aware datetime for safe sorting."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.min.replace(tzinfo=timezone.utc)

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


def load_mock_events():
    try:
        with open(MOCK_DATA_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


# In-memory storage (would be MongoDB in production)
events_store = analysis_orchestrator.event_store

# Repository instance (initialized at startup)
event_repo: Optional[EventRepository] = None
background_validator: Optional[BackgroundValidatorScheduler] = None


@app.on_event("startup")
async def startup_db_client():
    """Initialize MongoDB connection and create indexes"""
    global event_repo, background_validator
    try:
        await mongodb_connection.connect()
        db = mongodb_connection.get_db()
        event_repo = EventRepository(db)
        await event_repo.create_all_indexes()
        print("✅ Database initialized successfully")

        # Best-effort async warmup to reduce first-token latency for local LLM.
        if os.getenv("NLP_USE_LOCAL_LLM", "false").lower() == "true":
            asyncio.create_task(warmup_local_llm())

        if ENABLE_BACKGROUND_VALIDATOR:
            background_validator = BackgroundValidatorScheduler(
                event_store=events_store,
                event_repo=event_repo,
                interval_seconds=BACKGROUND_VALIDATOR_INTERVAL_SECONDS,
                lookback_hours=BACKGROUND_VALIDATOR_LOOKBACK_HOURS,
                batch_size=BACKGROUND_VALIDATOR_BATCH_SIZE,
            )
            background_validator.start()
    except Exception as e:
        print(f"⚠️  Could not connect to MongoDB: {e}")
        print("Using in-memory storage as fallback")

        if ENABLE_BACKGROUND_VALIDATOR:
            background_validator = BackgroundValidatorScheduler(
                event_store=events_store,
                event_repo=None,
                interval_seconds=BACKGROUND_VALIDATOR_INTERVAL_SECONDS,
                lookback_hours=BACKGROUND_VALIDATOR_LOOKBACK_HOURS,
                batch_size=BACKGROUND_VALIDATOR_BATCH_SIZE,
            )
            background_validator.start()


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close MongoDB connection on shutdown"""
    global background_validator
    if background_validator is not None:
        await background_validator.stop()
        background_validator = None
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
    
    return {
        "status": "success",
        "data": event,
        "validation": event.get("validation_summary"),
    }


@app.get("/api/validations", response_model=ValidationResponse)
async def get_validations(limit: int = Query(20, ge=1, le=100)):
    """Get validation results."""
    events = analysis_orchestrator.list_events(limit=200)
    materialized_validations = []

    for event in events:
        affected_assets = event.get("affected_assets", [])
        if not isinstance(affected_assets, list):
            continue

        for asset in affected_assets:
            if not isinstance(asset, dict):
                continue

            validation_status = asset.get("validation_status")
            if not validation_status:
                continue

            actual_move_pct = asset.get("actual_move_pct")
            materialized_validations.append(
                {
                    "event_id": event.get("event_id", ""),
                    "headline": event.get("headline", ""),
                    "predicted_direction": asset.get("prediction", "NEUTRAL"),
                    "predicted_ticker": asset.get("ticker", ""),
                    "predicted_confidence": asset.get("confidence", 0.5),
                    "horizon": "1d",
                    "price_at_event": 0.0,
                    "price_at_validation": 0.0,
                    "actual_change_percent": actual_move_pct if actual_move_pct is not None else 0.0,
                    "status": validation_status,
                    "validated_at": asset.get("validated_at"),
                }
            )

    sorted_validations = sorted(
        materialized_validations,
        key=lambda x: _validated_at_sort_key(x.get("validated_at")),
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

    validated_event = await asyncio.to_thread(validate_event_assets, event)

    # Keep in-memory store consistent with latest validated payload.
    events_store.upsert(validated_event)

    if event_repo is not None:
        try:
            await event_repo.update_validation_fields(
                event_id=event_id,
                affected_assets=validated_event.get("affected_assets", []),
                validation_summary=validated_event.get("validation_summary", {}),
                is_validated=bool(validated_event.get("is_validated", False)),
            )
        except Exception as exc:
            print(f"⚠️  Could not persist validation update for {event_id}: {exc}")

    summary = validated_event.get("validation_summary", {})
    return {
        "status": "success",
        "data": {
            "event_id": event_id,
            "horizon": horizon,
            "correct": summary.get("correct", 0),
            "incorrect": summary.get("incorrect", 0),
            "pending": summary.get("pending", 0),
            "accuracy": summary.get("accuracy", 0.0),
            "affected_assets": validated_event.get("affected_assets", []),
        },
    }


@app.get("/api/price")
async def get_price(
    ticker: str = Query(..., min_length=1, max_length=10),
    price_range: str = Query("1d", pattern="^(1h|1d|1w|1m)$"),
    legacy_range: Optional[str] = Query(None, alias="range", pattern="^(1h|1d|1w|1m)$"),
):
    """Get price data for a ticker (mock data for demo)."""
    try:
        effective_range = legacy_range or price_range

        # Generate mock price data
        now = datetime.now(timezone.utc)

        range_hours = {
            "1h": 1,
            "1d": 24,
            "1w": 168,
            "1m": 720,
        }
        hours = range_hours.get(effective_range, 24)

        # Add some variety based on ticker
        ticker_seed = sum(ord(c) for c in ticker)
        random.seed(ticker_seed)
        base_price = 50 + random.random() * 200

        prices = []
        for i in range(hours):
            sample_time = now - timedelta(hours=hours - i)
            # Generate somewhat realistic price movement
            noise = random.gauss(0, 0.5)
            trend = 0.01 * (i / hours)  # Slight upward trend
            price = base_price * (1 + trend + noise / 100)
            prices.append({
                "time": sample_time.isoformat() + "Z",
                "price": round(price, 2),
            })

        random.seed()  # Reset seed

        return {
            "ticker": ticker,
            "prices": prices,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Unable to fetch price data",
                "ticker": ticker,
                "price_range": effective_range,
                "error": str(exc),
            },
        )


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
    event = await analysis_orchestrator.analyze_and_store_async(article)

    if event_repo is not None:
        try:
            await event_repo.upsert_event(event)
        except Exception as exc:
            print(f"⚠️  Could not persist analyzed event {event.get('event_id', '')}: {exc}")
    
    # Broadcast the new event to all connected WebSocket clients
    try:
        await websocket_manager.broadcast_event(event)
    except Exception as e:
        print(f"⚠️  Failed to broadcast event via WebSocket: {e}")

    return {"status": "success", "data": event}


@app.post("/api/simulate")
async def simulate_scenario(request: SimulateRequest):
    """Run deterministic + NLP augmentation for a scenario without persisting."""
    scenario = request.scenario.strip()
    if not scenario:
        raise HTTPException(status_code=400, detail="Scenario cannot be empty")

    scenario_lower = scenario.lower()
    article = {
        "headline": scenario,
        "description": scenario,
        "source": "Scenario Simulator",
        "timestamp": datetime.now(timezone.utc),
        "severity": "HIGH" if any(word in scenario_lower for word in ["war", "attack", "ban", "tariff", "sanction"]) else "MEDIUM",
        "event_sentiment": "NEGATIVE" if any(word in scenario_lower for word in ["ban", "war", "attack", "sanction"]) else "MIXED",
        "market_pressure": "RISK_OFF" if any(word in scenario_lower for word in ["ban", "war", "attack", "sanction"]) else "DEFENSIVE",
        "prediction_horizon": "SHORT_TERM",
        "context_meta": {"context_confidence": 0.7},
        "text": scenario,
    }

    use_local_llm = os.getenv("NLP_USE_LOCAL_LLM", "false").lower() == "true"
    deterministic_results = analysis_orchestrator.analyze(article)
    if use_local_llm:
        # Phase 1 rollout: simulate endpoint uses async LLM path first.
        from app.nlp.pipeline import enrich_article_with_nlp_async

        enriched_results = await enrich_article_with_nlp_async(
            article=article,
            deterministic_results=deterministic_results,
            use_local_llm=True,
        )
    else:
        enriched_results = enrich_article_with_nlp(article, deterministic_results)

    return {
        "status": "success",
        "data": {
            "headline": enriched_results.get("headline"),
            "event_type": enriched_results.get("event_type"),
            "confidence": enriched_results.get("confidence"),
            "sector_impacts": enriched_results.get("sector_impacts", []),
            "affected_assets": enriched_results.get("affected_assets", []),
            "entities": enriched_results.get("entities", {"organizations": [], "locations": [], "people": []}),
            "explanation": enriched_results.get("explanation", enriched_results.get("summary_explanation", "")),
            "explanation_source": enriched_results.get("explanation_source", "deterministic_fallback"),
            "llm_latency_ms": enriched_results.get("llm_latency_ms", 0.0),
            "summary_explanation": enriched_results.get("summary_explanation", ""),
        },
    }


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
    validations_count = sum(
        1
        for event in analysis_orchestrator.list_events(limit=200)
        for asset in event.get("affected_assets", [])
        if asset.get("validation_status")
    )
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "events_count": analysis_orchestrator.event_count(),
        "validations_count": validations_count,
    }


@app.get("/api/llm/health")
async def llm_health_check():
    """Report local LLM runtime status and configured model availability."""
    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "data": get_llm_runtime_health(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
