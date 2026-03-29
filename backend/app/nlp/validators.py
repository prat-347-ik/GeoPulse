"""Validation utilities for LLM-generated financial explanations."""

from __future__ import annotations

import re
from typing import Iterable


EXTREME_BANNED_WORDS = {
    "crash",
    "collapse",
    "guaranteed",
}

SECTOR_LEXICON = {
    "energy",
    "technology",
    "tech",
    "financials",
    "healthcare",
    "industrials",
    "materials",
    "utilities",
    "real estate",
    "consumer staples",
    "consumer discretionary",
    "communication services",
    "semiconductors",
}

TICKER_PATTERN = re.compile(r"\b[A-Z]{2,5}\b")


def _normalize_list(values: Iterable[str]) -> set[str]:
    return {str(v).strip().lower() for v in values if str(v).strip()}


def validate_llm_explanation(
    generated_text: str,
    allowed_sectors: list[str],
    allowed_assets: list[str],
) -> bool:
    """Validate generated explanation against anti-hallucination constraints."""
    text = (generated_text or "").strip()
    if not text:
        return False

    lowered = text.lower()

    # Constraint: max 2 sentences.
    sentence_count = len([s for s in re.split(r"[.!?]+", text) if s.strip()])
    if sentence_count == 0 or sentence_count > 2:
        return False

    # Anti-hallucination terms.
    if any(word in lowered for word in EXTREME_BANNED_WORDS):
        return False

    allowed_sector_set = _normalize_list(allowed_sectors)
    allowed_asset_set = {item.upper() for item in allowed_assets if str(item).strip()}

    # Drift check for sectors.
    for sector_word in SECTOR_LEXICON:
        if sector_word in lowered and sector_word not in allowed_sector_set:
            return False

    # Drift check for tickers.
    mentioned_tickers = set(TICKER_PATTERN.findall(text))
    whitelist = {"USD", "GDP", "CPI", "OPEC", "US", "EU", "UK"}
    for ticker in mentioned_tickers:
        if ticker in whitelist:
            continue
        if ticker not in allowed_asset_set:
            return False

    return True
