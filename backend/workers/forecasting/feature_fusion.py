from __future__ import annotations

from typing import Any


def blend_signal_strengths(base_confidence: float, source_trust: float, reasoning_strength: float) -> float:
    """Fuse confidence features into a bounded confidence score."""
    value = (0.6 * float(base_confidence)) + (0.2 * float(source_trust)) + (0.2 * float(reasoning_strength))
    return round(max(0.0, min(0.99, value)), 3)


def fuse_forecasting_features(features: dict[str, Any]) -> dict[str, Any]:
    base_confidence = float(features.get("base_confidence", 0.5) or 0.5)
    source_trust = float(features.get("source_trust", 0.5) or 0.5)
    reasoning_strength = float(features.get("reasoning_strength", 0.4) or 0.4)
    fused_confidence = blend_signal_strengths(base_confidence, source_trust, reasoning_strength)

    enriched = dict(features)
    enriched["fused_confidence"] = fused_confidence
    return enriched
