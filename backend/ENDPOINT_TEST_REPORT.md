# Backend Endpoint Test Report

Generated: 2026-03-31T09:10:00.000000Z
Base URL: http://testserver
Notes: Executed with FastAPI TestClient (raise_server_exceptions=False), NLP_USE_LOCAL_LLM=false, ENABLE_BACKGROUND_VALIDATOR=false.

## Summary

- Total checks: 17
- Passed: 17
- Failed: 0

## Results

| Endpoint | Method | Expected | Actual | Status |
|---|---|---:|---:|---|
| / | GET | 200 | 200 | PASS |
| /api/health | GET | 200 | 200 | PASS |
| /api/events?limit=10 | GET | 200 | 200 | PASS |
| /api/events?limit=0 | GET | 422 | 422 | PASS |
| /api/events/evt_20260211_tariff | GET | 200 | 200 | PASS |
| /api/validate/evt_20260211_tariff?horizon=1h | GET | 200 | 200 | PASS |
| /api/events/nonexistent_event_id_123 | GET | 404 | 404 | PASS |
| /api/validate/nonexistent_event_id_123?horizon=1h | GET | 404 | 404 | PASS |
| /api/validate/nonexistent_event_id_123?horizon=2h | GET | 422 | 422 | PASS |
| /api/validations?limit=20 | GET | 200 | 200 | PASS |
| /api/price?ticker=AAPL&price_range=1d | GET | 200 | 200 | PASS |
| /api/price?ticker=AAPL&price_range=2d | GET | 422 | 422 | PASS |
| /api/analyze | POST | 200 | 200 | PASS |
| /api/analyze | POST | 422 | 422 | PASS |
| /api/simulate | POST | 200 | 200 | PASS |
| /api/simulate | POST | 400 | 400 | PASS |
| /ws/events | WS | status + ack | 101 | PASS |

## Details

### 1. Root

- Method: GET
- Path: /
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"message": "GeoPulse AI API", "version": "1.0.0", "status": "running"}
```

### 2. Health

- Method: GET
- Path: /api/health
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "healthy", "timestamp": "2026-03-30T05:05:04.668247Z", "events_count": 6, "validations_count": 0}
```

### 3. Events List

