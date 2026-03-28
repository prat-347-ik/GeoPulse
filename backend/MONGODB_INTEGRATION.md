# MongoDB Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
pip install motor pymongo python-dotenv
```

### 2. Configure Environment

Create `.env`:
```env
MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=geopulse
```

### 3. Run the API

```bash
uvicorn app.main:app --reload
```

The server will:
- ✅ Connect to MongoDB
- ✅ Create all 11 indexes automatically
- ✅ Be ready to handle requests

---

## Using the Event Repository

### Basic Usage

```python
from app.db.mongodb import mongodb_connection
from app.db.repository import EventRepository
from app.db.schemas import Event

# Initialize
db = await mongodb_connection.connect()
repo = EventRepository(db)

# Create indexes (automatic on app startup)
await repo.create_all_indexes()

# Save an event
event_data = {
    "event_id": "evt_123",
    "headline": "OPEC cuts production",
    "source": "Reuters",
    "timestamp": datetime.utcnow(),
    "event_type": "ENERGY",
    "severity": "HIGH",
    "event_sentiment": "NEGATIVE",
    "confidence": 0.72,
    "macro_effect": "Oil supply contraction",
    "market_pressure": "INFLATIONARY",
    "prediction_horizon": "SHORT_TERM",
    "sector_impacts": [...],
    "affected_assets": [...],
    "logic_chain": [...],
    "why": "...",
    "meta": {...}
}

saved_id = await repo.save_event(event_data)
```

### Query Examples

```python
# Latest events
events = await repo.get_latest_events(limit=50)

# High impact events
events = await repo.get_high_impact_events(min_confidence=0.7)

# Sector analysis
events = await repo.get_sector_events(sector="Energy")

# Asset tracking
events = await repo.get_asset_events(ticker="XOM")

# Risk mode
events = await repo.get_risk_mode_events(market_pressure="RISK_OFF")

# Combined filters
events = await repo.get_events_with_filters(
    event_type="ENERGY",
    min_confidence=0.7,
    sector="Energy"
)
```

### Analytics

```python
# Statistics
count = await repo.get_event_count()
avg_confidence = await repo.get_average_confidence()

# Distribution
sectors = await repo.get_sector_impact_summary()
pressures = await repo.get_market_pressure_summary()
```

### Updates

```python
# Mark as validated
await repo.update_event_validation(
    event_id=event_id,
    actual_move=1.8
)

# Update impact score
await repo.update_impact_score(event_id, 0.85)

# Add tags
await repo.add_tags(event_id, ["oil", "critical"])

# Assign to cluster
await repo.set_cluster_id(event_id, "cluster_123")
```

---

## Schema Overview

### Document Fields

```python
{
    "_id": ObjectId,                    # MongoDB ID
    "event_id": str,                    # Unique event identifier
    "headline": str,                    # Event headline
    "source": str,                      # News source
    "timestamp": datetime,              # Event time
    "ingested_at": datetime,            # When we received it
    "event_type": str,                  # ENERGY, GEOPOLITICAL, etc.
    "severity": str,                    # LOW, MEDIUM, HIGH
    "event_sentiment": str,             # POSITIVE, NEGATIVE, MIXED
    "confidence": float,                # 0.0-1.0 confidence score
    "macro_effect": str,                # Macro implications
    "market_pressure": str,             # INFLATIONARY, DEFENSIVE, etc.
    "prediction_horizon": str,          # SHORT_TERM, MEDIUM_TERM, LONG_TERM
    "sector_impacts": [                 # Array of sector impacts
        {
            "sector": str,
            "direction": str,           # UP, DOWN, FLAT
            "weight": float             # -1.0 to 1.0
        }
    ],
    "affected_assets": [                # Array of assets impacted
        {
            "ticker": str,
            "name": str,
            "asset_class": str,         # Equity, Commodity, Crypto, Forex
            "sector": str,
            "prediction": str,          # BULLISH, BEARISH, NEUTRAL
            "confidence": float,
            "reason": str               # Why this prediction
        }
    ],
    "logic_chain": [                    # Reasoning chain
        {
            "type": str,                # event, macro, sector, asset
            "text": str                 # Description
        }
    ],
    "why": str,                         # Overall explanation
    "meta": {                           # Metadata
        "model": str,
        "llm_model": str,
        "confidence_components": {
            "context": float,
            "signal": float,
            "sector": float
        }
    },
    # Pro-level fields (optional)
    "tags": [str],                      # Tags for categorization
    "region": str,                      # Geographic region
    "cluster_id": str,                  # Event cluster ID
    "impact_score": float,              # Pre-computed impact
    "is_validated": bool,               # Market validated?
    "actual_move": float                # Actual % move
}
```

---

## Available Indexes

All these indexes are created automatically:

### Performance Critical
- `timestamp: -1` - Latest events feed
- `confidence: -1` - High impact sorting
- `event_type: 1, timestamp: -1` - Type filtering
- `market_pressure: 1, timestamp: -1` - Risk filtering
- `timestamp: -1, confidence: -1` - Dashboard optimization

### Search & Navigation
- `sector_impacts.sector: 1` - Sector search
- `affected_assets.ticker: 1` - Asset search
- `region: 1, timestamp: -1` - Regional filtering

### Management
- `severity: 1` - Severity filtering
- `is_validated: 1, timestamp: -1` - Validation tracking
- `tags: 1` - Tag-based search

---

## API Endpoints Using MongoDB

### Events Feed
```
GET /api/events?limit=50
Returns: Latest 50 events from now sorted by timestamp
```

### High Impact Events
```
GET /api/events/high-impact?confidence=0.7
Returns: Events with confidence >= 0.7
```

### Sector Events
```
GET /api/events/sector/{sector}
Returns: All events affecting specified sector
```

### Asset Events
```
GET /api/events/asset/{ticker}
Returns: All events affecting specified ticker
```

### Risk Mode
```
GET /api/events/risk-mode?market_pressure=RISK_OFF
Returns: Risk-off events
```

---

## Error Handling

### Connection Errors

```python
try:
    await mongodb_connection.connect()
