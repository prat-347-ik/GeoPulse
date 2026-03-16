from __future__ import annotations


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