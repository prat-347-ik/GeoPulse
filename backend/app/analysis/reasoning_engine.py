from __future__ import annotations

from typing import Any


def _clamp_weight(value: float) -> float:
    return round(max(-1.0, min(1.0, value)), 3)


def build_explanation(
    headline: str,
    macro_signal: str,
    primary_sector: str,
    primary_direction: str,
    top_asset: str,
) -> str:
    direction_phrase = "supports" if primary_direction == "BULLISH" else "pressures"
    return (
        f"{headline} points to {macro_signal.lower()}, which {direction_phrase} "
        f"{primary_sector.lower()} and puts {top_asset} in focus."
    )[:200]


def asset_reason(macro_signal: str, sector: str, direction: str) -> str:
    verb = "benefits" if direction == "BULLISH" else "weighs on"
    return f"{macro_signal} {verb} {sector.lower()} sensitivity."[:200]


def derive_geopolitical_second_order_effects(
    article: dict[str, Any],
    extracted_signals: dict[str, Any] | None,
) -> dict[str, Any]:
    """Translate trigger signals into second-order market effects."""
    signals = extracted_signals if isinstance(extracted_signals, dict) else {}
    trigger_type = str(signals.get("trigger_type", "")).lower()
    risk_sentiment = str(signals.get("risk_sentiment", "NEUTRAL")).upper()
    safe_haven_demand = str(signals.get("safe_haven_demand", "NEUTRAL")).upper()
    energy_supply_risk = str(signals.get("energy_supply_risk", "NEUTRAL")).upper()
    extraction_confidence = float(signals.get("confidence", 0.5) or 0.5)
    extraction_confidence = max(0.0, min(1.0, extraction_confidence))

    overlay: dict[str, float] = {}
    effects: list[str] = []

    if risk_sentiment == "RISK_OFF":
        overlay["Utilities"] = overlay.get("Utilities", 0.0) + 0.35
        overlay["Defense"] = overlay.get("Defense", 0.0) + 0.3
        overlay["Technology"] = overlay.get("Technology", 0.0) - 0.28
        effects.append("Risk-off flow rotates into defensive sectors and away from high beta tech.")
    elif risk_sentiment == "RISK_ON":
        overlay["Technology"] = overlay.get("Technology", 0.0) + 0.25
        overlay["Consumer"] = overlay.get("Consumer", 0.0) + 0.2
        effects.append("Risk-on positioning improves cyclical and growth demand.")

    if safe_haven_demand == "UP":
        overlay["Precious Metals"] = overlay.get("Precious Metals", 0.0) + 0.45
        overlay["Sovereign Bonds"] = overlay.get("Sovereign Bonds", 0.0) + 0.3
        effects.append("Safe-haven demand supports gold and long-duration sovereign bonds.")

    if energy_supply_risk == "UP":
        overlay["Energy"] = overlay.get("Energy", 0.0) + 0.4
        overlay["Transportation"] = overlay.get("Transportation", 0.0) - 0.3
        effects.append("Supply risk raises energy risk premium and pressures fuel-sensitive transport.")

    if trigger_type in {"cyber_event", "trade_barrier"}:
        overlay["Industrials"] = overlay.get("Industrials", 0.0) - 0.22
        overlay["Consumer"] = overlay.get("Consumer", 0.0) - 0.15
        effects.append("Operational and trade friction dampens industrial and consumer throughput.")

    if not effects:
        headline = str(article.get("headline", "")).strip()
        effects.append(f"Limited second-order deviation observed from baseline for: {headline[:80]}.")

    strength = round(0.2 + 0.5 * extraction_confidence, 3)
    return {
        "overlay_sector_impacts": {sector: _clamp_weight(weight) for sector, weight in overlay.items()},
        "second_order_effects": effects,
        "reasoning_strength": strength,
    }


def blend_sector_impacts(
    base_impacts: dict[str, float],
    overlay_impacts: dict[str, float],
    reasoning_strength: float,
) -> dict[str, float]:
    if not overlay_impacts:
        return dict(base_impacts)

    blended = dict(base_impacts)
    strength = max(0.0, min(1.0, reasoning_strength))
    for sector, overlay_weight in overlay_impacts.items():
        base = float(blended.get(sector, 0.0))
        blended[sector] = _clamp_weight(base + (float(overlay_weight) * strength))

    return dict(
        sorted(
            blended.items(),
            key=lambda item: abs(item[1]),
            reverse=True,
        )
    )