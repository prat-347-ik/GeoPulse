# coding: utf-8
"""
Deduplicator for the GeoPulse ingestion pipeline.

Three deduplication layers applied in order (short-circuit on first match):

  1. Exact URL fingerprint   - catches the same article link scraped in
                               multiple polling cycles. Tracker query params
                               (utm_source, fbclid, igshid, etc.) are stripped
                               before hashing. Known redirect hosts (Google
                               News, t.co) are resolved to the canonical source
                               URL before fingerprinting.

  2. Normalised title hash   - catches the same story re-published verbatim
                               under a different URL (mirror, paywall bypass).
                               Title is lowercased, tokenised with a word-
                               boundary regex, stop-words removed, and tokens
                               sorted (order-invariant) before hashing.

  3. Word-shingle SimHash    - catches near-verbatim wire-copy re-posts where
                               multiple outlets reproduce the same body text
                               with only minor differences. Uses bi-gram
                               shingles fed into a 64-bit SimHash, which is
                               the same locality-sensitive hashing technique
                               described by Manku et al. (2007) and used by
                               Google News for near-duplicate clustering.

All in-memory stores are bounded (FIFO eviction) and the class is thread-safe
via an internal threading.Lock. No external dependencies beyond stdlib.

Advanced technique note -- word shingling
-----------------------------------------
The key insight from the 2007 Google News near-duplicate paper (Manku et al.,
"Detecting Near-Duplicates for Web Crawling") is to compute SimHash over WORD
N-GRAMS (shingles) rather than individual tokens.

Why shingles beat bag-of-words SimHash:
  Individual tokens : {"oil", "prices", "fell", "opec"}
  Bi-gram shingles  : {"oil prices", "prices fell", "fell opec"}

Shingles encode LOCAL WORD ORDER. Two articles that share many consecutive
word pairs are almost certainly the same story, even if a few words differ.
This gives dramatically fewer false negatives for paraphrased wire copies
without requiring any ML model or embedding lookup.

Shingle size k=2 (bigrams) is the sweet spot:
  k=1 -> bag-of-words (order-blind, many false positives)
  k=2 -> captures phrase-level context (best precision/recall tradeoff)
  k=3 -> very strict; minor edits break most shingles
"""

from __future__ import annotations

import hashlib
import logging
import queue as _queue_mod
import re
import threading
import unicodedata
from collections import OrderedDict
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Tracker / analytics / CDN query-string keys that carry no content identity.
_TRACKER_PARAMS: frozenset[str] = frozenset(
    {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "ref", "referrer", "source",
        "fbclid", "gclid", "msclkid",
        "igshid",          # Instagram share
        "mc_cid", "mc_eid",  # Mailchimp
        "spm",             # Alibaba / Taobao
        "yclid",           # Yandex
    }
)

# Hostnames whose URLs are redirects/aggregators that should be resolved
# to the real article URL before fingerprinting (when follow_redirects=True).
_REDIRECT_HOSTS: frozenset[str] = frozenset(
    {
        "news.google.com",
        "feedproxy.google.com",
        "t.co",
        "bit.ly",
        "tinyurl.com",
        "ow.ly",
        "buff.ly",
        "dlvr.it",
    }
)

# Common English stop-words stripped before title hashing (not description).
_STOP_WORDS: frozenset[str] = frozenset(
    {
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
        "has", "have", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "its", "it", "this", "that", "these",
        "those", "as", "up", "over", "after", "before", "says", "said",
        "according", "report", "reports", "new", "now",
    }
)

_SIMHASH_BITS: int = 64

# Hamming-distance threshold for near-duplicate body-text detection.
# Shingle-based SimHash is more sensitive than token SimHash, so threshold
# of 3 works well; raise to 5 if you see too many false positives.
_DEFAULT_SIMHASH_THRESHOLD: int = 3

# Shingle size (word n-gram length) used for SimHash input.
_SHINGLE_SIZE: int = 2

# Minimum description character length to trust for SimHash.
_MIN_DESCRIPTION_LEN: int = 60

# Titles shorter than this are noise (e.g. empty RSS entries) and are skipped.
_MIN_TITLE_LEN: int = 10

