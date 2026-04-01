"""NLP augmentation pipeline.

This module enriches deterministic analysis output with:
- structured entities extracted from article text
- concise human-readable summary explanation

It does not alter deterministic sector/asset predictions.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any
import logging

from app.nlp.entity_extractor import extract_entities
from app.nlp.event_extractor import (
    extract_geopolitical_triggers,
    extract_geopolitical_triggers_async,
)
from app.nlp.explanation_generator import (
    generate_summary_explanation,
    generate_summary_explanation_async,
)

logger = logging.getLogger(__name__)


def enrich_article_with_nlp(
    article: dict[str, Any],
    deterministic_results: dict[str, Any],
) -> dict[str, Any]:
    """Augment deterministic event output with NLP metadata.

    The return value preserves all deterministic fields and appends:
    - entities: dict[str, list[str]]
    - summary_explanation: str
    """
    enriched = deepcopy(deterministic_results)
    try:
        text = " ".join(
            part for part in [
                str(article.get("headline", "")).strip(),
                str(article.get("description", "")).strip(),
                str(article.get("text", "")).strip(),
            ]
            if part
        )

        entities = extract_entities(text)
        extracted_triggers = extract_geopolitical_triggers(article)
        summary = generate_summary_explanation(article, deterministic_results)

        enriched["entities"] = entities
        enriched["geopolitical_signals"] = extracted_triggers
        enriched["summary_explanation"] = summary
        enriched["explanation_source"] = "deterministic_fallback"
        enriched["llm_latency_ms"] = 0.0
        return enriched
    except Exception as exc:
        logger.exception("NLP enrichment failed, returning deterministic result: %s", exc)
        enriched.setdefault("entities", {"organizations": [], "locations": [], "people": []})
        enriched.setdefault("geopolitical_signals", extract_geopolitical_triggers(article))
        enriched.setdefault("summary_explanation", "")
        enriched.setdefault("explanation_source", "deterministic_fallback")
        enriched.setdefault("llm_latency_ms", 0.0)
        return enriched


async def enrich_article_with_nlp_async(
    article: dict[str, Any],
    deterministic_results: dict[str, Any],
    use_local_llm: bool,
) -> dict[str, Any]:
    """Async NLP enrichment path with optional local LLM summary generation."""
    enriched = deepcopy(deterministic_results)
    try:
        text = " ".join(
            part for part in [
                str(article.get("headline", "")).strip(),
                str(article.get("description", "")).strip(),
                str(article.get("text", "")).strip(),
            ]
            if part
        )
        entities = extract_entities(text)
        extracted_triggers = await extract_geopolitical_triggers_async(article, use_local_llm=use_local_llm)
        summary, explanation_source, llm_latency_ms = await generate_summary_explanation_async(
            article=article,
            deterministic_results=deterministic_results,
            use_local_llm=use_local_llm,
        )

        enriched["entities"] = entities
        enriched["geopolitical_signals"] = extracted_triggers
        enriched["summary_explanation"] = summary
        enriched["explanation_source"] = explanation_source
        extraction_latency = float(extracted_triggers.get("llm_latency_ms", 0.0) or 0.0)
        enriched["llm_latency_ms"] = round(max(float(llm_latency_ms), extraction_latency), 2)
        return enriched
    except Exception as exc:
        logger.exception("Async NLP enrichment failed, returning deterministic result: %s", exc)
        enriched.setdefault("entities", {"organizations": [], "locations": [], "people": []})
        enriched.setdefault("geopolitical_signals", extract_geopolitical_triggers(article))
        enriched.setdefault("summary_explanation", "")
        enriched.setdefault("explanation_source", "deterministic_fallback")
        enriched.setdefault("llm_latency_ms", 0.0)
        return enriched
