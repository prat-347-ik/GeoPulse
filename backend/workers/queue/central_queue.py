from __future__ import annotations

import json
import importlib
import multiprocessing
import os
import queue as queue_mod
from dataclasses import dataclass
from typing import Any, Protocol


class QueueLike(Protocol):
    def put(self, item: dict[str, Any], timeout: float | None = None) -> None:
        ...

    def get(self, timeout: float | None = None) -> dict[str, Any] | None:
        ...


@dataclass
class InMemoryQueueAdapter:
    _queue: multiprocessing.Queue

    def put(self, item: dict[str, Any], timeout: float | None = None) -> None:
        if timeout is None:
            self._queue.put(item)
            return
        self._queue.put(item, timeout=timeout)

    def get(self, timeout: float | None = None) -> dict[str, Any] | None:
        try:
            if timeout is None:
                return self._queue.get()
            return self._queue.get(timeout=timeout)
        except queue_mod.Empty:
            return None


@dataclass
class RedisQueue:
    client: Any
    queue_name: str

    def put(self, item: dict[str, Any], timeout: float | None = None) -> None:
        del timeout
        self.client.lpush(self.queue_name, json.dumps(item, default=str))

    def get(self, timeout: float | None = None) -> dict[str, Any] | None:
        if timeout is None:
            raw = self.client.rpop(self.queue_name)
            if raw is None:
                return None
            return json.loads(raw)

        payload = self.client.brpop(self.queue_name, timeout=max(1, int(timeout)))
        if payload is None:
            return None

        _, raw = payload
        return json.loads(raw)


def queue_backend() -> str:
    return os.getenv("QUEUE_BACKEND", "redis").strip().lower()


def build_queue(queue_name: str, maxsize: int = 1000) -> QueueLike:
    backend = queue_backend()
    if backend == "memory":
        return InMemoryQueueAdapter(multiprocessing.Queue(maxsize=maxsize))

    try:
        redis_module = importlib.import_module("redis")
    except ModuleNotFoundError as exc:
        raise RuntimeError("QUEUE_BACKEND=redis but redis package is not installed. Install backend requirements.") from exc
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    client = redis_module.Redis.from_url(redis_url, decode_responses=True)
    client.ping()
    return RedisQueue(client=client, queue_name=queue_name)
