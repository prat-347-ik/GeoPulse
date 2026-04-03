from __future__ import annotations

import os


def _env_flag(name: str, default: bool) -> bool:
	value = os.getenv(name)
	if value is None:
		return default
	return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int = 1) -> int:
	value = os.getenv(name)
	if value is None:
		return default
	try:
		parsed = int(value)
	except (TypeError, ValueError):
		return default
	return max(minimum, parsed)


ENABLE_MARKET_VALIDATION = _env_flag("ENABLE_MARKET_VALIDATION", True)
ENABLE_LLM = _env_flag("NLP_USE_LOCAL_LLM", _env_flag("ENABLE_LLM", True))
ENABLE_BACKGROUND_VALIDATOR = _env_flag("ENABLE_BACKGROUND_VALIDATOR", True)
BACKGROUND_VALIDATOR_INTERVAL_SECONDS = _env_int("BACKGROUND_VALIDATOR_INTERVAL_SECONDS", 300)
BACKGROUND_VALIDATOR_LOOKBACK_HOURS = _env_int("BACKGROUND_VALIDATOR_LOOKBACK_HOURS", 24)
BACKGROUND_VALIDATOR_BATCH_SIZE = _env_int("BACKGROUND_VALIDATOR_BATCH_SIZE", 50)
