from app.analysis.pipeline import analyze_article
from app.nlp.event_extractor import extract_geopolitical_triggers
from workers.forecasting.predictor import calculate_asset_impacts


def test_geopolitical_trigger_extraction_identifies_conflict_signals() -> None:
    signals = extract_geopolitical_triggers(
        {
            "headline": "Missile attack near key Gulf shipping lane raises escalation fears",
            "description": "Officials warn conflict may disrupt regional energy flows.",
        }
    )

    assert signals["trigger_type"] in {"military_conflict", "energy_disruption"}
    assert signals["risk_sentiment"] == "RISK_OFF"
    assert signals["safe_haven_demand"] == "UP"
    assert signals["energy_supply_risk"] == "UP"


def test_analysis_pipeline_applies_geopolitical_second_order_effects() -> None:
    event = analyze_article(
        {
            "headline": "Missile attack near key Gulf shipping lane raises escalation fears",
            "description": "Officials warn conflict may disrupt regional energy flows.",
            "source": "Reuters",
            "severity": "HIGH",
            "event_sentiment": "NEGATIVE",
            "market_pressure": "RISK_OFF",
            "prediction_horizon": "SHORT_TERM",
            "context_meta": {"context_confidence": 0.82},
            "geopolitical_signals": {
                "trigger_type": "military_conflict",
                "risk_sentiment": "RISK_OFF",
                "safe_haven_demand": "UP",
                "energy_supply_risk": "UP",
                "confidence": 0.9,
            },
        }
    )

    sector_names = [impact["sector"] for impact in event["sector_impacts"]]
    assert "Defense" in sector_names
    assert "Energy" in sector_names
    assert event["meta"]["source_profile"]["geopolitical_reasoning"]["reasoning_strength"] > 0


def test_predictor_calculates_asset_impacts_with_confidence() -> None:
    prediction = calculate_asset_impacts(
        {
            "headline": "Border conflict escalates and sanctions expand",
            "description": "Safe-haven demand rises while equities face pressure.",
            "source": "Bloomberg",
            "severity": "HIGH",
            "event_sentiment": "NEGATIVE",
            "market_pressure": "RISK_OFF",
            "prediction_horizon": "SHORT_TERM",
            "context_meta": {"context_confidence": 0.78},
        }
    )

    assert prediction["affected_assets"]
    assert prediction["affected_assets"][0]["prediction"] in {"BULLISH", "BEARISH", "NEUTRAL"}
    assert 0 <= prediction["affected_assets"][0]["confidence"] <= 1
