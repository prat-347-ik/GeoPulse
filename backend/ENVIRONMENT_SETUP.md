# Environment Configuration Guide

## MongoDB Setup

### 1. Local Development

Create `.env` file in the backend directory:

```env
# MongoDB Connection
MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=geopulse

# Optional: For MongoDB Atlas (Cloud)
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
# MONGO_DB_NAME=geopulse
```

### 2. MongoDB Installation

#### Option A: Docker (Recommended)

```bash
# Start MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest

# With persistence
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest
```

#### Option B: Local Installation

**macOS (Homebrew)**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian**:
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

**Windows**:
1. Download from https://www.mongodb.com/try/download/community
2. Run installer
3. MongoDB runs as Windows Service by default

### 3. Verify Connection

```bash
# Test connection
mongosh "mongodb://localhost:27017"

# List databases
> show dbs

# Create geopulse database
> use geopulse
> db.createCollection("events")
> show collections
```

---

## Requirements

### Python Dependencies

```bash
# Core dependencies
pip install fastapi uvicorn
pip install motor motor-asyncio  # Async MongoDB driver
pip install pydantic python-dateutil
pip install python-dotenv

# Development
pip install pytest pytest-asyncio
pip install black flake8 mypy
```

### Or Install from requirements.txt

```bash
pip install -r requirements.txt
```

---

## API Initialization

### Automatic Initialization (Recommended)

The application automatically:
1. Connects to MongoDB on startup
2. Creates all 11 recommended indexes
3. Initializes the database schema

No manual setup needed!

### Manual Index Creation

If you need to recreate indexes:

```bash
# From project root
python -m app.db.init_indexes

# Or with arguments
python -m app.db.init_indexes --drop  # Reset all indexes
```

---

## Testing the Setup

### 1. Start the API

```bash
cd backend

# Activate virtual environment (Windows)
venv\Scripts\activate

# Or macOS/Linux
source venv/bin/activate

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Check Health

```bash
curl http://localhost:8000/

# Expected response:
# {
#   "message": "GeoPulse AI API",
#   "version": "1.0.0",
#   "status": "running"
# }
```

### 3. Test Endpoints

```bash
# Get latest events
curl http://localhost:8000/api/events?limit=10

# Get high-impact events
curl http://localhost:8000/api/events?min_confidence=0.7

# Get sector events
curl http://localhost:8000/api/events/sector/Energy
```

---

## Environment Troubleshooting

### MongoDB Connection Issues

**Error**: `Connection refused`
- Check if MongoDB is running: `systemctl status mongodb` (Linux)
- Check network: `telnet localhost 27017`
- Verify MONGO_URL in .env

**Error**: `Authentication failed`
- If using credentials, ensure format:
  ```
  MONGO_URL=mongodb://username:password@localhost:27017/
  ```

**Error**: `Database geopulse not found`
- Normal - MongoDB creates it automatically on first write

### Index Issues

**Error**: `Index already exists`
- Normal - Duplicate index attempts are ignored by MongoDB

**Error**: `Indexes not created`
- Check MongoDB permissions
- Check disk space
- Review logs: `tail -f app.log`

---

## Production Deployment

### MongoDB Atlas (Recommended for Production)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update .env:
   ```env
   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
   MONGO_DB_NAME=geopulse
   ```

### Performance Tuning

1. **Enable Compression**: Add to MONGO_URL
   ```
   compressors=snappy,zlib
   ```

2. **Connection Pooling**:
   ```python
   maxPoolSize=50
   minPoolSize=10
   ```

3. **Index Statistics**:
   ```bash
   db.events.aggregate([
     { $indexStats: {} }
   ]).pretty()
   ```

---

## Monitoring

### Check Database Size

```bash
mongosh
> use geopulse
> db.events.stats()
```

### Monitor Index Usage

```javascript
db.events.aggregate([
  { $indexStats: {} }
]).pretty()
```

### Check Event Count

```bash
curl http://localhost:8000/api/analytics/count
```

---

## Backup & Restore

### Backup MongoDB

```bash
# Backup entire database
mongodump --db geopulse --out ./backup

# Backup with compression
mongodump --db geopulse --archive=geopulse.archive --gzip
```

### Restore MongoDB

```bash
# Restore from backup
mongorestore --db geopulse ./backup/geopulse

# Restore from archive
mongorestore --archive=geopulse.archive --gzip
```

---

Generated: March 28, 2026
