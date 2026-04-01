from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.analysis.reasoning_engine import asset_reason, build_explanation


def _to_iso8601(value: Any) -> str:
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str) and value:
        normalized = value.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(normalized)
        except ValueError:
            return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    else:
        dt = datetime.now(timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def build_ripple_event(
    article: dict[str, Any],
    event_type: str,
    macro_signal: str,
    sector_impacts: dict[str, float],
    assets: list[dict[str, Any]],
    event_confidence: float,
    confidence_components: dict[str, float],
    source_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    primary_sector = next(iter(sector_impacts), "Broad Market")
    primary_asset = assets[0] if assets else {
        "ticker": "SPY",
        "name": "S&P 500 ETF",
        "asset_class": "Equity",
        "sector": primary_sector,
        "prediction": "NEUTRAL",
        "confidence": event_confidence,
    }
    primary_prediction = primary_asset["prediction"]

    why = build_explanation(
        headline=str(article.get("headline", "Untitled event")),
        macro_signal=macro_signal,
        primary_sector=primary_sector,
        primary_direction=primary_prediction,
        top_asset=str(primary_asset["ticker"]),
    )

    logic_chain = [
        {"type": "event", "text": str(article.get("headline", "Untitled event"))[:80]},
        {"type": "macro", "text": macro_signal},
        {"type": "sector", "text": primary_sector},
        {"type": "asset", "text": str(primary_asset["ticker"])},
    ]

    geopolitical_signals = article.get("geopolitical_signals")
    if isinstance(geopolitical_signals, dict):
        trigger_label = str(geopolitical_signals.get("trigger_type", "")).strip()
        if trigger_label:
            logic_chain.insert(1, {"type": "macro", "text": f"trigger:{trigger_label}"})

    normalized_assets = []
    for asset in assets:
        normalized_assets.append(
            {
                "ticker": asset["ticker"],
                "name": asset["name"],
                "asset_class": asset["asset_class"],
                "sector": asset["sector"],
                "prediction": asset["prediction"],
                "confidence": round(asset["confidence"], 3),
                "predicted_move_percent": float(asset.get("predicted_move_percent", 0.0) or 0.0),
                "reason": asset_reason(macro_signal, asset["sector"], asset["prediction"]),
            }
        )

    normalized_sector_impacts = []
    for sector, weight in sector_impacts.items():
        direction = "UP" if weight > 0 else "DOWN" if weight < 0 else "FLAT"
        normalized_sector_impacts.append(
            {
                "sector": sector,
                "direction": direction,
                "weight": round(weight, 3),
            }
        )

    return {
        "event_id": f"evt_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:6]}",
        "headline": str(article.get("headline", "Untitled event")),
        "source": str(article.get("source", "Unknown")),
        "timestamp": _to_iso8601(article.get("timestamp")),
        "event_type": event_type,
        "severity": str(article.get("severity", "MEDIUM")).upper(),
        "event_sentiment": str(article.get("event_sentiment", "MIXED")).upper(),
        "confidence": round(event_confidence, 3),
        "macro_effect": macro_signal,
        "sector_impacts": normalized_sector_impacts,
        "prediction_horizon": str(article.get("prediction_horizon", "MEDIUM_TERM")).upper(),
        "market_pressure": str(article.get("market_pressure", "DEFENSIVE")).upper(),
        "logic_chain": logic_chain,
        "affected_assets": normalized_assets,
        "why": why,
        "meta": {
            "llm_model": "rule-engine-v1",
            "llm_prompt_version": "analysis-v1",
            "confidence_components": confidence_components,
            "confidence_formula": "0.4*context_confidence+0.3*signal_strength+0.2*abs(sector_weight)+0.1*severity_weight",
            "source_profile": source_profile or {
                "category": "general",
                "trust": 0.5,
                "event_class_hints": [],
                "domain_weighting": {},
            },
        },
        "geopolitical_signals": geopolitical_signals if isinstance(geopolitical_signals, dict) else None,
    }