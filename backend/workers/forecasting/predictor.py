from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.services.orchestrator import analysis_orchestrator
from app.validation.market_validator import validate_event_assets


def calculate_asset_impacts(article: dict[str, Any]) -> dict[str, Any]:
    """Run market impact prediction for a single article payload."""
    event = analysis_orchestrator.analyze_with_nlp(article)
    return event


def calculate_asset_impacts_batch(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    predictions: list[dict[str, Any]] = []
    for article in articles:
        if not isinstance(article, dict):
            continue
        predictions.append(calculate_asset_impacts(article))
    return predictions


def validate_predicted_impacts(event: dict[str, Any]) -> dict[str, Any]:
    """Validate predicted impacts against latest yfinance market data."""
    return validate_event_assets(deepcopy(event))


def calculate_and_validate(article: dict[str, Any]) -> dict[str, Any]:
    predicted = calculate_asset_impacts(article)
    return validate_predicted_impacts(predicted)
