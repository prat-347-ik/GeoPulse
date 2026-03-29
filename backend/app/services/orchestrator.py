from __future__ import annotations

from copy import deepcopy
import json
import os
from pathlib import Path
import threading
from typing import Any

from app.analysis.pipeline import AnalysisPipeline
from app.nlp.pipeline import enrich_article_with_nlp
from app.nlp.pipeline import enrich_article_with_nlp_async


def _mock_data_path() -> Path:
	return Path(__file__).resolve().parents[3] / "mock_data" / "mock_data.json"


def _infer_event_type(event: dict[str, Any]) -> str:
	macro_effect = str(event.get("macro_effect", "")).lower()
	if any(token in macro_effect for token in {"oil", "energy"}):
		return "ENERGY"
	if any(token in macro_effect for token in {"regulatory", "trade", "tariff"}):
		return "REGULATION"
	if any(token in macro_effect for token in {"earnings", "guidance"}):
		return "EARNINGS"
	if any(token in macro_effect for token in {"technology", "ai", "chip", "semiconductor"}):
		return "TECH"
	if any(token in macro_effect for token in {"supply", "logistics", "shipping"}):
		return "SUPPLY_CHAIN"
	if any(token in macro_effect for token in {"geopolitical", "war", "sanction"}):
		return "GEOPOLITICAL"
	return "MACRO"


def _normalize_seed_event(event: dict[str, Any]) -> dict[str, Any]:
	normalized = deepcopy(event)
	affected_assets = normalized.get("affected_assets", [])
	primary_asset = affected_assets[0] if affected_assets else {}
	default_confidence = 0.5
	if affected_assets:
		default_confidence = round(
			sum(float(asset.get("confidence", 0.5)) for asset in affected_assets) / len(affected_assets),
			3,
		)

	if "event_type" not in normalized:
		normalized["event_type"] = _infer_event_type(normalized)
	if "confidence" not in normalized:
		normalized["confidence"] = default_confidence
	if "sector_impacts" not in normalized:
		sector = str(primary_asset.get("sector") or "Broad Market")
		prediction = str(primary_asset.get("prediction") or "NEUTRAL").upper()
		weight = default_confidence if prediction == "BULLISH" else -default_confidence if prediction == "BEARISH" else 0.0
		direction = "UP" if weight > 0 else "DOWN" if weight < 0 else "FLAT"
		normalized["sector_impacts"] = [
			{
				"sector": sector,
				"direction": direction,
				"weight": round(weight, 3),
			}
		]

	return normalized


def load_seed_events() -> list[dict[str, Any]]:
	path = _mock_data_path()
	if not path.exists():
		return []
	with path.open("r", encoding="utf-8") as handle:
		data = json.load(handle)
	if not isinstance(data, list):
		return []
	return [_normalize_seed_event(event) for event in data if isinstance(event, dict)]


class EventStore:
	def __init__(self, seed_data: list[dict[str, Any]] | None = None) -> None:
		self._lock = threading.Lock()
		self._events: list[dict[str, Any]] = list(seed_data or [])

	def add(self, event: dict[str, Any]) -> dict[str, Any]:
		with self._lock:
			self._events.insert(0, deepcopy(event))
			return deepcopy(event)

	def list(self, limit: int | None = None) -> list[dict[str, Any]]:
		with self._lock:
			events = sorted(
				self._events,
				key=lambda item: item.get("timestamp", ""),
				reverse=True,
			)
			if limit is not None:
				events = events[:limit]
			return deepcopy(events)

	def get(self, event_id: str) -> dict[str, Any] | None:
		with self._lock:
			for event in self._events:
				if event.get("event_id") == event_id:
					return deepcopy(event)
		return None

	def count(self) -> int:
		with self._lock:
			return len(self._events)


class AnalysisOrchestrator:
	def __init__(self, event_store: EventStore | None = None) -> None:
		self.pipeline = AnalysisPipeline()
		self.event_store = event_store or EventStore(load_seed_events())

	def analyze(self, article: dict[str, Any]) -> dict[str, Any]:
		return self.pipeline.analyze(article)

	def analyze_with_nlp(self, article: dict[str, Any]) -> dict[str, Any]:
		deterministic = self.analyze(article)
		return enrich_article_with_nlp(article, deterministic)

	async def analyze_with_nlp_async(self, article: dict[str, Any]) -> dict[str, Any]:
		deterministic = self.analyze(article)
		use_local_llm = os.getenv("NLP_USE_LOCAL_LLM", "false").lower() == "true"
		if not use_local_llm:
			return enrich_article_with_nlp(article, deterministic)
		return await enrich_article_with_nlp_async(
			article=article,
			deterministic_results=deterministic,
			use_local_llm=True,
		)

	def analyze_and_store(self, article: dict[str, Any]) -> dict[str, Any]:
		event = self.analyze_with_nlp(article)
		return self.event_store.add(event)

	async def analyze_and_store_async(self, article: dict[str, Any]) -> dict[str, Any]:
		event = await self.analyze_with_nlp_async(article)
		return self.event_store.add(event)

	def list_events(self, limit: int = 10) -> list[dict[str, Any]]:
		return self.event_store.list(limit)

	def get_event(self, event_id: str) -> dict[str, Any] | None:
		return self.event_store.get(event_id)

	def event_count(self) -> int:
		return self.event_store.count()


analysis_orchestrator = AnalysisOrchestrator()
