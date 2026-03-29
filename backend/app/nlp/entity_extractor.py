"""spaCy-based entity extraction with safe fallbacks.

This module is intentionally resilient: NLP failures never break the main
deterministic analysis pipeline.
"""

from __future__ import annotations

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

_NLP = None
_MODEL_LOAD_ATTEMPTED = False


def _load_nlp_model():
    """Lazy-load spaCy model once, returning None if unavailable."""
    global _NLP, _MODEL_LOAD_ATTEMPTED
    if _MODEL_LOAD_ATTEMPTED:
        return _NLP

    _MODEL_LOAD_ATTEMPTED = True
    try:
        import spacy

        _NLP = spacy.load("en_core_web_sm")
        logger.info("Loaded spaCy model: en_core_web_sm")
    except Exception as exc:
        _NLP = None
        logger.warning("spaCy model unavailable, entity extraction disabled: %s", exc)

    return _NLP


def _dedupe_preserve_order(items: List[str]) -> List[str]:
    seen: set[str] = set()
    output: List[str] = []
    for item in items:
        normalized = item.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(normalized)
    return output


def extract_entities(text: str) -> Dict[str, List[str]]:
    """Extract key entities from text.

    Returns a stable structure even when spaCy/model is unavailable.
    Keys:
    - organizations: ORG
    - locations: GPE + LOC
    - people: PERSON
    """
    empty = {"organizations": [], "locations": [], "people": []}
    if not text or not text.strip():
        return empty

    nlp = _load_nlp_model()
    if nlp is None:
        return empty

    try:
        doc = nlp(text)
        organizations = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
        locations = [ent.text for ent in doc.ents if ent.label_ in {"GPE", "LOC"}]
        people = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]

        return {
            "organizations": _dedupe_preserve_order(organizations),
            "locations": _dedupe_preserve_order(locations),
            "people": _dedupe_preserve_order(people),
        }
    except Exception as exc:
        logger.exception("Entity extraction failed: %s", exc)
        return empty
