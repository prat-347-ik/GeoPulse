from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.db.repository import EventRepository
from app.services.orchestrator import EventStore
from workers.validation.validator_task import validate_recent_unvalidated_events

logger = logging.getLogger(__name__)


class BackgroundValidatorScheduler:
	def __init__(
		self,
		event_store: EventStore,
		event_repo: EventRepository | None,
		interval_seconds: int,
		lookback_hours: int,
		batch_size: int,
		on_validated: Callable[[dict], Awaitable[None]] | None = None,
	) -> None:
		self._event_store = event_store
		self._event_repo = event_repo
		self._interval_seconds = max(1, interval_seconds)
		self._lookback_hours = max(1, lookback_hours)
		self._batch_size = max(1, batch_size)
		self._on_validated = on_validated
		self._task: asyncio.Task[None] | None = None

	def start(self) -> None:
		if self._task and not self._task.done():
			return

		self._task = asyncio.create_task(self._run_loop())
		logger.info(
			"Background validator started: interval=%ss lookback=%sh batch=%s",
			self._interval_seconds,
			self._lookback_hours,
			self._batch_size,
		)

	async def stop(self) -> None:
		if self._task is None:
			return

		self._task.cancel()
		try:
			await self._task
		except asyncio.CancelledError:
			pass
		finally:
			self._task = None
			logger.info("Background validator stopped")

	async def _run_loop(self) -> None:
		while True:
			try:
				result = await validate_recent_unvalidated_events(
					event_store=self._event_store,
					event_repo=self._event_repo,
					lookback_hours=self._lookback_hours,
					batch_size=self._batch_size,
					on_validated=self._on_validated,
				)
				if result["candidates"] > 0:
					logger.info(
						"Background validation cycle: candidates=%s processed=%s failed=%s",
						result["candidates"],
						result["processed"],
						result["failed"],
					)
			except Exception:
				logger.exception("Background validation cycle failed")

			await asyncio.sleep(self._interval_seconds)