- Method: GET
- Path: /api/events?limit=10
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "success", "data": [{"event_id": "evt_20260211_tariff", "headline": "US imposes 25% tariffs on European auto imports", "source": "Wall Street Journal", "timestamp": "2026-02-11T11:00:00Z", "ingested_at": "2026-03-30T05:05:04.669257", "event_type": "REGULATION", "severity": "HIGH", "event_sentiment": "NEGATIVE", "confidence": 0.8, "macro_effect": "Trade War", "market_pressure": "DEFENSIVE", "prediction_horizon": "MEDIUM_TERM", "sector_impacts": [{"sector": "Automotive", "direction": "DOWN", "weight": -0.8}], "affected_assets": [{"ticker": "VWAGY", "name": "Volkswagen", "asset_class": "Equity", "sector": "Automotive", "prediction": "BEARISH", "confidence": 0.88, "reason": "Higher tariffs cut US market competitiveness.", "actual_move_pct": null, "validation_status": null, "validated_at": null}, {"ticker": "F", "name": "Ford", "asset_class": "Equity", "sector": "Automotive", "pred...
```

### 4. Events List Invalid Limit

- Method: GET
- Path: /api/events?limit=0
- Expected: 422
- Actual status: 422
- Result: PASS
- Response sample:

```json
{"detail": [{"type": "greater_than_equal", "loc": ["query", "limit"], "msg": "Input should be greater than or equal to 1", "input": "0", "ctx": {"ge": 1}}]}
```

### 5. Event Detail Existing

- Method: GET
- Path: /api/events/evt_20260211_tariff
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "success", "data": {"event_id": "evt_20260211_tariff", "headline": "US imposes 25% tariffs on European auto imports", "source": "Wall Street Journal", "timestamp": "2026-02-11T11:00:00Z", "severity": "HIGH", "event_sentiment": "NEGATIVE", "macro_effect": "Trade War", "prediction_horizon": "MEDIUM_TERM", "market_pressure": "DEFENSIVE", "logic_chain": [{"type": "event", "text": "US 25% auto tariffs"}, {"type": "macro", "text": "Trade War"}, {"type": "sector", "text": "Automotive"}, {"type": "asset", "text": "VWAGY"}], "affected_assets": [{"ticker": "VWAGY", "name": "Volkswagen", "asset_class": "Equity", "sector": "Automotive", "prediction": "BEARISH", "confidence": 0.88, "reason": "Higher tariffs cut US market competitiveness."}, {"ticker": "F", "name": "Ford", "asset_class": "Equity", "sector": "Automotive", "prediction": "BULLISH", "confidence": 0.72, "reason": "Domestic autom...
```

### 6. Validate Existing Event

- Method: GET
- Path: /api/validate/evt_20260211_tariff?horizon=1h
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "success", "data": {"event_id": "evt_20260211_tariff", "horizon": "1h", "correct": 1, "incorrect": 1, "pending": 0, "accuracy": 0.5, "affected_assets": [{"ticker": "VWAGY", "name": "Volkswagen", "asset_class": "Equity", "sector": "Automotive", "prediction": "BEARISH", "confidence": 0.88, "reason": "Higher tariffs cut US market competitiveness.", "actual_move_pct": -1.18, "validation_status": "CORRECT", "validated_at": "2026-03-30T05:05:04.672178+00:00"}, {"ticker": "F", "name": "Ford", "asset_class": "Equity", "sector": "Automotive", "prediction": "BULLISH", "confidence": 0.72, "reason": "Domestic automakers gain market share.", "actual_move_pct": -1.98, "validation_status": "INCORRECT", "validated_at": "2026-03-30T05:05:06.765147+00:00"}]}}
```

### 7. Event Detail Missing

- Method: GET
- Path: /api/events/nonexistent_event_id_123
- Expected: 404
- Actual status: 404
- Result: PASS
- Response sample:

```json
{"detail": "Event not found"}
```

### 8. Validate Missing Event

- Method: GET
- Path: /api/validate/nonexistent_event_id_123?horizon=1h
- Expected: 404
- Actual status: 404
- Result: PASS
- Response sample:

```json
{"detail": "Event not found"}
```

### 9. Validate Invalid Horizon

- Method: GET
- Path: /api/validate/nonexistent_event_id_123?horizon=2h
- Expected: 422
- Actual status: 422
- Result: PASS
- Response sample:

```json
{"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "horizon"], "msg": "String should match pattern '^(1h|6h|24h)$'", "input": "2h", "ctx": {"pattern": "^(1h|6h|24h)$"}}]}
```

### 10. Validations List

- Method: GET
- Path: /api/validations?limit=20
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "success", "data": [{"event_id": "evt_20260211_tariff", "headline": "US imposes 25% tariffs on European auto imports", "predicted_direction": "BULLISH", "predicted_ticker": "F", "predicted_confidence": 0.72, "horizon": "1d", "price_at_event": 0.0, "price_at_validation": 0.0, "actual_change_percent": -1.98, "status": "INCORRECT", "validated_at": "2026-03-30T05:05:06.765147Z"}, {"event_id": "evt_20260211_tariff", "headline": "US imposes 25% tariffs on European auto imports", "predicted_direction": "BEARISH", "predicted_ticker": "VWAGY", "predicted_confidence": 0.88, "horizon": "1d", "price_at_event": 0.0, "price_at_validation": 0.0, "actual_change_percent": -1.18, "status": "CORRECT", "validated_at": "2026-03-30T05:05:04.672178Z"}]}
```

### 11. Price Valid

- Method: GET
- Path: /api/price?ticker=AAPL&price_range=1d
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"ticker": "AAPL", "prices": [{"time": "2026-03-31T08:10:00.000000Z", "price": 142.18}]}
```

### 12. Price Invalid Range

- Method: GET
- Path: /api/price?ticker=AAPL&price_range=2d
- Expected: 422
- Actual status: 422
- Result: PASS
- Response sample:

```json
{"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "price_range"], "msg": "String should match pattern '^(1h|1d|1w|1m)$'", "input": "2d", "ctx": {"pattern": "^(1h|1d|1w|1m)$"}}]}
```

### 13. Analyze Valid

- Method: POST
- Path: /api/analyze
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "success", "data": {"event_id": "evt_20260330_050507_cf1fa0", "headline": "OPEC announces additional production cuts amid volatility", "source": "Integration Test", "timestamp": "2026-03-30T05:05:07.119963Z", "event_type": "ENERGY", "severity": "HIGH", "event_sentiment": "POSITIVE", "confidence": 0.712, "macro_effect": "Oil supply contraction", "sector_impacts": [{"sector": "Energy", "direction": "UP", "weight": 0.92}, {"sector": "Transportation", "direction": "DOWN", "weight": -0.72}, {"sector": "Materials", "direction": "UP", "weight": 0.35}], "prediction_horizon": "SHORT_TERM", "market_pressure": "RISK_ON", "logic_chain": [{"type": "event", "text": "OPEC announces additional production cuts amid volatility"}, {"type": "macro", "text": "Oil supply contraction"}, {"type": "sector", "text": "Energy"}, {"type": "asset", "text": "XOM"}], "affected_assets": [{"ticker": "XOM", "na...
```

### 14. Analyze Missing Headline

- Method: POST
- Path: /api/analyze
- Expected: 422
- Actual status: 422
- Result: PASS
- Response sample:

```json
{"detail": [{"type": "missing", "loc": ["body", "headline"], "msg": "Field required", "input": {"source": "Integration Test"}}]}
```

### 15. Simulate Valid

- Method: POST
- Path: /api/simulate
- Expected: 200
- Actual status: 200
- Result: PASS
- Response sample:

```json
{"status": "success", "data": {"headline": "Major cyberattack disrupts semiconductor supply chain", "event_type": "TECH", "confidence": 0.627, "sector_impacts": [{"sector": "Semiconductors", "direction": "UP", "weight": 0.91}, {"sector": "Technology", "direction": "UP", "weight": 0.88}, {"sector": "Utilities", "direction": "DOWN", "weight": -0.08}], "affected_assets": [{"ticker": "NVDA", "name": "NVIDIA", "asset_class": "Equity", "sector": "Semiconductors", "prediction": "BULLISH", "confidence": 0.619, "reason": "Technology demand acceleration benefits semiconductors sensitivity."}, {"ticker": "AMD", "name": "AMD", "asset_class": "Equity", "sector": "Semiconductors", "prediction": "BULLISH", "confidence": 0.619, "reason": "Technology demand acceleration benefits semiconductors sensitivity."}, {"ticker": "MSFT", "name": "Microsoft", "asset_class": "Equity", "sector": "Technology", "predic...
```

### 16. Simulate Blank Scenario

- Method: POST
- Path: /api/simulate
- Expected: 400
- Actual status: 400
- Result: PASS
- Response sample:

```json
{"detail": "Scenario cannot be empty"}
```

### 17. WebSocket Events

- Method: WS
- Path: /ws/events
- Expected: status + ack
- Actual status: 101
- Result: PASS
- Response sample:

```json
{"initial": {"type": "status", "message": "Connected to GeoPulse event stream. 1 client(s) online.", "status": "connected", "activeConnections": 1}, "ack": {"type": "ack", "message": "Message received"}}
```
