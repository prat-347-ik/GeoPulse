"""
MongoDB Connection and Setup
Handles async MongoDB connection and initialization
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from contextlib import asynccontextmanager


class MongoDBConnection:
    """Manages MongoDB connection and database lifecycle"""
    
    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db: AsyncIOMotorDatabase = None
    
    async def connect(self):
        """Establish connection to MongoDB"""
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.getenv("MONGO_DB_NAME", "geopulse")
        
        try:
            self.client = AsyncIOMotorClient(mongo_url)
            self.db = self.client[db_name]
            # Verify connection
            await self.client.admin.command('ping')
            print(f"✅ Connected to MongoDB: {db_name}")
            return self.db
        except Exception as e:
            print(f"❌ MongoDB Connection Failed: {e}")
            raise
    
    async def disconnect(self):
        """Close MongoDB connection"""
        if self.client is not None:
            self.client.close()
            print("✅ MongoDB connection closed")
    
    def get_db(self) -> AsyncIOMotorDatabase:
        """Get current database instance"""
        if self.db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self.db


# Global connection instance
mongodb_connection = MongoDBConnection()


@asynccontextmanager
async def get_db_context():
    """Context manager for database operations"""
    try:
        yield mongodb_connection.get_db()
    except Exception as e:
        print(f"Database context error: {e}")
        raise


async def get_db() -> AsyncIOMotorDatabase:
    """Dependency injection for FastAPI"""
    return mongodb_connection.get_db()
