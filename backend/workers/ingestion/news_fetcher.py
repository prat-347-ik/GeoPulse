import os
import time
import re
import socket
from typing import Any
from typing import cast
import feedparser  # type: ignore
import yaml
from workers.queue.central_queue import build_queue, queue_backend

# Set global timeout for feedparser (uses socket timeout)
socket.setdefaulttimeout(15)


def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    cleanr = re.compile("<.*?>")
    return re.sub(cleanr, "", raw_html)


def _source_registry_path() -> str:
    return os.path.join(os.path.dirname(__file__), "../../data/source_registry.yaml")


def _legacy_feeds_path() -> str:
    return os.path.join(os.path.dirname(__file__), "../../data/rss_feeds.txt")


def _coerce_reliability(value: Any, default: float = 0.7) -> float:
    try:
        reliability = float(value)
        return max(0.0, min(1.0, reliability))
    except (TypeError, ValueError):
        return default


def _coerce_domain_weighting(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, float] = {}
    for key, raw_weight in value.items():
        sector = str(key).strip()
        if not sector:
            continue
        try:
            weight = float(raw_weight)
        except (TypeError, ValueError):
            continue
        normalized[sector] = max(0.5, min(1.5, weight))
    return normalized


def _coerce_event_hints(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    hints = []
    for item in value:
        hint = str(item).strip().upper()
        if hint:
            hints.append(hint)
    return hints


def load_source_registry(
    registry_path: str | None = None,
    legacy_path: str | None = None,
) -> list[dict[str, Any]]:
    path = registry_path or _source_registry_path()
    sources: list[dict[str, Any]] = []

    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as handle:
            payload = yaml.safe_load(handle) or {}

        if not isinstance(payload, dict):
            raise ValueError("source_registry.yaml must contain a mapping of categories to source lists")

        for category, entries in payload.items():
            category_name = str(category).strip().lower() or "general"
            if not isinstance(entries, list):
                continue

            for entry in entries:
                if not isinstance(entry, dict):
                    continue

                url = str(entry.get("url", "")).strip()
                if not url:
                    continue

                source_name = str(entry.get("name", "")).strip() or "Unnamed Source"

                sources.append(
                    {
                        "name": source_name,
                        "url": url,
                        "category": category_name,
                        "reliability": _coerce_reliability(entry.get("reliability"), default=0.7),
                        "event_class_hints": _coerce_event_hints(entry.get("event_class_hints")),
                        "domain_weighting": _coerce_domain_weighting(entry.get("domain_weighting")),
                    }
                )

        if sources:
            return sources

    legacy_feeds_path = legacy_path or _legacy_feeds_path()
    if not os.path.exists(legacy_feeds_path):
        raise FileNotFoundError(
            f"No source registry found at {os.path.abspath(path)} and no legacy feed list at {os.path.abspath(legacy_feeds_path)}"
        )

    with open(legacy_feeds_path, "r", encoding="utf-8") as handle:
        for line in handle:
            feed_url = line.strip()
            if not feed_url or feed_url.startswith("#"):
                continue
            sources.append(
                {
                    "name": "Legacy RSS Source",
                    "url": feed_url,
                    "category": "general",
                    "reliability": 0.5,
                    "event_class_hints": [],
                    "domain_weighting": {},
                }
            )

    return sources


def read_rss_feeds(queue_client: Any) -> None:
    registry_file = _source_registry_path()
    legacy_feeds_file = _legacy_feeds_path()

    if not os.path.exists(registry_file) and not os.path.exists(legacy_feeds_file):
        print(
            "Error: No source configuration found. Expected one of "
            f"{os.path.abspath(registry_file)} or {os.path.abspath(legacy_feeds_file)}"
        )
        return

    seen_links: set[str] = set()

    print("RSS worker started. Continuous polling active...")

    while True:
        try:
            sources = load_source_registry(registry_file)

            for source_cfg in sources:
                try:
                    feed_url = str(source_cfg.get("url", ""))
                    if not feed_url:
                        continue

                    print(f"Fetching feed: {feed_url}")
                    feed: Any = feedparser.parse(feed_url)

                    if feed.get("bozo"):
                        print(
                            f"Warning: Issue with feed {feed_url}: {feed.get('bozo_exception')}"
                        )

                    feed_title: str = feed.feed.get("title", "Unknown Source")
                    configured_name = str(source_cfg.get("name", "")).strip()
                    source_name = configured_name or feed_title

                    entries: list[Any] = feed.entries

                    for entry in entries:
                        link: str = entry.get("link", "")
                        title: str = entry.get("title", "No Title")

                        # Improved deduplication using title + link
                        article_id = f"{title}-{link}"

                        if article_id and article_id in seen_links:
                            continue

                        description = (
                            entry.get("description", "")
                            or entry.get("summary", "No Description")
                        )

                        pub_date = entry.get("published", "") or entry.get(
                            "updated", "No Date"
                        )

                        feed_data = {
                            "source": source_name,
                            "headline": title,
                            "url": link,
                            "description": clean_html(description),
                            "timestamp": pub_date,
                            "source_meta": {
                                "name": source_name,
                                "feed_title": feed_title,
                                "category": str(source_cfg.get("category", "general")),
                                "reliability": _coerce_reliability(source_cfg.get("reliability"), default=0.7),
                                "event_class_hints": cast(list[str], source_cfg.get("event_class_hints", [])),
                                "domain_weighting": cast(dict[str, float], source_cfg.get("domain_weighting", {})),
                            },
                        }

                        try:
                            queue_client.put(feed_data, timeout=2)
                        except Exception:
                            print("Queue write failed. Dropping article.")

                        seen_links.add(article_id)

                except Exception as e:
                    print(f"Error parsing feed {feed_url}: {e}")

            # Keep set size manageable
            while len(seen_links) > 500:
                seen_links.pop()

        except Exception as e:
            print(f"Error reading source registry: {e}")

        print("Polling cycle complete. Waiting 2 minutes...")
        time.sleep(120)


if __name__ == "__main__":
    print("Starting RSS news fetcher standalone...")
    raw_queue_name = os.getenv("RAW_ARTICLE_QUEUE", "geopulse:articles:raw")
    queue_client = build_queue(queue_name=raw_queue_name, maxsize=1000)
    print(f"Queue backend: {queue_backend()} queue={raw_queue_name}")

    try:
        read_rss_feeds(queue_client)
    except (KeyboardInterrupt, SystemExit):
        print("Stopping fetcher...")