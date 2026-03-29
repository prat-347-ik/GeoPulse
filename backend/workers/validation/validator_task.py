from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.repository import EventRepository
from app.services.orchestrator import EventStore
from app.validation.market_validator import validate_event_assets


def _parse_utc_timestamp(value: Any) -> datetime | None:
	if isinstance(value, datetime):
		dt = value
		if dt.tzinfo is None:
			dt = dt.replace(tzinfo=timezone.utc)
		return dt.astimezone(timezone.utc)
	if isinstance(value, str) and value:
		normalized = value.replace("Z", "+00:00")
		try:
			parsed = datetime.fromisoformat(normalized)
		except ValueError:
			return None
		if parsed.tzinfo is None:
			parsed = parsed.replace(tzinfo=timezone.utc)
		return parsed.astimezone(timezone.utc)
	return None


def _recent_unvalidated_from_store(
	event_store: EventStore,
	lookback_hours: int,
	batch_size: int,
) -> list[dict[str, Any]]:
	cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
	candidates = []
	for event in event_store.list(limit=max(batch_size * 3, batch_size)):
		event_ts = _parse_utc_timestamp(event.get("timestamp"))
		if event_ts is not None and event_ts < cutoff:
			continue

		is_validated = bool(event.get("is_validated", False))
		assets = event.get("affected_assets") or []
		has_pending_asset = any(asset.get("validation_status") in (None, "PENDING") for asset in assets)
		if (not is_validated) or has_pending_asset:
			candidates.append(event)

		if len(candidates) >= batch_size:
			break

	return candidates


async def validate_recent_unvalidated_events(
	event_store: EventStore,
	event_repo: EventRepository | None,
	lookback_hours: int,
	batch_size: int,
) -> dict[str, int]:
	"""Revalidate recent events and persist updated validation fields."""
	if event_repo is not None:
		candidates = await event_repo.get_recent_unvalidated_events(
			hours_ago=lookback_hours,
			limit=batch_size,
		)
	else:
		candidates = _recent_unvalidated_from_store(
			event_store=event_store,
			lookback_hours=lookback_hours,
			batch_size=batch_size,
		)

	processed = 0
	failed = 0

	for event in candidates:
		event_id = event.get("event_id")
		if not event_id:
			continue

		try:
			validated_event = await asyncio.to_thread(validate_event_assets, event)
			event_store.upsert(validated_event)

			if event_repo is not None:
				await event_repo.update_validation_fields(
					event_id=event_id,
					affected_assets=validated_event.get("affected_assets", []),
					validation_summary=validated_event.get("validation_summary", {}),
					is_validated=bool(validated_event.get("is_validated", False)),
				)

			processed += 1
		except Exception:
			failed += 1

	return {
		"processed": processed,
		"failed": failed,
		"candidates": len(candidates),
	}
