"""Human-readable explanation generation for deterministic outputs."""

from __future__ import annotations

import logging
from typing import Any

from app.nlp.llm_client import (
    build_deterministic_fallback,
    generate_local_llm_explanation_with_meta,
)
from app.nlp.validators import validate_llm_explanation

logger = logging.getLogger(__name__)


def _top_sector_phrase(deterministic_results: dict[str, Any]) -> str:
    sector_impacts = deterministic_results.get("sector_impacts") or []
    if isinstance(sector_impacts, dict):
        items = sorted(
            sector_impacts.items(),
            key=lambda pair: abs(float(pair[1])),
            reverse=True,
        )
        if not items:
            return "broad market sectors"
        sector, weight = items[0]
        direction = "higher" if float(weight) > 0 else "lower" if float(weight) < 0 else "sideways"
        return f"{sector} trends {direction}"

    if isinstance(sector_impacts, list) and sector_impacts:
        top = sorted(
            [impact for impact in sector_impacts if isinstance(impact, dict)],
            key=lambda item: abs(float(item.get("weight", 0))),
            reverse=True,
        )[0]
        sector = str(top.get("sector", "broad market sectors"))
        weight = float(top.get("weight", 0))
        direction = "higher" if weight > 0 else "lower" if weight < 0 else "sideways"
        return f"{sector} trends {direction}"

    return "broad market sectors"


def _top_asset_phrase(deterministic_results: dict[str, Any]) -> str:
    assets = deterministic_results.get("affected_assets") or []
    if not isinstance(assets, list) or not assets:
        return "major benchmark assets"

    top = sorted(
        [asset for asset in assets if isinstance(asset, dict)],
        key=lambda item: float(item.get("confidence", 0)),
        reverse=True,
    )[0]
    ticker = str(top.get("ticker", "market benchmarks"))
    prediction = str(top.get("prediction", "NEUTRAL")).upper()
    tone = "upside" if prediction == "BULLISH" else "downside" if prediction == "BEARISH" else "mixed"
    return f"{ticker} shows {tone} bias"


def _build_template_summary(article: dict[str, Any], deterministic_results: dict[str, Any]) -> str:
    headline = str(article.get("headline") or article.get("description") or "A macro event")
    macro_effect = str(deterministic_results.get("macro_effect") or article.get("macro_effect") or "cross-sector repricing")
    sector_phrase = _top_sector_phrase(deterministic_results)
    asset_phrase = _top_asset_phrase(deterministic_results)

    sentence1 = f"{headline} is driving {macro_effect.lower()} across risk assets."
    sentence2 = f"Deterministic signals indicate {sector_phrase}, while {asset_phrase} as liquidity reprices expected outcomes."
    return f"{sentence1} {sentence2}"


def _extract_top_sectors_and_assets(
    deterministic_results: dict[str, Any],
) -> tuple[list[str], list[str]]:
    sectors: list[str] = []
    assets: list[str] = []

    sector_impacts = deterministic_results.get("sector_impacts") or []
    if isinstance(sector_impacts, dict):
        ordered = sorted(sector_impacts.items(), key=lambda pair: abs(float(pair[1])), reverse=True)
        sectors = [str(name) for name, _ in ordered[:2]]
    elif isinstance(sector_impacts, list):
        valid = [item for item in sector_impacts if isinstance(item, dict)]
        ordered = sorted(valid, key=lambda item: abs(float(item.get("weight", 0))), reverse=True)
        sectors = [str(item.get("sector", "")).strip() for item in ordered[:2] if str(item.get("sector", "")).strip()]

    affected_assets = deterministic_results.get("affected_assets") or []
    if isinstance(affected_assets, list):
        valid_assets = [item for item in affected_assets if isinstance(item, dict)]
        ordered_assets = sorted(valid_assets, key=lambda item: float(item.get("confidence", 0)), reverse=True)
        assets = [str(item.get("ticker", "")).strip().upper() for item in ordered_assets[:2] if str(item.get("ticker", "")).strip()]

    return sectors, assets


