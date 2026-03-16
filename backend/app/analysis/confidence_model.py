from __future__ import annotations

from typing import Any


_SEVERITY_WEIGHTS = {
    "LOW": 0.35,
    "MEDIUM": 0.65,
    "HIGH": 0.9,
}


def compute_confidence(
    context_confidence: float,
    severity: str,
    sector_weight: float,
    signal_strength: float,
) -> float:
    severity_weight = _SEVERITY_WEIGHTS.get((severity or "").upper(), 0.45)
    score = (
        0.4 * max(0.0, min(1.0, context_confidence))
        + 0.3 * max(0.0, min(1.0, signal_strength))
        + 0.2 * max(0.0, min(1.0, abs(sector_weight)))
        + 0.1 * severity_weight
    )
    return round(max(0.0, min(1.0, score)), 3)


def confidence_meta(
    context_confidence: float,
    signal_strength: float,
    sector_weight: float,
) -> dict[str, Any]:
    return {
        "llm_score": round(max(0.0, min(1.0, context_confidence)), 3),
        "sentiment_strength": round(max(0.0, min(1.0, signal_strength)), 3),
        "historical_similarity": round(max(0.0, min(1.0, abs(sector_weight))), 3),
    }