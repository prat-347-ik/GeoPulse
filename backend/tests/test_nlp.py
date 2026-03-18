from app.analysis.pipeline import analyze_article


def test_analysis_pipeline_builds_energy_ripple_graph() -> None:
	event = analyze_article(
		{
			"headline": "Saudi Arabia announces new oil production cuts",
			"description": "The OPEC move is expected to tighten crude supply.",
			"source": "Bloomberg",
			"severity": "HIGH",
			"event_sentiment": "NEGATIVE",
			"market_pressure": "INFLATIONARY",
			"prediction_horizon": "SHORT_TERM",
			"context_meta": {"context_confidence": 0.84},
		}
	)

	assert event["macro_effect"] == "Oil supply contraction"
	assert event["event_type"] == "ENERGY"
	assert 0 <= event["confidence"] <= 1
	assert event["logic_chain"][1]["text"] == "Oil supply contraction"
	assert event["sector_impacts"][0]["sector"] == "Energy"
	assert event["sector_impacts"][0]["direction"] == "UP"
	assert event["affected_assets"][0]["sector"] == "Energy"
	assert event["affected_assets"][0]["prediction"] == "BULLISH"
	assert 0 <= event["affected_assets"][0]["confidence"] <= 1


def test_analysis_pipeline_uses_top_two_pressure_fallback_sectors() -> None:
	event = analyze_article(
		{
			"headline": "Unexpected cross-asset repositioning continues",
			"source": "Reuters",
			"macro_effect": "Unmapped signal",
			"market_pressure": "LIQUIDITY",
		}
	)

	assert [impact["sector"] for impact in event["sector_impacts"]] == ["Technology", "Financials"]
	assert [impact["direction"] for impact in event["sector_impacts"]] == ["UP", "UP"]


def test_analysis_pipeline_deduplicates_assets_across_overlapping_sectors(monkeypatch) -> None:
	def fake_assets_for_sector(sector: str) -> list[dict[str, str]]:
		sector_assets = {
			"Energy": [
				{"ticker": "XOM", "name": "Exxon Mobil", "asset_class": "Equity"},
				{"ticker": "CVX", "name": "Chevron", "asset_class": "Equity"},
			],
			"Transportation": [
				{"ticker": "XOM", "name": "Exxon Mobil", "asset_class": "Equity"},
				{"ticker": "DAL", "name": "Delta Air Lines", "asset_class": "Equity"},
			],
		}
		return sector_assets.get(sector, [])

	monkeypatch.setattr("app.analysis.pipeline.assets_for_sector", fake_assets_for_sector)

	event = analyze_article(
		{
			"headline": "Saudi Arabia announces new oil production cuts",
			"description": "The OPEC move is expected to tighten crude supply.",
			"source": "Bloomberg",
			"severity": "HIGH",
			"event_sentiment": "NEGATIVE",
			"market_pressure": "INFLATIONARY",
			"prediction_horizon": "SHORT_TERM",
			"context_meta": {"context_confidence": 0.84},
		}
	)

	tickers = [asset["ticker"] for asset in event["affected_assets"]]
	assert tickers.count("XOM") == 1
