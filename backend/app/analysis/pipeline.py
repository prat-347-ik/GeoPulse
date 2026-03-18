from __future__ import annotations

from typing import Any

from app.analysis.asset_registry import assets_for_sector
from app.analysis.confidence_model import compute_confidence, confidence_meta
from app.analysis.event_classifier import classify_event
from app.analysis.ripple_builder import build_ripple_event
from app.analysis.sector_mapper import map_macro_to_sectors


class AnalysisPipeline:
    def analyze(self, article: dict[str, Any]) -> dict[str, Any]:
        classification = classify_event(article)
        sector_impacts = map_macro_to_sectors(
            classification.macro_signal,
            str(article.get("market_pressure", "")),
        )
        ordered_sector_impacts = dict(
            sorted(
                sector_impacts.items(),
                key=lambda item: abs(item[1]),
                reverse=True,
            )
        )

        context_confidence = float(
            article.get("context_meta", {}).get("context_confidence", 0.5)
        )
        primary_weight = next(iter(ordered_sector_impacts.values()), 0.2)
        event_confidence = compute_confidence(
            context_confidence=context_confidence,
            severity=str(article.get("severity", "MEDIUM")),
            sector_weight=primary_weight,
            signal_strength=classification.signal_strength,
        )

        assets: list[dict[str, Any]] = []
        seen_tickers: set[str] = set()
        for sector, weight in list(ordered_sector_impacts.items())[:3]:
            prediction = "BULLISH" if weight > 0 else "BEARISH" if weight < 0 else "NEUTRAL"
            sector_assets_added = 0
            for asset in assets_for_sector(sector):
                ticker = str(asset["ticker"])
                if ticker in seen_tickers:
                    continue

                seen_tickers.add(ticker)
                assets.append(
                    {
                        **asset,
                        "sector": sector,
                        "prediction": prediction,
                        "confidence": max(
                            0.35,
                            round(min(0.99, event_confidence * (0.85 + abs(weight) * 0.15)), 3),
                        ),
                    }
                )
                sector_assets_added += 1
                if sector_assets_added == 2:
                    break

        return build_ripple_event(
            article=article,
            event_type=classification.event_type,
            macro_signal=classification.macro_signal,
            sector_impacts=ordered_sector_impacts,
            assets=assets,
            event_confidence=event_confidence,
            confidence_components=confidence_meta(
                context_confidence=context_confidence,
                signal_strength=classification.signal_strength,
                sector_weight=primary_weight,
            ),
        )


def analyze_article(article: dict[str, Any]) -> dict[str, Any]:
    return AnalysisPipeline().analyze(article)