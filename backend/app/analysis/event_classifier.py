from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any


_TOKEN_RE = re.compile(r"\b[a-z0-9]+\b")


@dataclass(frozen=True)
class EventClassification:
    event_type: str
    macro_signal: str
    signal_strength: float
    matched_keywords: tuple[str, ...]


_CLASSIFICATION_RULES: tuple[tuple[str, tuple[str, ...], str], ...] = (
    ("ENERGY", ("opec", "oil", "crude", "refinery", "production", "barrels", "saudi"), "Oil supply contraction"),
    ("GEOPOLITICAL", ("war", "missile", "attack", "sanction", "conflict", "nato", "strike"), "Geopolitical risk escalation"),
    ("MACRO", ("fed", "rate", "rates", "inflation", "cpi", "ppi", "stimulus", "infrastructure", "liquidity"), "Macro policy repricing"),
    ("REGULATION", ("regulation", "regulatory", "sec", "bill", "ban", "tariff", "tariffs", "approval", "approves", "etf"), "Regulatory regime shift"),
    ("EARNINGS", ("earnings", "guidance", "revenue", "profit", "margin", "beat", "miss"), "Earnings revision"),
    ("SUPPLY_CHAIN", ("shortage", "disruption", "shutdown", "shipping", "freight", "logistics", "factory"), "Supply chain disruption"),
    ("TECH", ("ai", "chip", "chips", "semiconductor", "data", "cloud", "software"), "Technology demand acceleration"),
)

_DEFAULT_SIGNAL_BY_EVENT_TYPE: dict[str, str] = {
    event_type: signal for event_type, _, signal in _CLASSIFICATION_RULES
}


def _tokenise(text: str) -> list[str]:
    return _TOKEN_RE.findall((text or "").lower())


def classify_event(article: dict[str, Any]) -> EventClassification:
    text = " ".join(
        str(article.get(field, ""))
        for field in ("headline", "description", "summary")
    ).lower()
    tokens = _tokenise(text)
    token_set = set(tokens)

    source_hints = {
        str(hint).strip().upper()
        for hint in article.get("source_meta", {}).get("event_class_hints", [])
        if str(hint).strip()
    }

    best_event_type = "MACRO"
    best_macro_signal = str(article.get("macro_effect") or "Macro policy repricing")
    best_matches: tuple[str, ...] = ()
    best_score = 0.0
    best_hint_match = False

    for event_type, keywords, default_signal in _CLASSIFICATION_RULES:
        matches = tuple(keyword for keyword in keywords if keyword in token_set)
        hint_match = event_type in source_hints
        score = float(len(matches)) + (1.0 if hint_match else 0.0)
        if score > best_score:
            best_event_type = event_type
            best_macro_signal = default_signal
            best_matches = matches
            best_score = score
            best_hint_match = hint_match

    headline = str(article.get("headline", "")).lower()
    market_pressure = str(article.get("market_pressure", "") or "").upper()

    if best_event_type == "MACRO":
        if "cut" in headline and any(word in token_set for word in {"rate", "rates", "fed", "ecb"}):
            best_macro_signal = "Monetary easing"
        elif any(word in token_set for word in {"hike", "hawkish", "tightening"}):
            best_macro_signal = "Monetary tightening"
        elif any(word in token_set for word in {"stimulus", "infrastructure"}):
            best_macro_signal = "Fiscal stimulus"
    elif best_event_type == "ENERGY":
        if any(word in token_set for word in {"increase", "surplus", "output"}):
            best_macro_signal = "Oil supply repricing"
        else:
            best_macro_signal = "Oil supply contraction"
    elif best_event_type == "REGULATION":
        if any(word in token_set for word in {"approval", "approves", "approved", "etf"}):
            best_macro_signal = "Regulatory tailwind"
        elif any(word in token_set for word in {"tariff", "tariffs"}):
            best_macro_signal = "Trade restriction"
        else:
            best_macro_signal = "Regulatory headwind"
    elif best_event_type == "EARNINGS":
        if any(word in token_set for word in {"beat", "beats", "record", "growth"}):
            best_macro_signal = "Earnings upside surprise"
        else:
            best_macro_signal = "Earnings downside revision"
    elif best_event_type == "TECH":
        best_macro_signal = "Technology demand acceleration"
    elif best_event_type == "SUPPLY_CHAIN":
        best_macro_signal = "Supply chain disruption"
    elif best_event_type == "GEOPOLITICAL":
        best_macro_signal = "Geopolitical risk escalation"

    if not best_matches and market_pressure == "RISK_ON":
        best_macro_signal = "Risk appetite recovery"
    elif not best_matches and market_pressure == "RISK_OFF":
        best_macro_signal = "Risk aversion spike"

    if not best_matches and source_hints:
        hinted_type = next(iter(source_hints))
        if hinted_type in _DEFAULT_SIGNAL_BY_EVENT_TYPE:
            best_event_type = hinted_type
            best_macro_signal = _DEFAULT_SIGNAL_BY_EVENT_TYPE[hinted_type]

    raw_strength = min(1.0, (len(best_matches) + (0.75 if best_hint_match else 0.0)) / 4.0) if (best_matches or best_hint_match) else 0.25
    signal_strength = round(max(0.25, raw_strength), 3)

    return EventClassification(
        event_type=best_event_type,
        macro_signal=best_macro_signal,
        signal_strength=signal_strength,
        matched_keywords=best_matches,
    )