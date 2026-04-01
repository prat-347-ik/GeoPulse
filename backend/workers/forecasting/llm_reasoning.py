from __future__ import annotations

from typing import Any

from app.analysis.reasoning_engine import derive_geopolitical_second_order_effects


def build_geopolitical_reasoning(article: dict[str, Any]) -> dict[str, Any]:
    """Return second-order geopolitical reasoning payload for downstream predictors."""
    signals = article.get("geopolitical_signals") if isinstance(article.get("geopolitical_signals"), dict) else {}
    return derive_geopolitical_second_order_effects(article, signals)
