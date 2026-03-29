"""NLP augmentation layer for GeoPulse deterministic pipeline."""

from app.nlp.entity_extractor import extract_entities
from app.nlp.explanation_generator import generate_summary_explanation
from app.nlp.pipeline import enrich_article_with_nlp

__all__ = [
    "extract_entities",
    "generate_summary_explanation",
    "enrich_article_with_nlp",
]
