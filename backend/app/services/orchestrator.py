from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import threading
from typing import Any

from app.analysis.pipeline import AnalysisPipeline


def _mock_data_path() -> Path:
	return Path(__file__).resolve().parents[3] / "mock_data" / "mock_data.json"


def load_seed_events() -> list[dict[str, Any]]:
	path = _mock_data_path()
	if not path.exists():
		return []
	with path.open("r", encoding="utf-8") as handle:
		data = json.load(handle)
	return data if isinstance(data, list) else []


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

	def analyze_and_store(self, article: dict[str, Any]) -> dict[str, Any]:
		event = self.analyze(article)
		return self.event_store.add(event)

	def list_events(self, limit: int = 10) -> list[dict[str, Any]]:
		return self.event_store.list(limit)

	def get_event(self, event_id: str) -> dict[str, Any] | None:
		return self.event_store.get(event_id)

	def event_count(self) -> int:
		return self.event_store.count()


analysis_orchestrator = AnalysisOrchestrator()
