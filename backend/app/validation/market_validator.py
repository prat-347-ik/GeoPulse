from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import yfinance as yf


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _compute_daily_pct_change(ticker: str) -> float | None:
    """Fetch last two closes and return percent change."""
    history = yf.Ticker(ticker).history(period="2d")
    if history.empty or "Close" not in history or len(history["Close"]) < 2:
        return None

    prev_close = _to_float(history["Close"].iloc[-2])
    last_close = _to_float(history["Close"].iloc[-1])
    if prev_close in (None, 0.0) or last_close is None:
        return None

    return ((last_close - prev_close) / prev_close) * 100.0


def _status_for_prediction(prediction: str, pct_change: float | None) -> str:
    if pct_change is None:
        return "PENDING"

    normalized = str(prediction).upper()
    if normalized == "BULLISH" and pct_change > 0:
        return "CORRECT"
    if normalized == "BEARISH" and pct_change < 0:
        return "CORRECT"
    return "INCORRECT"


def _status_for_predicted_move(predicted_move: float | None, actual_move_24h: float | None) -> str:
    if actual_move_24h is None:
        return "PENDING"
    if predicted_move is None:
        return _status_for_prediction("NEUTRAL", actual_move_24h)

    # Treat near-flat outcomes as correct when prediction is near-flat as well.
    if abs(predicted_move) < 0.15 and abs(actual_move_24h) < 0.15:
        return "CORRECT"

    if predicted_move > 0 and actual_move_24h > 0:
        return "CORRECT"
    if predicted_move < 0 and actual_move_24h < 0:
        return "CORRECT"
    return "INCORRECT"


def validate_event_assets(event: dict[str, Any]) -> dict[str, Any]:
    """
    Validate predicted asset movement against latest market data.

    This function is intentionally synchronous so callers can execute it in
    a worker thread using asyncio.to_thread to keep request/event loops responsive.
    """
    validated_event = deepcopy(event)
    assets = validated_event.get("affected_assets") or []

    correct = 0
    incorrect = 0
    pending = 0

    for asset in assets:
        ticker = str(asset.get("ticker", "")).strip().upper()
        prediction = str(asset.get("prediction", "NEUTRAL")).upper()
        predicted_move_raw = _to_float(asset.get("predicted_move_percent"))
        validated_at = datetime.now(timezone.utc)

        pct_change: float | None = None
        if ticker:
            try:
                pct_change = _compute_daily_pct_change(ticker)
            except Exception:
                pct_change = None

        if predicted_move_raw is None:
            predicted_move_raw = 1.0 if prediction == "BULLISH" else -1.0 if prediction == "BEARISH" else 0.0

        status = _status_for_predicted_move(predicted_move_raw, pct_change)

        asset["predicted_move_percent"] = round(predicted_move_raw, 2)
        asset["actual_move_24h"] = round(pct_change, 2) if pct_change is not None else None
        asset["actual_move_pct"] = round(pct_change, 2) if pct_change is not None else None
        asset["validation_status"] = status
        asset["validated_at"] = validated_at

        if status == "CORRECT":
            correct += 1
        elif status == "INCORRECT":
            incorrect += 1
        else:
            pending += 1

    total_assets = len(assets)
    validated_event["is_validated"] = True
    validated_event["validation_summary"] = {
        "correct": correct,
        "incorrect": incorrect,
        "pending": pending,
        "accuracy": round((correct / total_assets), 3) if total_assets else 0.0,
    }

    return validated_event
