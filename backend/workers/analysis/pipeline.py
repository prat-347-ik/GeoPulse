from __future__ import annotations

import logging
import queue as _queue_mod
from typing import Any

from app.services.orchestrator import analysis_orchestrator

logger = logging.getLogger(__name__)


def analysis_worker(input_queue: Any, output_queue: Any) -> None:
    """Consume enriched articles, analyze them, store the result, and forward it."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    logger.info("Analysis worker started.")

    while True:
        try:
            article = input_queue.get(timeout=5)
        except _queue_mod.Empty:
            continue
        except (EOFError, OSError):
            logger.info("Input queue closed -- shutting down.")
            break

        if article is None:
            output_queue.put(None)
            logger.info("Sentinel received -- shutting down.")
            break

        try:
            event = analysis_orchestrator.analyze_and_store(article)
            output_queue.put(event, timeout=2)
        except _queue_mod.Full:
            logger.warning(
                "Output queue full -- dropping analyzed event for: %r",
                article.get("headline", ""),
            )
        except Exception as exc:
            logger.exception(
                "Analysis failed for %r: %s",
                article.get("headline", ""),
                exc,
            )