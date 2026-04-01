"""Async local LLM client with strict timeout and safe fallback."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 2.5
_CONSECUTIVE_FAILURES = 0
_CIRCUIT_OPEN_UNTIL = 0.0


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _resolved_timeout_seconds(explicit_timeout: float | None) -> float:
    if explicit_timeout is not None and explicit_timeout > 0:
        return explicit_timeout
    return _env_float("NLP_LLM_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS)


def build_deterministic_fallback(
    macro_effect: str,
    top_sector: str,
) -> str:
    macro = (macro_effect or "cross-sector repricing").strip()
    sector = (top_sector or "broad market sectors").strip()
    return f"Event drives {macro}, impacting {sector}."


def _ollama_sync_generate(prompt: str, request_timeout_seconds: float) -> str:
    """Blocking Ollama call, intended to run in a worker thread."""
    base_url = os.getenv("NLP_LLM_BASE_URL", "http://localhost:11434")
    model = os.getenv("NLP_LLM_MODEL", "qwen2.5-coder:7b")
    endpoint = f"{base_url.rstrip('/')}/api/generate"

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": float(os.getenv("NLP_LLM_TEMPERATURE", "0.2")),
            "num_predict": int(os.getenv("NLP_LLM_MAX_TOKENS", "120")),
        },
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib_request.urlopen(req, timeout=request_timeout_seconds) as resp:
        body = resp.read().decode("utf-8")
        parsed = json.loads(body)
        return str(parsed.get("response", "")).strip()


async def generate_local_llm_explanation(
    prompt: str,
    fallback_text: str,
    timeout_seconds: float | None = None,
) -> str:
    """Generate text via local LLM, bounded by wait_for timeout.

    This method guarantees a non-throwing response by returning fallback_text
    on timeout or any runtime failure.
    """
    resolved_timeout = _resolved_timeout_seconds(timeout_seconds)
    request_timeout = _env_float("NLP_LLM_HTTP_TIMEOUT_SECONDS", max(1.0, resolved_timeout - 0.5))

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_ollama_sync_generate, prompt, request_timeout),
            timeout=resolved_timeout,
        )
        if not result:
            logger.warning("LLM returned empty response, using fallback")
            return fallback_text
        return result
    except asyncio.TimeoutError:
        logger.warning("LLM timeout, using fallback")
        return fallback_text
    except Exception as exc:
        logger.warning("LLM request failed, using fallback: %s", exc)
        return fallback_text


def _is_circuit_open() -> bool:
    return time.time() < _CIRCUIT_OPEN_UNTIL


def _mark_failure() -> None:
    global _CONSECUTIVE_FAILURES, _CIRCUIT_OPEN_UNTIL
    _CONSECUTIVE_FAILURES += 1
    failure_threshold = int(os.getenv("NLP_LLM_CIRCUIT_BREAKER_FAILURES", "3"))
    cooldown_seconds = float(os.getenv("NLP_LLM_CIRCUIT_BREAKER_COOLDOWN_SEC", "30"))
    if _CONSECUTIVE_FAILURES >= failure_threshold:
        _CIRCUIT_OPEN_UNTIL = time.time() + cooldown_seconds
        logger.warning(
            "LLM circuit breaker opened for %.1fs after %d failures",
            cooldown_seconds,
            _CONSECUTIVE_FAILURES,
        )


def _mark_success() -> None:
    global _CONSECUTIVE_FAILURES, _CIRCUIT_OPEN_UNTIL
    _CONSECUTIVE_FAILURES = 0
    _CIRCUIT_OPEN_UNTIL = 0.0


async def generate_local_llm_explanation_with_meta(
    prompt: str,
    fallback_text: str,
    timeout_seconds: float | None = None,
) -> dict[str, float | str]:
    """Generate explanation with metadata for transparency and debugging.

    Returns:
      {
        "text": str,
        "source": "llm" | "fallback",
        "llm_latency_ms": float,
      }
    """
    if _is_circuit_open():
        logger.warning("LLM circuit open, using fallback")
        return {
            "text": fallback_text,
            "source": "fallback",
            "llm_latency_ms": 0.0,
        }

    resolved_timeout = _resolved_timeout_seconds(timeout_seconds)
    request_timeout = _env_float("NLP_LLM_HTTP_TIMEOUT_SECONDS", max(1.0, resolved_timeout - 0.5))

    start = time.time()
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_ollama_sync_generate, prompt, request_timeout),
            timeout=resolved_timeout,
        )
        latency = (time.time() - start) * 1000
        if not result:
            logger.warning("LLM returned empty response, using fallback")
            _mark_failure()
            return {
                "text": fallback_text,
                "source": "fallback",
                "llm_latency_ms": round(latency, 2),
            }

        _mark_success()
        return {
            "text": result,
            "source": "llm",
            "llm_latency_ms": round(latency, 2),
        }
    except asyncio.TimeoutError:
        latency = (time.time() - start) * 1000
        logger.warning("LLM timeout, using fallback")
        _mark_failure()
        return {
            "text": fallback_text,
            "source": "fallback",
            "llm_latency_ms": round(latency, 2),
        }
    except Exception as exc:
        latency = (time.time() - start) * 1000
        logger.warning("LLM request failed, using fallback: %s", exc)
        _mark_failure()
        return {
            "text": fallback_text,
            "source": "fallback",
            "llm_latency_ms": round(latency, 2),
        }


async def warmup_local_llm() -> None:
    """Best-effort cold-start warmup to preload model weights."""
    prompt = "Hello"
    fallback = "Warmup fallback."
    _ = await generate_local_llm_explanation_with_meta(prompt=prompt, fallback_text=fallback)


def get_llm_runtime_health() -> dict[str, object]:
    """Return current LLM runtime status and model availability details."""
    base_url = os.getenv("NLP_LLM_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("NLP_LLM_MODEL", "qwen2.5-coder:7b")
    timeout_seconds = _resolved_timeout_seconds(None)
    http_timeout_seconds = _env_float(
        "NLP_LLM_HTTP_TIMEOUT_SECONDS",
        max(1.0, timeout_seconds - 0.5),
    )

    status: dict[str, object] = {
        "enabled": os.getenv("NLP_USE_LOCAL_LLM", "false").lower() == "true",
        "base_url": base_url,
        "model": model,
        "timeout_seconds": timeout_seconds,
        "http_timeout_seconds": http_timeout_seconds,
        "circuit_open": _is_circuit_open(),
        "consecutive_failures": _CONSECUTIVE_FAILURES,
        "available_models": [],
        "model_found": False,
        "ollama_reachable": False,
        "error": None,
    }

    try:
        req = urllib_request.Request(f"{base_url}/api/tags", method="GET")
        with urllib_request.urlopen(req, timeout=min(3.0, http_timeout_seconds)) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        models = [str(item.get("name", "")) for item in body.get("models", []) if isinstance(item, dict)]
        status["available_models"] = models
        status["model_found"] = any(name == model or name.startswith(f"{model}:") for name in models)
        status["ollama_reachable"] = True
    except (URLError, HTTPError, ValueError, json.JSONDecodeError) as exc:
        status["error"] = str(exc)

    return status


def _extract_json_object(raw_text: str) -> dict[str, object] | None:
    text = (raw_text or "").strip()
    if not text:
        return None

    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    candidate = fenced_match.group(1) if fenced_match else text

    try:
        parsed = json.loads(candidate)
        return parsed if isinstance(parsed, dict) else None
    except (ValueError, TypeError):
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except (ValueError, TypeError):
            return None


async def generate_local_llm_json_with_meta(
    prompt: str,
    fallback_payload: dict[str, object],
    timeout_seconds: float | None = None,
) -> dict[str, object]:
    """Generate structured JSON from local LLM with fallback behavior."""
    fallback_text = json.dumps(fallback_payload, ensure_ascii=True)
    result = await generate_local_llm_explanation_with_meta(
        prompt=prompt,
        fallback_text=fallback_text,
        timeout_seconds=timeout_seconds,
    )

    raw_text = str(result.get("text", ""))
    payload = _extract_json_object(raw_text)
    if payload is None:
        return {
            "payload": fallback_payload,
            "source": "fallback",
            "llm_latency_ms": round(float(result.get("llm_latency_ms", 0.0) or 0.0), 2),
        }

    return {
        "payload": payload,
        "source": result.get("source", "fallback"),
        "llm_latency_ms": round(float(result.get("llm_latency_ms", 0.0) or 0.0), 2),
    }
