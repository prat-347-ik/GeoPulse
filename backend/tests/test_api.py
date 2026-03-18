from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_get_events_returns_seeded_data() -> None:
	response = client.get("/api/events?limit=3")

	assert response.status_code == 200
	payload = response.json()
	assert payload["status"] == "success"
	assert len(payload["data"]) == 3
	assert "event_id" in payload["data"][0]


def test_analyze_endpoint_generates_structured_event() -> None:
	response = client.post(
		"/api/analyze",
		json={
			"headline": "OPEC cuts oil production again amid supply concerns",
			"source": "Reuters",
			"text": "OPEC ministers agreed to extend cuts, raising concern about oil supply.",
		},
	)

	assert response.status_code == 200
	payload = response.json()["data"]
	assert payload["macro_effect"] == "Oil supply contraction"
	assert payload["event_type"] == "ENERGY"
	assert 0 <= payload["confidence"] <= 1
	assert payload["sector_impacts"][0]["sector"] == "Energy"
	assert payload["sector_impacts"][0]["direction"] == "UP"
	assert payload["affected_assets"][0]["ticker"] == "XOM"
	assert payload["affected_assets"][0]["prediction"] == "BULLISH"
	assert payload["meta"]["llm_model"] == "rule-engine-v1"


def test_get_event_returns_created_analysis() -> None:
	created = client.post(
		"/api/analyze",
		json={
			"headline": "EU approves first spot Ethereum ETF listing",
			"source": "CoinDesk",
			"text": "The decision is viewed as a positive regulatory development for crypto markets.",
		},
	).json()["data"]

	response = client.get(f"/api/events/{created['event_id']}")

	assert response.status_code == 200
	payload = response.json()["data"]
	assert payload["event_id"] == created["event_id"]
	assert payload["macro_effect"] == "Regulatory tailwind"
