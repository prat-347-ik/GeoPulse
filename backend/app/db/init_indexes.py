"""
MongoDB Index Initialization Script
Run this script to create all recommended indexes for optimal performance.

Usage:
  python -m app.db.init_indexes
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient


async def create_indexes():
    """Create all recommended indexes in the events collection"""
    
    # Get connection parameters from environment
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "geopulse")
    
    print(f"📊 Connecting to MongoDB: {mongo_url}")
    
    try:
        # Connect
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        collection = db.events
        
        # Verify connection
        await client.admin.command('ping')
        print(f"✅ Connected to database: {db_name}\n")
        
        # 🟢 PRIMARY INDEXES
        print("🟢 Creating PRIMARY INDEXES (Critical for Performance)...")
        
        await collection.create_index([("timestamp", -1)])
        print("  ✅ Index: timestamp -1 (Latest Events Feed)")
        
        await collection.create_index([("confidence", -1)])
        print("  ✅ Index: confidence -1 (High Impact Events)")
        
        await collection.create_index([("event_type", 1), ("timestamp", -1)])
        print("  ✅ Index: event_type +1, timestamp -1 (Type Filtering)")
        
        await collection.create_index([("market_pressure", 1), ("timestamp", -1)])
        print("  ✅ Index: market_pressure +1, timestamp -1 (Risk Mode)")
        
        # 🚀 ADVANCED INDEXES
        print("\n🚀 Creating ADVANCED INDEXES (High Value for UI)...")
        
        await collection.create_index([("sector_impacts.sector", 1)])
        print("  ✅ Index: sector_impacts.sector +1 (Sector Search)")
        
        await collection.create_index([("affected_assets.ticker", 1)])
        print("  ✅ Index: affected_assets.ticker +1 (Asset Search)")
        
        await collection.create_index([
            ("timestamp", -1),
            ("confidence", -1)
        ])
        print("  ✅ Index: timestamp -1, confidence -1 (Optimized Feed)")
        
        await collection.create_index([("severity", 1)])
        print("  ✅ Index: severity +1 (Severity Filter)")
        
        # 📋 TRACKING INDEXES
        print("\n📋 Creating TRACKING INDEXES (Validation & Management)...")
        
        await collection.create_index([("is_validated", 1), ("timestamp", -1)])
        print("  ✅ Index: is_validated +1, timestamp -1 (Validation Tracking)")
        
        await collection.create_index([("tags", 1)])
        print("  ✅ Index: tags +1 (Tag Search)")
        
        await collection.create_index([("region", 1), ("timestamp", -1)])
        print("  ✅ Index: region +1, timestamp -1 (Regional Filtering)")
        
        # Get index statistics
        indexes = await collection.list_indexes().to_list(None)
        
        print(f"\n{'='*60}")
        print(f"📈 INDEX SUMMARY")
        print(f"{'='*60}")
        print(f"Total indexes created: {len(indexes)}")
        print(f"\nIndex Details:")
        for idx in indexes:
            index_name = idx.get("name", "Unknown")
            index_key = idx.get("key", {})
            print(f"  • {index_name}")
        
        print(f"\n✨ All indexes created successfully!")
        print(f"{'='*60}\n")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


async def drop_all_indexes():
    """Drop all non-_id indexes (for testing/reset)"""
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "geopulse")
    
    print(f"⚠️  Dropping all indexes from {db_name}.events...")
    
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        collection = db.events
        
        await collection.drop_indexes()
        print("✅ All indexes dropped\n")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="MongoDB Index Management")
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop all indexes (use for reset)"
    )
    
    args = parser.parse_args()
    
    if args.drop:
        success = asyncio.run(drop_all_indexes())
    else:
        success = asyncio.run(create_indexes())
    
    sys.exit(0 if success else 1)