def _build_constrained_prompt(article: dict[str, Any], deterministic_results: dict[str, Any]) -> tuple[str, list[str], list[str], str]:
    headline = str(article.get("headline") or article.get("description") or "Unknown Event").strip()
    macro_effect = str(deterministic_results.get("macro_effect") or article.get("macro_effect") or "cross-sector repricing").strip()
    top_sectors, top_assets = _extract_top_sectors_and_assets(deterministic_results)
    sectors_text = ", ".join(top_sectors) if top_sectors else "Broad Market"
    assets_text = ", ".join(top_assets) if top_assets else "Market Benchmarks"
    fallback_text = build_deterministic_fallback(
        macro_effect=macro_effect,
        top_sector=top_sectors[0] if top_sectors else "broad market sectors",
    )

    prompt = (
        "You are a financial analyst.\n"
        "Input:\n"
        f"Event: {headline}\n"
        f"Macro: {macro_effect}\n"
        f"Sectors: {sectors_text}\n"
        f"Assets: {assets_text}\n\n"
        "Rules:\n"
        "- Maximum 2 sentences.\n"
        "- No speculation or financial advice.\n"
        "- Only use provided data. Do NOT introduce new assets or sectors.\n"
        "Output: Concise explanation."
    )
    return prompt, top_sectors, top_assets, fallback_text


def _sanitize_output(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = cleaned.replace("\n", " ")
    cleaned = " ".join(cleaned.split())
    return cleaned


def _enforce_two_sentences(text: str) -> str:
    sentences = [s.strip() for s in text.split(".") if s.strip()]
    if not sentences:
        return ""
    return ".".join(sentences[:2]) + "."


def generate_summary_explanation(
    article: dict[str, Any],
    deterministic_results: dict[str, Any],
) -> str:
    """Deterministic non-LLM summary used as baseline fallback."""
    return _build_template_summary(article, deterministic_results)


async def generate_summary_explanation_async(
    article: dict[str, Any],
    deterministic_results: dict[str, Any],
    use_local_llm: bool,
) -> tuple[str, str, float]:
    """Generate a summary explanation with optional local LLM and strict guardrails."""
    prompt, top_sectors, top_assets, fallback_text = _build_constrained_prompt(article, deterministic_results)

    if not use_local_llm:
        logger.warning("Local LLM disabled, using deterministic fallback summary")
        return fallback_text, "deterministic_fallback", 0.0

    try:
        llm_result = await generate_local_llm_explanation_with_meta(
            prompt=prompt,
            fallback_text=fallback_text,
        )
        llm_latency_ms = float(llm_result.get("llm_latency_ms", 0.0) or 0.0)
        candidate = _sanitize_output(str(llm_result.get("text", "")))
        candidate = _enforce_two_sentences(candidate)
        source = str(llm_result.get("source", "deterministic_fallback"))

        is_valid = validate_llm_explanation(
            generated_text=candidate,
            allowed_sectors=top_sectors,
            allowed_assets=top_assets,
        )
        if not is_valid:
            logger.warning("LLM output validation failed, using deterministic fallback")
            return fallback_text, "deterministic_fallback", llm_latency_ms

        normalized_source = "llm" if source == "llm" else "deterministic_fallback"
        return candidate, normalized_source, llm_latency_ms
    except Exception as exc:
        logger.warning("LLM explanation generation failed, using deterministic fallback: %s", exc)
        return fallback_text, "deterministic_fallback", 0.0


async def generate_summary_explanation_with_meta_async(
    article: dict[str, Any],
    deterministic_results: dict[str, Any],
    use_local_llm: bool,
) -> dict[str, float | str]:
    """Generate explanation with source and latency metadata."""
    text, source, llm_latency_ms = await generate_summary_explanation_async(
        article=article,
        deterministic_results=deterministic_results,
        use_local_llm=use_local_llm,
    )
    return {
        "text": text,
        "source": source,
        "llm_latency_ms": round(float(llm_latency_ms), 2),
    }
