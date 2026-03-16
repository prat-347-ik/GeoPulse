from workers.ingestion.market_context import MarketContextEnricher


def test_market_context_enricher_sets_expected_fields() -> None:
	enricher = MarketContextEnricher()

	article = {
		"headline": "Federal Reserve signals rate cut after softer inflation print",
		"description": "Markets expect easier liquidity conditions over coming months.",
		"source": "Reuters",
	}

	enriched = enricher.enrich(article)

	assert enriched["market_pressure"] == "LIQUIDITY"
	assert enriched["prediction_horizon"] in {"SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"}
	assert enriched["severity"] in {"LOW", "MEDIUM", "HIGH"}
	assert 0 <= enriched["context_meta"]["context_confidence"] <= 1
