# GeoPulse AI

> Turning breaking news into market impact predictions — instantly.

**Event → Macro → Ripple → Asset — Explainable, fast, and demo-ready.**

## Overview

GeoPulse AI is a news-to-market-impact predictor dashboard that demonstrates:
- Live event feed with severity indicators
- Ripple visualization showing event → macro → sector → asset flows
- Asset predictions with confidence scores
- Validation panel showing predicted vs actual price movement

## Tech Stack

### Frontend
- **Vite** + **React** (JavaScript)
- **Tailwind CSS** for styling
- **@xyflow/react** for ripple graph visualization
- **Framer Motion** for animations
- **Lucide React** for icons

### Backend
- **Python FastAPI**
- **Pydantic** for data validation
- **yfinance** for price data (optional)

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3000

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## Project Structure

```
GeoPulse/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopBar.jsx        # Header with live status
│   │   │   ├── EventFeed.jsx     # Left sidebar event list
│   │   │   ├── ImpactCard.jsx    # Main impact analysis view
│   │   │   ├── AssetCard.jsx     # Individual asset prediction cards
│   │   │   ├── RippleGraph.jsx   # React Flow visualization
│   │   │   └── ValidationPanel.jsx # Validation results table
│   │   ├── lib/
│   │   │   └── api.js            # API client with fallback to mock data
│   │   ├── App.jsx               # Main application component
│   │   └── main.jsx              # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/
│   ├── main.py                   # FastAPI application
│   ├── models/
│   │   └── event_model.py        # Pydantic models
│   ├── workers/                  # Background workers (placeholder)
│   └── requirements.txt
└── mock_data/
    ├── mock_data.json            # Sample events
    └── mock_validations.json     # Sample validation results
```

## Features

### Event Feed
- Real-time event list with severity badges (HIGH/MEDIUM/LOW)
- Quick impact summary showing affected assets
- Click to view detailed analysis

### Impact Analysis
- Full event headline and metadata
- Macro effect and market pressure indicators
- Confidence ring visualization
- Affected assets grid with individual predictions

### Ripple Graph
- Interactive visualization using React Flow
- Animated nodes showing event → macro → sector → asset flow
- Color-coded by prediction direction (green/red)

### Validation Panel
- Historical prediction accuracy tracking
- Actual vs predicted comparison
- Calibration chart showing confidence reliability

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | Get latest events |
| `/api/events/{id}` | GET | Get specific event |
| `/api/validations` | GET | Get validation results |
| `/api/validate/{id}` | GET | Run validation for event |
| `/api/price` | GET | Get price data for ticker |
| `/api/analyze` | POST | Analyze news headline |

## Demo Mode

Toggle "Demo Mode" in the top bar to switch between:
- **Demo Mode**: Uses mock data for reliable demonstration
- **Live Mode**: Fetches from backend API (requires backend running)

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Render/Railway)
```bash
cd backend
# Deploy with: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Event Schema

```json
{
  "event_id": "evt_YYYY_XXXX",
  "headline": "string",
  "source": "string",
  "timestamp": "ISO8601",
  "severity": "LOW|MEDIUM|HIGH",
  "event_sentiment": "POSITIVE|NEGATIVE|MIXED",
  "macro_effect": "string",
  "prediction_horizon": "SHORT_TERM|MEDIUM_TERM|LONG_TERM",
  "market_pressure": "INFLATIONARY|DEFENSIVE|RISK_OFF|RISK_ON|COST_PRESSURE|LIQUIDITY",
  "logic_chain": [...],
  "affected_assets": [...],
  "why": "string",
  "meta": {...}
}
```

## License

MIT