# Default in-memory cache size per store.
_DEFAULT_MAXSIZE: int = 10_000


# ---------------------------------------------------------------------------
# URL normalisation + canonical extraction
# ---------------------------------------------------------------------------


def _normalise_url(url: str) -> str:
    """Strip tracker params, fragment, and trailing slashes from *url*."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip().lower())
        clean_qs = sorted(
            (k, v)
            for k, v in parse_qsl(parsed.query)
            if k not in _TRACKER_PARAMS
        )
        return (
            parsed._replace(query=urlencode(clean_qs), fragment="",
                            scheme=parsed.scheme or "https")
            .geturl()
            .rstrip("/")
        )
    except Exception:
        return url.strip().lower()


def _is_redirect_url(url: str) -> bool:
    """Return True when *url* belongs to a known redirect/aggregator host."""
    try:
        return urlparse(url).hostname in _REDIRECT_HOSTS
    except Exception:
        return False


def _resolve_redirect(url: str, timeout: float = 3.0) -> str:
    """
    Follow HTTP redirects (HEAD only -- no body downloaded) and return the
    final URL.  Falls back to the original URL on any network error.
    """
    import urllib.request

    try:
        req = urllib.request.Request(
            url, method="HEAD", headers={"User-Agent": "GeoPulse-Dedup/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.url or url
    except Exception:
        return url


def _canonical_url(url: str, follow_redirects: bool = False) -> str:
    """
    Return the canonical, tracker-stripped form of *url*.

    When *follow_redirects* is True and *url* is from a known redirect host
    (Google News, t.co, etc.), a HEAD request is issued to resolve the real
    article URL before tracker-param stripping is applied.
    """
    if follow_redirects and _is_redirect_url(url):
        url = _resolve_redirect(url)
    return _normalise_url(url)


# ---------------------------------------------------------------------------
# Text normalisation
# ---------------------------------------------------------------------------


def _tokenise(text: str) -> list[str]:
    """
    Extract word tokens: Unicode NFKD -> lowercase -> word-boundary regex.

    Using re.findall(r"\\b[a-z0-9]+\\b") avoids punctuation artifacts that
    plain str.split() produces (e.g. "price." and "price" as distinct tokens).
    """
    text = unicodedata.normalize("NFKD", text).lower()
    return re.findall(r"\b[a-z0-9]+\b", text)


def _normalise_title(title: str) -> str:
    """
    Canonical form for title **hashing** (order-invariant, stop-words removed).

    Tokens are sorted so minor word-order variations ("Oil OPEC cut" vs
    "OPEC cut oil") produce the same hash.
    """
    if not title:
        return ""
    tokens = sorted(t for t in _tokenise(title) if t not in _STOP_WORDS)
    return " ".join(tokens)


def _normalise_description(description: str) -> str:
    """
    Canonical form for description **SimHash** (preserves token order).

    Stop-words are intentionally kept: removing them on short descriptions
    would reduce token count below the reliable SimHash threshold and increase
    false-positive near-duplicate matches.
    """
    if not description:
        return ""
    return " ".join(_tokenise(description))


# ---------------------------------------------------------------------------
# Word-shingle SimHash  (the Google News / Manku et al. technique)
# ---------------------------------------------------------------------------


def _shingles(tokens: list[str], k: int = _SHINGLE_SIZE) -> list[str]:
    """
    Generate k-word shingles (sliding window of k consecutive tokens).

    Example (k=2):
      ["oil", "prices", "fell"] -> ["oil prices", "prices fell"]

    Shingles encode LOCAL WORD ORDER so two texts sharing many consecutive
    word pairs are almost certainly the same story -- even after minor edits.
    This is the core of Google News near-duplicate clustering.
    """
    if len(tokens) < k:
        return tokens  # fall back to unigrams for very short text
    return [" ".join(tokens[i : i + k]) for i in range(len(tokens) - k + 1)]


def _simhash(text: str, use_shingles: bool = True) -> int:
    """
    Compute a _SIMHASH_BITS-wide SimHash of *text*.

    When *use_shingles* is True (default), bi-gram shingles are used as the
    hashing units instead of individual tokens, dramatically improving
    near-duplicate precision for short news descriptions.

    MD5 is used purely for its uniform bit distribution (not security).
    """
    tokens = text.split()
    if not tokens:
        return 0

    units = _shingles(tokens) if use_shingles else tokens

    vector = [0] * _SIMHASH_BITS
    for unit in units:
        # MD5 used solely for fast bit mixing -- not security-sensitive.
        h = int(hashlib.md5(unit.encode("utf-8")).hexdigest(), 16)  # noqa: S324
        for i in range(_SIMHASH_BITS):
            vector[i] += 1 if (h >> i) & 1 else -1

    result = 0
    for i in range(_SIMHASH_BITS):
        if vector[i] > 0:
            result |= 1 << i
    return result


def _hamming_distance(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


# ---------------------------------------------------------------------------
# BoundedSet -- FIFO-evicting in-memory cache
# ---------------------------------------------------------------------------


class _BoundedSet:
    """
    Set with a hard capacity limit; oldest entry is evicted when full.
    Not thread-safe on its own -- callers must hold the external lock.
    """

    def __init__(self, maxsize: int = _DEFAULT_MAXSIZE) -> None:
        self._store: OrderedDict[str, None] = OrderedDict()
        self._maxsize = max(1, maxsize)

    def __contains__(self, key: str) -> bool:
        return key in self._store

    def __len__(self) -> int:
        return len(self._store)

    def add(self, key: str) -> None:
        if key in self._store:
            self._store.move_to_end(key)
            return
        if len(self._store) >= self._maxsize:
            self._store.popitem(last=False)
        self._store[key] = None


# ---------------------------------------------------------------------------
# Deduplicator
# ---------------------------------------------------------------------------


class Deduplicator:
    """
    Stateful, thread-safe, multi-layer deduplicator for news articles.

    Parameters
    ----------
    maxsize : int
        Maximum fingerprints kept in each in-memory store.
    simhash_threshold : int
        Hamming-distance threshold for near-duplicate description detection
        (shingle-based SimHash).  Lower is stricter.  0 disables SimHash.
    follow_redirects : bool
        When True, redirect URLs (Google News, t.co, etc.) are resolved to
        their canonical article URL before fingerprinting.  Adds one HEAD
        request per new unseen URL.  Defaults to False.
    mongo_collection : pymongo.collection.Collection, optional
        When provided, URL fingerprints are persisted in MongoDB so
        deduplication survives process restarts.  A unique index on
        ``url_hash`` is created automatically.

    Example
    -------
    ::

        dedup = Deduplicator(follow_redirects=True)

        for article in raw_articles:
            if dedup.filter(article):
                nlp_queue.put(article)
    """

    def __init__(
        self,
        maxsize: int = _DEFAULT_MAXSIZE,
        simhash_threshold: int = _DEFAULT_SIMHASH_THRESHOLD,
        follow_redirects: bool = False,
        mongo_collection: Any = None,
    ) -> None:
        self._url_hashes = _BoundedSet(maxsize)
        self._title_hashes = _BoundedSet(maxsize)
        self._simhashes: list[int] = []
        self._simhash_max = maxsize
        self._simhash_threshold = simhash_threshold
        self._follow_redirects = follow_redirects
        self._mongo = mongo_collection
        self._lock = threading.Lock()
        self.metrics: dict[str, int] = {
            "url_hits": 0,
            "title_hits": 0,
            "simhash_hits": 0,
            "articles_passed": 0,
            "articles_dropped": 0,
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def is_duplicate(self, article: dict[str, Any]) -> bool:
        """Return True if *article* is a duplicate of a previously seen item."""
        with self._lock:
            return self._is_duplicate_unlocked(article)

    def mark_seen(self, article: dict[str, Any]) -> None:
        """Record *article* as seen so future calls return True."""
        with self._lock:
            self._mark_seen_unlocked(article)

    def filter(self, article: dict[str, Any]) -> bool:
        """
        Return True (and mark seen) when *article* is NOT a duplicate.
        Return False for duplicates.

        The duplicate check and mark-seen are performed under a single lock
        acquisition to eliminate TOCTOU races in multi-threaded environments.
        """
        with self._lock:
            if self._is_duplicate_unlocked(article):
                self.metrics["articles_dropped"] += 1
                return False
            self._mark_seen_unlocked(article)
            self.metrics["articles_passed"] += 1
            return True

    def load_from_mongo(self) -> int:
        """
        Populate in-memory URL hashes from MongoDB and ensure the index exists.

        Call once on startup to restore state from a previous run.
        Returns the number of fingerprints loaded.
        """
        if self._mongo is None:
            return 0
        self._ensure_mongo_index()
        loaded = 0
        try:
            for doc in self._mongo.find({}, {"_id": 0, "url_hash": 1}):
                h = doc.get("url_hash")
                if h:
                    self._url_hashes.add(h)
                    loaded += 1
        except Exception as exc:
            logger.error("Could not load fingerprints from MongoDB: %s", exc)
        return loaded

    def reset_metrics(self) -> dict[str, int]:
        """Return a snapshot of current metrics and reset all counters to zero."""
        with self._lock:
            snapshot = dict(self.metrics)
            for k in self.metrics:
                self.metrics[k] = 0
        return snapshot

    # ------------------------------------------------------------------
    # Internal helpers -- must be called with self._lock held
    # ------------------------------------------------------------------

    def _is_duplicate_unlocked(self, article: dict[str, Any]) -> bool:
        url_fp = self._url_fingerprint(article)
        if url_fp and url_fp in self._url_hashes:
            self.metrics["url_hits"] += 1
            logger.debug("URL duplicate: %s", article.get("url", ""))
            return True

        title_fp = self._title_fingerprint(article)
        if title_fp and title_fp in self._title_hashes:
            self.metrics["title_hits"] += 1
            logger.debug("Title duplicate: %r", article.get("headline", ""))
            return True

        if self._simhash_threshold > 0:
            sh = self._description_simhash(article)
            if sh and self._is_near_duplicate(sh):
                self.metrics["simhash_hits"] += 1
                logger.debug("SimHash near-duplicate: %r", article.get("headline", ""))
                return True

        return False

    def _mark_seen_unlocked(self, article: dict[str, Any]) -> None:
        url_fp = self._url_fingerprint(article)
        if url_fp:
            self._url_hashes.add(url_fp)
            self._persist_url_hash(url_fp)

        title_fp = self._title_fingerprint(article)
        if title_fp:
            self._title_hashes.add(title_fp)

        if self._simhash_threshold > 0:
            sh = self._description_simhash(article)
            if sh:
                self._simhashes.append(sh)
                if len(self._simhashes) > self._simhash_max:
                    # Evict oldest half in one slice -- avoids O(n) repeated pops.
                    self._simhashes = self._simhashes[-(self._simhash_max // 2):]

    # ------------------------------------------------------------------
    # Fingerprint helpers
    # ------------------------------------------------------------------

    def _url_fingerprint(self, article: dict[str, Any]) -> str:
        url = article.get("url", "")
        normalised = _canonical_url(url, self._follow_redirects)
        return _sha256(normalised) if normalised else ""

    def _title_fingerprint(self, article: dict[str, Any]) -> str:
        title = article.get("headline", "") or article.get("title", "")
        if not title or len(title) < _MIN_TITLE_LEN:
            return ""  # too short -- likely noise, skip to avoid false matches
        normalised = _normalise_title(title)
        return _sha256(normalised) if normalised else ""

    def _description_simhash(self, article: dict[str, Any]) -> int:
        description = article.get("description", "") or article.get("summary", "")
        if description and len(description) >= _MIN_DESCRIPTION_LEN:
            normalised = _normalise_description(description)
        else:
            # Fall back to headline only when it is long enough to be reliable.
            # Short titles (e.g. "BREAKING") are just as noisy for SimHash as
            # they are for title hashing -- returning 0 skips this layer rather
            # than producing false-positive matches between unrelated articles.
            title = article.get("headline", "") or article.get("title", "")
            if not title or len(title) < _MIN_TITLE_LEN:
                return 0
            normalised = _normalise_description(title)
        return _simhash(normalised) if normalised else 0

    def _is_near_duplicate(self, sh: int) -> bool:
        return any(
            _hamming_distance(sh, seen) <= self._simhash_threshold
            for seen in self._simhashes
        )

    # ------------------------------------------------------------------
    # MongoDB helpers
    # ------------------------------------------------------------------

    def _ensure_mongo_index(self) -> None:
        """Create a unique index on url_hash if it does not already exist."""
        if self._mongo is None:
            return
        try:
            self._mongo.create_index("url_hash", unique=True, background=True)
            logger.debug("MongoDB index on url_hash ensured.")
        except Exception as exc:
            logger.warning("Could not create MongoDB index: %s", exc)

    def _persist_url_hash(self, url_hash: str) -> None:
        if self._mongo is None:
            return
        try:
            self._mongo.update_one(
                {"url_hash": url_hash},
                {"$setOnInsert": {"url_hash": url_hash}},
                upsert=True,
            )
        except Exception as exc:
            logger.error("MongoDB write error: %s", exc)


# ---------------------------------------------------------------------------
# Helpers used outside the class
# ---------------------------------------------------------------------------


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _log_final_metrics(dedup: Deduplicator) -> None:
    m = dedup.metrics
    logger.info(
        "Deduplicator session stats -- passed: %d | dropped: %d "
        "(url: %d  title: %d  simhash: %d)",
        m["articles_passed"],
        m["articles_dropped"],
        m["url_hits"],
        m["title_hits"],
        m["simhash_hits"],
    )


# ---------------------------------------------------------------------------
# Multiprocessing worker
# ---------------------------------------------------------------------------


def deduplication_worker(
    input_queue: Any,
    output_queue: Any,
    maxsize: int = _DEFAULT_MAXSIZE,
    simhash_threshold: int = _DEFAULT_SIMHASH_THRESHOLD,
    follow_redirects: bool = False,
    mongo_collection: Any = None,
) -> None:
    """
    Long-running process that reads raw articles from *input_queue*,
    filters duplicates, and forwards unique articles to *output_queue*.

    Send ``None`` into *input_queue* as a sentinel to trigger a graceful
    shutdown; the sentinel is forwarded downstream before the worker exits.

    Designed to be used as a ``multiprocessing.Process`` target::

        import multiprocessing
        from workers.ingestion.deduplicator import deduplication_worker

        raw_q   = multiprocessing.Queue(maxsize=200)
        clean_q = multiprocessing.Queue(maxsize=200)

        proc = multiprocessing.Process(
            target=deduplication_worker,
            args=(raw_q, clean_q),
            daemon=True,
        )
        proc.start()

    Parameters
    ----------
    input_queue : multiprocessing.Queue
        Queue of raw article dicts produced by ``news_fetcher.read_rss_feeds``.
    output_queue : multiprocessing.Queue
        Queue of deduplicated article dicts consumed by NLP workers downstream.
    maxsize : int
        Maximum fingerprints kept per in-memory store.
    simhash_threshold : int
        Hamming-distance threshold for shingle-based near-duplicate detection.
    follow_redirects : bool
        Resolve Google News / t.co redirect URLs before fingerprinting.
    mongo_collection : pymongo.collection.Collection, optional
        When provided, URL fingerprints are persisted across restarts.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    dedup = Deduplicator(
        maxsize=maxsize,
        simhash_threshold=simhash_threshold,
        follow_redirects=follow_redirects,
        mongo_collection=mongo_collection,
    )

    if mongo_collection is not None:
        loaded = dedup.load_from_mongo()
        logger.info("Restored %d fingerprint(s) from MongoDB.", loaded)

    logger.info("Deduplicator worker started.")

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
            _log_final_metrics(dedup)
            break

        if dedup.filter(article):
            try:
                output_queue.put(article, timeout=2)
            except _queue_mod.Full:
                logger.warning(
                    "Output queue full -- dropping: %r",
                    article.get("headline", ""),
                )
        else:
            logger.debug(
                "Duplicate skipped: %r", article.get("headline", "")
            )
