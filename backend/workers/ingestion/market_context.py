"""
Market-context enrichment for the GeoPulse ingestion pipeline.

This module turns a raw RSS article into a lightweight market context profile
using deterministic keyword heuristics (no external API calls or ML models).

The goal is to produce stable, schema-aligned fields consumed downstream:
  - severity            : LOW | MEDIUM | HIGH
  - event_sentiment     : POSITIVE | NEGATIVE | MIXED
  - market_pressure     : INFLATIONARY | DEFENSIVE | RISK_OFF |
						  RISK_ON | COST_PRESSURE | LIQUIDITY
  - prediction_horizon  : SHORT_TERM | MEDIUM_TERM | LONG_TERM
  - macro_effect        : short human-readable summary

Design mirrors the deduplicator worker:
  - stateful class with internal lock and metrics
  - pure helper functions for normalization/scoring
  - long-running multiprocessing worker with sentinel propagation
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import logging
import queue as _queue_mod
import re
import threading
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_CONFIDENCE_FLOOR: float = 0.35

# Lightweight token extraction for stable keyword matching.
_TOKEN_RE = re.compile(r"\b[a-z0-9]+\b")


_POSITIVE_WORDS: frozenset[str] = frozenset(
	{
		"beat", "beats", "bullish", "bull", "growth", "expand", "expands",
		"expansion", "surge", "surges", "rally", "rallies", "gain", "gains",
		"upgrade", "upgrades", "easing", "softening", "optimism", "strong",
		"record", "rebound", "recover", "recovery", "stimulus", "support",
		"cut", "cuts", "cool", "cools", "cooling", "improve", "improved",
		"deescalation", "ceasefire", "approval", "approved",
	}
)

_NEGATIVE_WORDS: frozenset[str] = frozenset(
	{
		"miss", "misses", "bearish", "bear", "decline", "declines", "drop",
		"drops", "selloff", "sell-off", "warning", "downgrade", "downgrades",
		"inflation", "tariff", "tariffs", "sanction", "sanctions", "conflict",
		"war", "strike", "disruption", "shortage", "default", "recession",
		"layoff", "layoffs", "lawsuit", "ban", "banned", "investigation",
		"probe", "crisis", "outage", "volatility", "risk", "tightening",
		"hawkish",
	}
)


_PRESSURE_KEYWORDS: dict[str, frozenset[str]] = {
	"INFLATIONARY": frozenset(
		{
			"inflation", "cpi", "ppi", "wage", "wages", "hot", "sticky",
			"overheat", "overheating", "price", "prices", "commodity", "oil",
			"gas", "shipping", "freight",
		}
	),
	"DEFENSIVE": frozenset(
		{
			"slowdown", "recession", "uncertainty", "hedge", "defensive",
			"safehaven", "safe", "haven", "utilities", "staples",
			"flight", "protection",
		}
	),
	"RISK_OFF": frozenset(
		{
			"selloff", "sell", "off", "drawdown", "panic", "war", "conflict",
			"attack", "sanction", "default", "downgrade", "volatility",
			"geopolitical", "fear", "shock",
		}
	),
	"RISK_ON": frozenset(
		{
			"rally", "breakout", "optimism", "riskon", "softlanding",
			"soft", "landing", "stimulus", "approval", "deal", "ceasefire",
			"easing", "rebound", "recovery",
		}
	),
	"COST_PRESSURE": frozenset(
		{
			"tariff", "tariffs", "cost", "costs", "margin", "margins",
			"input", "inputs", "shortage", "wage", "wages", "rent",
			"freight", "squeeze",
		}
	),
	"LIQUIDITY": frozenset(
		{
			"rate", "rates", "fed", "ecb", "boj", "liquidity", "tightening",
			"qt", "qe", "hike", "hikes", "cut", "cuts", "yield", "repo",
			"credit", "funding",
		}
	),
}


_HORIZON_HINTS: dict[str, frozenset[str]] = {
	"SHORT_TERM": frozenset(
		{
			"today", "overnight", "immediate", "instant", "now", "hours",
			"intraday", "thisweek", "this", "week", "guidance",
		}
	),
	"MEDIUM_TERM": frozenset(
		{
			"months", "quarter", "quarterly", "q1", "q2", "q3", "q4",
			"midterm", "mid", "term", "season", "h2", "h1",
		}
	),
	"LONG_TERM": frozenset(
		{
			"year", "years", "structural", "secular", "decade", "longterm",
			"long", "term", "2030", "2040", "roadmap", "investment",
			"capex", "infrastructure",
		}
	),
}


_SEVERITY_HIGH_HINTS: frozenset[str] = frozenset(
	{
		"war", "attack", "default", "bankruptcy", "ban", "sanction", "crisis",
		"collapse", "emergency", "probe", "investigation", "outage",
		"shutdown", "earthquake", "explosion",
	}
)

_SEVERITY_MEDIUM_HINTS: frozenset[str] = frozenset(
	{
		"tariff", "strike", "inflation", "rate", "hike", "cut", "guidance",
		"forecast", "warning", "downgrade", "upgrade", "miss", "beat",
	}
)


# ---------------------------------------------------------------------------
# Text normalization helpers
# ---------------------------------------------------------------------------


def _extract_text(article: dict[str, Any]) -> str:
	"""Concatenate relevant free-text fields from an article payload."""
	parts = [
		str(article.get("headline", "") or article.get("title", "")),
		str(article.get("description", "") or article.get("summary", "")),
		str(article.get("source", "")),
	]
	return " ".join(p for p in parts if p).strip()


def _tokenise(text: str) -> list[str]:
	if not text:
		return []
	return _TOKEN_RE.findall(text.lower())


def _score_keywords(tokens: list[str], keywords: frozenset[str]) -> int:
	return sum(1 for tok in tokens if tok in keywords)


def _classify_sentiment(tokens: list[str]) -> tuple[str, float]:
	"""
	Return (sentiment_label, confidence) using token polarity counts.
	"""
	pos = _score_keywords(tokens, _POSITIVE_WORDS)
	neg = _score_keywords(tokens, _NEGATIVE_WORDS)

	if pos == 0 and neg == 0:
		return "MIXED", _DEFAULT_CONFIDENCE_FLOOR

	if pos > neg:
		conf = min(0.95, 0.5 + (pos - neg) / max(4.0, pos + neg))
		return "POSITIVE", conf

	if neg > pos:
		conf = min(0.95, 0.5 + (neg - pos) / max(4.0, pos + neg))
		return "NEGATIVE", conf

	return "MIXED", 0.55


def _classify_market_pressure(tokens: list[str]) -> tuple[str, float, dict[str, int]]:
	"""
	Return (pressure, confidence, raw_scores) from keyword family scores.
	"""
	scores = {
		pressure: _score_keywords(tokens, words)
		for pressure, words in _PRESSURE_KEYWORDS.items()
	}
	winner, best = max(scores.items(), key=lambda kv: kv[1])

	if best == 0:
		return "DEFENSIVE", _DEFAULT_CONFIDENCE_FLOOR, scores

	total = max(1, sum(scores.values()))
	conf = min(0.95, 0.45 + best / total)
	return winner, conf, scores


def _classify_horizon(tokens: list[str]) -> tuple[str, float]:
	scores = {
		horizon: _score_keywords(tokens, words)
		for horizon, words in _HORIZON_HINTS.items()
	}
	winner, best = max(scores.items(), key=lambda kv: kv[1])

	if best == 0:
		return "MEDIUM_TERM", _DEFAULT_CONFIDENCE_FLOOR

	conf = min(0.9, 0.5 + best / max(5.0, sum(scores.values())))
	return winner, conf


def _extract_percent_moves(text: str) -> list[float]:
	"""Extract numeric percentages like '3.5%' for severity calibration."""
	values: list[float] = []
	for match in re.findall(r"([-+]?\d+(?:\.\d+)?)\s*%", text):
		try:
			values.append(abs(float(match)))
		except ValueError:
			continue
	return values


def _classify_severity(tokens: list[str], raw_text: str) -> tuple[str, float]:
	high_hits = _score_keywords(tokens, _SEVERITY_HIGH_HINTS)
	med_hits = _score_keywords(tokens, _SEVERITY_MEDIUM_HINTS)
	pct_moves = _extract_percent_moves(raw_text)

	largest_move = max(pct_moves) if pct_moves else 0.0

	# Numeric moves in headlines/descriptions are a strong proxy for impact.
	if high_hits >= 1 or largest_move >= 5.0:
		return "HIGH", 0.8
	if med_hits >= 1 or largest_move >= 2.0:
		return "MEDIUM", 0.65
	return "LOW", 0.55


def _build_macro_effect(pressure: str, sentiment: str) -> str:
	templates = {
		"INFLATIONARY": "Inflation-sensitive sectors may face valuation pressure.",
		"DEFENSIVE": "Risk appetite may rotate into defensive assets and cashflows.",
		"RISK_OFF": "Cross-asset positioning may de-risk with higher volatility.",
		"RISK_ON": "Cyclical assets may benefit from improving risk appetite.",
		"COST_PRESSURE": "Input-cost and margin pressure may weigh on earnings outlooks.",
		"LIQUIDITY": "Funding conditions and rate expectations may drive repricing.",
	}
	base = templates.get(pressure, templates["DEFENSIVE"])
	if sentiment == "POSITIVE":
		return f"{base} Near-term tone is supportive."
	if sentiment == "NEGATIVE":
		return f"{base} Near-term tone is adverse."
	return f"{base} Near-term tone is mixed."


def _utc_now_iso() -> str:
	return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Enricher
# ---------------------------------------------------------------------------


class MarketContextEnricher:
	"""
	Thread-safe market-context enrichment engine for article dictionaries.

	Example
	-------
	::

		enricher = MarketContextEnricher()
		enriched = enricher.enrich(raw_article)
	"""

	def __init__(self) -> None:
		self._lock = threading.Lock()
		self.metrics: dict[str, int] = {
			"processed": 0,
			"fallback_defaults": 0,
			"high_severity": 0,
			"risk_off": 0,
			"risk_on": 0,
		}
		self._pressure_counter: Counter[str] = Counter()

	def enrich(self, article: dict[str, Any]) -> dict[str, Any]:
		"""
		Return a shallow-copied article enriched with market context fields.
		"""
		with self._lock:
			return self._enrich_unlocked(article)

	def reset_metrics(self) -> dict[str, int]:
		"""Return a snapshot of metrics and reset all counters to zero."""
		with self._lock:
			snapshot = dict(self.metrics)
			for key in self.metrics:
				self.metrics[key] = 0
			self._pressure_counter.clear()
		return snapshot

	def top_market_pressures(self, n: int = 3) -> list[tuple[str, int]]:
		"""Return the most frequent inferred pressure labels."""
		with self._lock:
			return self._pressure_counter.most_common(max(1, n))

	def _enrich_unlocked(self, article: dict[str, Any]) -> dict[str, Any]:
		data = dict(article)
		text = _extract_text(data)
		tokens = _tokenise(text)

		sentiment, sent_conf = _classify_sentiment(tokens)
		pressure, pressure_conf, pressure_scores = _classify_market_pressure(tokens)
		horizon, horizon_conf = _classify_horizon(tokens)
		severity, severity_conf = _classify_severity(tokens, text)

		macro_effect = _build_macro_effect(pressure, sentiment)

		confidences = [sent_conf, pressure_conf, horizon_conf, severity_conf]
		context_confidence = round(sum(confidences) / len(confidences), 3)

		data["event_sentiment"] = sentiment
		data["market_pressure"] = pressure
		data["prediction_horizon"] = horizon
		data["severity"] = severity
		data["macro_effect"] = macro_effect
		data.setdefault("timestamp", _utc_now_iso())

		data["context_meta"] = {
			"version": "rule-v1",
			"context_confidence": context_confidence,
			"signals": {
				"token_count": len(tokens),
				"pressure_scores": pressure_scores,
			},
			"enriched_at": _utc_now_iso(),
		}

		self.metrics["processed"] += 1
		self._pressure_counter[pressure] += 1

		if len(tokens) < 5:
			self.metrics["fallback_defaults"] += 1
		if severity == "HIGH":
			self.metrics["high_severity"] += 1
		if pressure == "RISK_OFF":
			self.metrics["risk_off"] += 1
		if pressure == "RISK_ON":
			self.metrics["risk_on"] += 1

		return data


def _log_final_metrics(enricher: MarketContextEnricher) -> None:
	m = enricher.metrics
	logger.info(
		"Market-context stats -- processed: %d | defaults: %d "
		"| high_severity: %d | risk_off: %d | risk_on: %d",
		m["processed"],
		m["fallback_defaults"],
		m["high_severity"],
		m["risk_off"],
		m["risk_on"],
	)


# ---------------------------------------------------------------------------
# Multiprocessing worker
# ---------------------------------------------------------------------------


def market_context_worker(
	input_queue: Any,
	output_queue: Any,
) -> None:
	"""
	Long-running process that enriches deduplicated articles with market
	context before forwarding them downstream.

	Send ``None`` into input_queue as a sentinel to gracefully stop the worker.
	The sentinel is forwarded to output_queue before exiting.
	"""
	logging.basicConfig(
		level=logging.INFO,
		format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
	)

	enricher = MarketContextEnricher()
	logger.info("Market-context worker started.")

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
			_log_final_metrics(enricher)
			break

		try:
			enriched = enricher.enrich(article)
			output_queue.put(enriched, timeout=2)
		except _queue_mod.Full:
			logger.warning(
				"Output queue full -- dropping enriched article: %r",
				article.get("headline", ""),
			)
		except Exception as exc:
			logger.exception(
				"Market-context enrichment failed for %r: %s",
				article.get("headline", ""),
				exc,
			)

