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
	assert event["logic_chain"][1]["text"] == "Oil supply contraction"
	assert event["affected_assets"][0]["sector"] == "Energy"
	assert event["affected_assets"][0]["prediction"] == "BULLISH"
	assert 0 <= event["affected_assets"][0]["confidence"] <= 1
