from pathlib import Path

from workers.ingestion.news_fetcher import load_source_registry


def test_load_source_registry_reads_structured_metadata(tmp_path: Path) -> None:
    registry_path = tmp_path / "source_registry.yaml"
    registry_path.write_text(
        """
macro:
  - name: Reuters Markets
    reliability: 0.95
    url: https://feeds.reuters.com/reuters/businessNews
    event_class_hints:
      - MACRO
      - EARNINGS
    domain_weighting:
      Financials: 1.1
      Broad Market: 1.05
""".strip(),
        encoding="utf-8",
    )

    sources = load_source_registry(str(registry_path))

    assert len(sources) == 1
    source = sources[0]
    assert source["name"] == "Reuters Markets"
    assert source["category"] == "macro"
    assert source["reliability"] == 0.95
    assert source["event_class_hints"] == ["MACRO", "EARNINGS"]
    assert source["domain_weighting"]["Financials"] == 1.1


def test_load_source_registry_falls_back_to_legacy_file(tmp_path: Path) -> None:
    registry_path = tmp_path / "missing_registry.yaml"
    legacy_path = tmp_path / "rss_feeds.txt"
    legacy_path.write_text(
        """
https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml
""".strip(),
        encoding="utf-8",
    )

    sources = load_source_registry(str(registry_path), str(legacy_path))

    assert len(sources) == 1
    source = sources[0]
    assert source["category"] == "general"
    assert source["reliability"] == 0.5
    assert source["url"] == "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml"
