from __future__ import annotations


SECTOR_MAP: dict[str, dict[str, float]] = {
    "Oil supply contraction": {
        "Energy": 0.92,
        "Transportation": -0.72,
        "Materials": 0.35,
    },
    "Oil supply repricing": {
        "Energy": 0.7,
        "Transportation": -0.45,
        "Industrials": -0.2,
    },
    "Geopolitical risk escalation": {
        "Defense": 0.83,
        "Energy": 0.48,
        "Technology": -0.22,
    },
    "Monetary easing": {
        "Technology": 0.86,
        "Real Estate": 0.68,
        "Financials": 0.42,
    },
    "Monetary tightening": {
        "Technology": -0.8,
        "Real Estate": -0.72,
        "Utilities": 0.28,
    },
    "Fiscal stimulus": {
        "Materials": 0.82,
        "Industrials": 0.74,
        "Energy": 0.31,
    },
    "Risk appetite recovery": {
        "Technology": 0.78,
        "Consumer": 0.61,
        "Crypto": 0.72,
    },
    "Risk aversion spike": {
        "Utilities": 0.75,
        "Defense": 0.58,
        "Technology": -0.58,
    },
    "Regulatory headwind": {
        "Technology": -0.74,
        "Fintech": -0.58,
        "Crypto": -0.46,
    },
    "Regulatory tailwind": {
        "Crypto": 0.94,
        "Fintech": 0.64,
        "Technology": 0.36,
    },
    "Trade restriction": {
        "Industrials": -0.62,
        "Consumer": -0.44,
        "Materials": 0.18,
    },
    "Earnings upside surprise": {
        "Technology": 0.66,
        "Consumer": 0.52,
        "Broad Market": 0.42,
    },
    "Earnings downside revision": {
        "Technology": -0.62,
        "Consumer": -0.48,
        "Broad Market": -0.38,
    },
    "Supply chain disruption": {
        "Industrials": -0.58,
        "Consumer": -0.46,
        "Materials": 0.24,
    },
    "Technology demand acceleration": {
        "Technology": 0.88,
        "Semiconductors": 0.91,
        "Utilities": -0.08,
    },
    "Macro policy repricing": {
        "Broad Market": 0.34,
        "Technology": 0.22,
        "Financials": 0.18,
    },
}


PRESSURE_FALLBACK_MAP: dict[str, dict[str, float]] = {
    "INFLATIONARY": {"Energy": 0.68, "Materials": 0.55, "Technology": -0.35},
    "DEFENSIVE": {"Utilities": 0.7, "Defense": 0.55, "Technology": -0.28},
    "RISK_OFF": {"Utilities": 0.72, "Defense": 0.58, "Technology": -0.6},
    "RISK_ON": {"Technology": 0.81, "Consumer": 0.63, "Crypto": 0.55},
    "COST_PRESSURE": {"Energy": 0.35, "Industrials": -0.44, "Consumer": -0.42},
    "LIQUIDITY": {"Financials": 0.46, "Technology": 0.52, "Real Estate": 0.4},
}


def _sort_sector_impacts(sector_impacts: dict[str, float]) -> dict[str, float]:
    return dict(
        sorted(
            sector_impacts.items(),
            key=lambda item: abs(item[1]),
            reverse=True,
        )
    )


def map_macro_to_sectors(macro_signal: str, market_pressure: str) -> dict[str, float]:
    sectors = SECTOR_MAP.get(macro_signal)
    if sectors:
        return _sort_sector_impacts(sectors)

    fallback_sectors = PRESSURE_FALLBACK_MAP.get((market_pressure or "").upper())
    if fallback_sectors:
        ordered_fallbacks = list(_sort_sector_impacts(fallback_sectors).items())[:2]
        return dict(ordered_fallbacks)

    return {"Broad Market": 0.2}