except Exception as e:
    print(f"Connection failed: {e}")
    # Fallback to in-memory storage
```

### Query Errors

```python
try:
    events = await repo.get_latest_events(limit=50)
except Exception as e:
    print(f"Query failed: {e}")
    return []
```

---

## Performance Tips

1. **Use Limit**: Always use limit to avoid loading all events
   ```python
   events = await repo.get_latest_events(limit=50)
   ```

2. **Filter Early**: Use specific filters
   ```python
   events = await repo.get_events_with_filters(
       event_type="ENERGY",
       min_confidence=0.7
   )
   ```

3. **Index Queries**: Use indexed fields
   - timestamp ✅
   - confidence ✅
   - sector_impacts.sector ✅
   - affected_assets.ticker ✅

4. **Batch Operations**: Insert multiple events
   ```python
   await collection.insert_many(events_list)
   ```

---

## Monitoring

### Check Connection Health

```python
@app.get("/health")
async def health():
    try:
        db = mongodb_connection.get_db()
        await db.command('ping')
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### View Statistics

```python
count = await repo.get_event_count()
avg_conf = await repo.get_average_confidence()
sectors = await repo.get_sector_impact_summary()
```

---

## Migration from In-Memory

If migrating from in-memory storage:

```python
# Old: In-memory
events = events_store.list_all()

# New: MongoDB
events = await repo.get_latest_events(limit=50)
```

The Event schema remains the same - just change the backend!

---

## Testing

### Unit Test Example

```python
import pytest
from app.db.mongodb import mongodb_connection
from app.db.repository import EventRepository

@pytest.fixture
async def repo():
    db = await mongodb_connection.connect()
    return EventRepository(db)

@pytest.mark.asyncio
async def test_save_and_retrieve(repo):
    event_data = {...}
    event_id = await repo.save_event(event_data)
    event = await repo.get_event_by_id(event_id)
    assert event["headline"] == "Test headline"
```

---

## Troubleshooting

### Issue: "Connection refused"
**Solution**: 
- Ensure MongoDB is running: `mongodb.com/docs/manual/administration/install-community/`
- Check MONGO_URL in .env

### Issue: "Indexes not created"
**Solution**:
- Check MongoDB logs
- Verify permissions
- Run manual init: `python -m app.db.init_indexes`

### Issue: "Query timeout"
**Solution**:
- Add index to query fields
- Check MongoDB performance
- Use appropriate limits

### Issue: "Duplicate key error"
**Solution**:
- Check for unique constraints
- Use different event_id values

---

## Next Steps

1. ✅ **Set up MongoDB** - Follow ENVIRONMENT_SETUP.md
2. ✅ **Configure .env** - Add MONGO_URL and MONGO_DB_NAME
3. ✅ **Run the API** - `uvicorn app.main:app --reload`
4. ✅ **Test endpoints** - Use provided curl examples
5. ✅ **Monitor** - Check health endpoint regularly

---

Generated: March 28, 2026
Version: 1.0.0
