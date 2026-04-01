from __future__ import annotations

import json
import re
from typing import Any

from app.nlp.llm_client import generate_local_llm_json_with_meta


_TRIGGER_PATTERNS: dict[str, tuple[str, ...]] = {
    "military_conflict": ("attack", "airstrike", "missile", "troop", "conflict", "war"),
    "sanctions": ("sanction", "embargo", "blacklist", "restriction"),
    "trade_barrier": ("tariff", "trade ban", "import ban", "export curb"),
    "cyber_event": ("cyberattack", "ransomware", "outage", "hack"),
    "energy_disruption": ("pipeline", "oil field", "shipping lane", "strait", "opec"),
}

_REGION_PATTERNS: dict[str, tuple[str, ...]] = {
    "Middle East": ("middle east", "gulf", "iran", "iraq", "israel", "saudi"),
    "Eastern Europe": ("ukraine", "russia", "black sea", "eastern europe"),
    "East Asia": ("china", "taiwan", "korea", "south china sea", "japan"),
    "Global": ("global", "worldwide", "international"),
}


def _normalize_text(article: dict[str, Any]) -> str:
    return " ".join(
        part
        for part in [
            str(article.get("headline", "")).strip(),
            str(article.get("description", "")).strip(),
            str(article.get("text", "")).strip(),
        ]
        if part
    ).lower()


def _deterministic_trigger_extraction(article: dict[str, Any]) -> dict[str, Any]:
    text = _normalize_text(article)

    trigger_hits: list[tuple[str, int, list[str]]] = []
    for trigger_type, keywords in _TRIGGER_PATTERNS.items():
        hits = [word for word in keywords if word in text]
        if hits:
            trigger_hits.append((trigger_type, len(hits), hits))

    trigger_hits.sort(key=lambda item: item[1], reverse=True)
    top_trigger = trigger_hits[0][0] if trigger_hits else "macro_uncertainty"
    matched_keywords = trigger_hits[0][2] if trigger_hits else []

    regions = [region for region, patterns in _REGION_PATTERNS.items() if any(token in text for token in patterns)]
    if not regions:
        regions = ["Global"]

    risk_sentiment = "RISK_OFF" if top_trigger in {"military_conflict", "sanctions", "cyber_event", "energy_disruption"} else "RISK_ON"
    safe_haven_demand = "UP" if risk_sentiment == "RISK_OFF" else "DOWN"
    energy_supply_risk = "UP" if top_trigger in {"military_conflict", "energy_disruption", "sanctions"} else "DOWN"

    trigger_phrase = str(article.get("headline") or article.get("description") or "geopolitical development")
    trigger_phrase = re.sub(r"\s+", " ", trigger_phrase).strip()[:180]

    base_confidence = 0.55 + min(0.35, 0.08 * len(matched_keywords))
    return {
        "primary_trigger": trigger_phrase,
        "trigger_type": top_trigger,
        "regions": regions,
        "matched_keywords": matched_keywords,
        "risk_sentiment": risk_sentiment,
        "safe_haven_demand": safe_haven_demand,
        "energy_supply_risk": energy_supply_risk,
        "confidence": round(min(0.95, base_confidence), 3),
        "extraction_source": "deterministic",
        "llm_latency_ms": 0.0,
    }


def _sanitize_llm_payload(payload: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
    def _pick_enum(value: Any, allowed: set[str], default: str) -> str:
        candidate = str(value or "").strip().upper()
        return candidate if candidate in allowed else default

    llm_regions = payload.get("regions")
    if isinstance(llm_regions, list):
        regions = [str(item).strip() for item in llm_regions if str(item).strip()][:3]
    else:
        regions = fallback["regions"]

    confidence = payload.get("confidence", fallback["confidence"])
    try:
        confidence_value = max(0.0, min(1.0, float(confidence)))
    except (TypeError, ValueError):
        confidence_value = float(fallback["confidence"])

    trigger_type = str(payload.get("trigger_type", fallback["trigger_type"]))
    trigger_type = trigger_type.strip().lower() or fallback["trigger_type"]

    primary_trigger = str(payload.get("primary_trigger", fallback["primary_trigger"]))
    primary_trigger = primary_trigger.strip()[:180] or fallback["primary_trigger"]

    matched_keywords = payload.get("matched_keywords", fallback.get("matched_keywords", []))
    if not isinstance(matched_keywords, list):
        matched_keywords = fallback.get("matched_keywords", [])

    return {
        "primary_trigger": primary_trigger,
        "trigger_type": trigger_type,
        "regions": regions or fallback["regions"],
        "matched_keywords": [str(word).strip().lower() for word in matched_keywords if str(word).strip()][:6],
        "risk_sentiment": _pick_enum(payload.get("risk_sentiment"), {"RISK_ON", "RISK_OFF"}, fallback["risk_sentiment"]),
        "safe_haven_demand": _pick_enum(payload.get("safe_haven_demand"), {"UP", "DOWN", "NEUTRAL"}, fallback["safe_haven_demand"]),
        "energy_supply_risk": _pick_enum(payload.get("energy_supply_risk"), {"UP", "DOWN", "NEUTRAL"}, fallback["energy_supply_risk"]),
        "confidence": round(confidence_value, 3),
    }


async def extract_geopolitical_triggers_async(
    article: dict[str, Any],
    use_local_llm: bool,
) -> dict[str, Any]:
    """Extract geopolitical triggers and first-order impact signals from news text."""
    fallback = _deterministic_trigger_extraction(article)
    if not use_local_llm:
        return fallback

    headline = str(article.get("headline", "")).strip()
    description = str(article.get("description") or article.get("text") or "").strip()

    prompt = (
        "Extract geopolitical market trigger signals from this news item.\n"
        "Return strict JSON with keys: primary_trigger, trigger_type, regions, matched_keywords, "
        "risk_sentiment, safe_haven_demand, energy_supply_risk, confidence.\n"
        "Enums: risk_sentiment={RISK_ON,RISK_OFF}; safe_haven_demand={UP,DOWN,NEUTRAL}; "
        "energy_supply_risk={UP,DOWN,NEUTRAL}.\n"
        "No markdown, no prose.\n\n"
        f"Headline: {headline}\n"
        f"Description: {description}\n"
    )

    llm_result = await generate_local_llm_json_with_meta(
        prompt=prompt,
        fallback_payload=fallback,
    )

    if str(llm_result.get("source", "fallback")) != "llm":
        return fallback

    payload = llm_result.get("payload")
    if not isinstance(payload, dict):
        return fallback

    structured = _sanitize_llm_payload(payload, fallback)
    structured["extraction_source"] = "llm"
    structured["llm_latency_ms"] = round(float(llm_result.get("llm_latency_ms", 0.0) or 0.0), 2)
    return structured


def extract_geopolitical_triggers(article: dict[str, Any]) -> dict[str, Any]:
    """Synchronous deterministic extraction for non-LLM paths."""
    return _deterministic_trigger_extraction(article)
