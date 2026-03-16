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
    macro_signal: str,
    sector_impacts: dict[str, float],
    assets: list[dict[str, Any]],
    confidence_components: dict[str, float],
) -> dict[str, Any]:
    primary_sector = next(iter(sector_impacts))
    primary_asset = assets[0]
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
                "reason": asset_reason(macro_signal, asset["sector"], asset["prediction"]),
            }
        )

    return {
        "event_id": f"evt_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:6]}",
        "headline": str(article.get("headline", "Untitled event")),
        "source": str(article.get("source", "Unknown")),
        "timestamp": _to_iso8601(article.get("timestamp")),
        "severity": str(article.get("severity", "MEDIUM")).upper(),
        "event_sentiment": str(article.get("event_sentiment", "MIXED")).upper(),
        "macro_effect": macro_signal,
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
        },
    }