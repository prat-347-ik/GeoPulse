"""
Event Repository
Handles all database operations for events with optimized indexes and queries
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.db.schemas import Event


class EventRepository:
    """
    Event Repository with comprehensive indexing and query patterns
    Supports all frontend use cases: feed, filtering, sorting, searching
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.events
    
    async def create_all_indexes(self):
        """
        🔥 Create all recommended indexes on startup
        Critical for dashboard, filtering, and sorting performance
        """
        try:
            # 🟢 PRIMARY INDEXES (Must Have)
            
            # 1. Latest Events (for feed)
            await self.collection.create_index([("timestamp", -1)])
            print("✅ Index: timestamp (latest events feed)")
            
            # 2. Confidence-Based Ranking
            await self.collection.create_index([("confidence", -1)])
            print("✅ Index: confidence (high impact events)")
            
            # 3. Event Type Filtering
            await self.collection.create_index([("event_type", 1), ("timestamp", -1)])
            print("✅ Index: event_type + timestamp (filter by type)")
            
            # 4. Market Pressure Filtering
            await self.collection.create_index([("market_pressure", 1), ("timestamp", -1)])
            print("✅ Index: market_pressure + timestamp (risk mode)")
            
            # 🚀 ADVANCED INDEXES (High Value for UI)
            
            # 5. Sector Search (critical for UI)
            await self.collection.create_index([("sector_impacts.sector", 1)])
            print("✅ Index: sector_impacts.sector (sector-based view)")
            
            # 6. Asset Search (critical for UI)
            await self.collection.create_index([("affected_assets.ticker", 1)])
            print("✅ Index: affected_assets.ticker (asset-based view)")
            
            # 7. Compound Feed Index (best for dashboard)
            await self.collection.create_index([
                ("timestamp", -1),
                ("confidence", -1)
            ])
            print("✅ Index: timestamp + confidence (optimized feed)")
            
            # 8. Severity Filtering
            await self.collection.create_index([("severity", 1)])
            print("✅ Index: severity (severity filter)")
            
            # 9. Validation Tracking
            await self.collection.create_index([("is_validated", 1), ("timestamp", -1)])
            print("✅ Index: is_validated + timestamp (validation tracking)")
            
            # 10. Tags Search (for pro-level features)
            await self.collection.create_index([("tags", 1)])
            print("✅ Index: tags (tag-based filtering)")
            
            # 11. Region Filtering
            await self.collection.create_index([("region", 1), ("timestamp", -1)])
            print("✅ Index: region + timestamp (regional filtering)")
            
            # 🧹 OPTIONAL: TTL Index (auto-cleanup after 7 days)
            # Uncomment if you want auto-deletion
            # await self.collection.create_index(
            #     [("timestamp", 1)],
            #     expireAfterSeconds=604800
            # )
            # print("✅ Index: TTL (7-day auto-cleanup)")
            
            print("\n🎯 All indexes created successfully!")
            return True
        except Exception as e:
            print(f"❌ Index creation error: {e}")
            return False
    
    # =====================================================
    # CORE OPERATIONS
    # =====================================================
    
    async def save_event(self, event_data: Dict[str, Any]) -> str:
        """Save event to database and return event ID"""
        if "ingested_at" not in event_data:
            event_data["ingested_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(event_data)
        return str(result.inserted_id)
    
    async def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Get specific event by ID"""
        from bson import ObjectId
        event = await self.collection.find_one({"_id": ObjectId(event_id)})
        if event:
            event["_id"] = str(event["_id"])
        return event
    
    # =====================================================
    # QUERY PATTERNS (Frontend Ready)
    # =====================================================
    
    async def get_latest_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        🟢 Latest Events Feed
        Used for: GET /events?limit=50
        """
        cursor = self.collection.find().sort([("timestamp", -1)]).limit(limit)
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_high_impact_events(self, 
                                     min_confidence: float = 0.7,
                                     limit: int = 50) -> List[Dict[str, Any]]:
        """
        🔴 High Impact Events
        Used for: top impactful events ranking
        """
        cursor = self.collection.find({
            "confidence": {"$gte": min_confidence}
        }).sort([("confidence", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_sector_events(self, 
                                 sector: str,
                                 limit: int = 50) -> List[Dict[str, Any]]:
        """
        🟡 Sector-Based View
        Used for: show all events affecting specific sector
        """
        cursor = self.collection.find({
            "sector_impacts.sector": sector
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_asset_events(self,
                                ticker: str,
                                limit: int = 50) -> List[Dict[str, Any]]:
        """
        🔵 Asset-Based View
        Used for: show all events affecting specific ticker
        """
        cursor = self.collection.find({
            "affected_assets.ticker": ticker
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_risk_mode_events(self,
                                    market_pressure: str = "RISK_OFF",
                                    limit: int = 50) -> List[Dict[str, Any]]:
        """
        🟣 Risk Mode View
        Used for: show RISK_OFF events (defensive, high-risk scenarios)
        """
        cursor = self.collection.find({
            "market_pressure": market_pressure
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_events_by_type(self,
                                  event_type: str,
                                  limit: int = 50) -> List[Dict[str, Any]]:
        """
        Filter events by type (GEOPOLITICAL, ENERGY, etc.)
        Used for: filter: GEOPOLITICAL only
        """
        cursor = self.collection.find({
            "event_type": event_type
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_validated_events(self,
                                    limit: int = 50) -> List[Dict[str, Any]]:
        """Get events that have been validated in the market"""
        cursor = self.collection.find({
            "is_validated": True
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_events_by_region(self,
                                    region: str,
                                    limit: int = 50) -> List[Dict[str, Any]]:
        """Get events filtered by geographic region"""
        cursor = self.collection.find({
            "region": region
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_events_by_tags(self,
                                  tags: List[str],
                                  limit: int = 50) -> List[Dict[str, Any]]:
        """Get events filtered by tags"""
        cursor = self.collection.find({
            "tags": {"$in": tags}
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_clustered_events(self,
                                    cluster_id: str,
                                    limit: int = 50) -> List[Dict[str, Any]]:
        """Get all similar events in a cluster"""
        cursor = self.collection.find({
            "cluster_id": cluster_id
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    # =====================================================
    # ADVANCED QUERIES
    # =====================================================
    
    async def get_events_with_filters(self,
                                       event_type: Optional[str] = None,
                                       min_confidence: Optional[float] = None,
                                       market_pressure: Optional[str] = None,
                                       sector: Optional[str] = None,
                                       ticker: Optional[str] = None,
                                       region: Optional[str] = None,
                                       limit: int = 50) -> List[Dict[str, Any]]:
        """
        Flexible query with multiple optional filters
        Combines any number of filters (AND logic)
        """
        query: Dict[str, Any] = {}
        
        if event_type:
            query["event_type"] = event_type
        
        if min_confidence is not None:
            query["confidence"] = {"$gte": min_confidence}
        
        if market_pressure:
            query["market_pressure"] = market_pressure
        
        if sector:
            query["sector_impacts.sector"] = sector
        
        if ticker:
            query["affected_assets.ticker"] = ticker
        
        if region:
            query["region"] = region
        
        cursor = self.collection.find(query).sort([("timestamp", -1)]).limit(limit)
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    async def get_recent_events_since(self,
                                       hours_ago: int = 24,
                                       limit: int = 50) -> List[Dict[str, Any]]:
        """Get events from the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_ago)
        
        cursor = self.collection.find({
            "timestamp": {"$gte": cutoff_time}
        }).sort([("timestamp", -1)]).limit(limit)
        
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return events
    
    # =====================================================
    # STATISTICS & ANALYTICS
    # =====================================================
    
    async def get_event_count(self) -> int:
        """Get total event count"""
        return await self.collection.count_documents({})
    
    async def get_validated_count(self) -> int:
        """Get count of validated events"""
        return await self.collection.count_documents({"is_validated": True})
    
    async def get_average_confidence(self) -> float:
        """Get average confidence score"""
        result = await self.collection.aggregate([
            {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence"}}}
        ]).to_list(1)
        
        return result[0]["avg_confidence"] if result else 0
    
    async def get_sector_impact_summary(self) -> Dict[str, int]:
        """Get count of events by sector"""
        result = await self.collection.aggregate([
            {"$unwind": "$sector_impacts"},
            {"$group": {"_id": "$sector_impacts.sector", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]).to_list(None)
        
        return {item["_id"]: item["count"] for item in result}
    
    async def get_market_pressure_summary(self) -> Dict[str, int]:
        """Get count of events by market pressure"""
        result = await self.collection.aggregate([
            {"$group": {"_id": "$market_pressure", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]).to_list(None)
        
        return {item["_id"]: item["count"] for item in result}
    
    # =====================================================
    # UPDATE OPERATIONS
    # =====================================================
    
    async def update_event_validation(self,
                                       event_id: str,
                                       actual_move: float,
                                       validated_at: datetime = None) -> bool:
        """Mark event as validated with actual market move"""
        from bson import ObjectId
        
        result = await self.collection.update_one(
            {"_id": ObjectId(event_id)},
            {
                "$set": {
                    "is_validated": True,
                    "actual_move": actual_move,
                    "validated_at": validated_at or datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    async def update_impact_score(self, event_id: str, impact_score: float) -> bool:
        """Update precomputed impact score"""
        from bson import ObjectId
        
        result = await self.collection.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": {"impact_score": impact_score}}
        )
        
        return result.modified_count > 0
    
    async def add_tags(self, event_id: str, tags: List[str]) -> bool:
        """Add tags to an event"""
        from bson import ObjectId
        
        result = await self.collection.update_one(
            {"_id": ObjectId(event_id)},
            {"$addToSet": {"tags": {"$each": tags}}}
        )
        
        return result.modified_count > 0
    
    async def set_cluster_id(self, event_id: str, cluster_id: str) -> bool:
        """Assign event to cluster"""
        from bson import ObjectId
        
        result = await self.collection.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": {"cluster_id": cluster_id}}
        )
        
        return result.modified_count > 0
    
    # =====================================================
    # CLEANUP OPERATIONS
    # =====================================================
    
    async def delete_old_events(self, days_old: int = 7) -> int:
        """Delete events older than N days"""
        cutoff_time = datetime.utcnow() - timedelta(days=days_old)
        
        result = await self.collection.delete_many({
            "timestamp": {"$lt": cutoff_time}
        })
        
        return result.deleted_count