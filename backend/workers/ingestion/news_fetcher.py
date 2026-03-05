import os
import time
import re
import multiprocessing
import socket
from typing import Any
import queue as queue_type
import feedparser  # type: ignore

# Set global timeout for feedparser (uses socket timeout)
socket.setdefaulttimeout(15)


def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    cleanr = re.compile("<.*?>")
    return re.sub(cleanr, "", raw_html)


def read_rss_feeds(queue: "multiprocessing.Queue[Any]") -> None:
    feeds_file = os.path.join(os.path.dirname(__file__), "../../data/rss_feeds.txt")

    if not os.path.exists(feeds_file):
        print(f"Error: RSS feeds file not found at {os.path.abspath(feeds_file)}")
        return

    seen_links: set[str] = set()

    print("RSS worker started. Continuous polling active...")

    while True:
        try:
            with open(feeds_file, "r") as file:
                feeds = [
                    line.strip()
                    for line in file
                    if line.strip() and not line.strip().startswith("#")
                ]

            for feed_url in feeds:
                try:
                    print(f"Fetching feed: {feed_url}")
                    feed: Any = feedparser.parse(feed_url)

                    if feed.get("bozo"):
                        print(
                            f"Warning: Issue with feed {feed_url}: {feed.get('bozo_exception')}"
                        )

                    feed_title: str = feed.feed.get("title", "Unknown Source")

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
                            "source": feed_title,
                            "headline": title,
                            "url": link,
                            "description": clean_html(description),
                            "timestamp": pub_date,
                        }

                        try:
                            queue.put(feed_data, timeout=2)
                        except queue_type.Full:
                            print("Queue full. Dropping article.")

                        seen_links.add(article_id)

                except Exception as e:
                    print(f"Error parsing feed {feed_url}: {e}")

            # Keep set size manageable
            while len(seen_links) > 500:
                seen_links.pop()

        except Exception as e:
            print(f"Error reading feeds file: {e}")

        print("Polling cycle complete. Waiting 2 minutes...")
        time.sleep(120)


if __name__ == "__main__":
    print("Starting RSS news fetcher standalone...")

    queue: multiprocessing.Queue = multiprocessing.Queue(maxsize=1000)

    process = multiprocessing.Process(target=read_rss_feeds, args=(queue,))
    process.start()

    try:
        while True:
            try:
                item = queue.get_nowait()
                print(f"Received: {item['headline']}")
            except queue_type.Empty:
                pass

            time.sleep(1)

    except (KeyboardInterrupt, SystemExit):
        print("Stopping fetcher...")
        process.terminate()
        process.join()