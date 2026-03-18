from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime

class EventRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.events

    async def create_indexes(self):
        """Run once on startup to ensure high-performance queries."""
        await self.collection.create_index([("timestamp", -1)])
        await self.collection.create_index([("confidence", -1)])
        await self.collection.create_index([("event_type", 1), ("timestamp", -1)])
        await self.collection.create_index([("sector_impacts.sector", 1)])
        await self.collection.create_index([("affected_assets.ticker", 1)])
        print("✅ MongoDB Indexes Created")

    async def save_event(self, event_data: dict):
        # Ensure ingested_at is set for tracking
        event_data["ingested_at"] = datetime.utcnow()
        result = await self.collection.insert_one(event_data)
        return str(result.inserted_id)

    async def get_latest_events(self, limit: int = 50, sector: Optional[str] = None):
        query = {}
        if sector:
            query["sector_impacts.sector"] = sector
            
        cursor = self.collection.find(query).sort("timestamp", -1).limit(limit)
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        return events