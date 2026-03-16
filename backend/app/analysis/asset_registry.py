from __future__ import annotations


SECTOR_ASSETS: dict[str, list[dict[str, str]]] = {
    "Energy": [
        {"ticker": "XOM", "name": "Exxon Mobil", "asset_class": "Equity"},
        {"ticker": "CVX", "name": "Chevron", "asset_class": "Equity"},
        {"ticker": "SLB", "name": "Schlumberger", "asset_class": "Equity"},
    ],
    "Transportation": [
        {"ticker": "DAL", "name": "Delta Air Lines", "asset_class": "Equity"},
        {"ticker": "UAL", "name": "United Airlines", "asset_class": "Equity"},
    ],
    "Defense": [
        {"ticker": "LMT", "name": "Lockheed Martin", "asset_class": "Equity"},
        {"ticker": "RTX", "name": "RTX Corp", "asset_class": "Equity"},
        {"ticker": "NOC", "name": "Northrop Grumman", "asset_class": "Equity"},
    ],
    "Technology": [
        {"ticker": "MSFT", "name": "Microsoft", "asset_class": "Equity"},
        {"ticker": "AAPL", "name": "Apple", "asset_class": "Equity"},
        {"ticker": "NVDA", "name": "NVIDIA", "asset_class": "Equity"},
    ],
    "Semiconductors": [
        {"ticker": "NVDA", "name": "NVIDIA", "asset_class": "Equity"},
        {"ticker": "AMD", "name": "AMD", "asset_class": "Equity"},
        {"ticker": "TSM", "name": "TSMC", "asset_class": "Equity"},
    ],
    "Utilities": [
        {"ticker": "NEE", "name": "NextEra Energy", "asset_class": "Equity"},
        {"ticker": "DUK", "name": "Duke Energy", "asset_class": "Equity"},
    ],
    "Materials": [
        {"ticker": "FCX", "name": "Freeport-McMoRan", "asset_class": "Equity"},
        {"ticker": "NEM", "name": "Newmont", "asset_class": "Equity"},
    ],
    "Industrials": [
        {"ticker": "CAT", "name": "Caterpillar", "asset_class": "Equity"},
        {"ticker": "DE", "name": "Deere", "asset_class": "Equity"},
    ],
    "Consumer": [
        {"ticker": "AMZN", "name": "Amazon", "asset_class": "Equity"},
        {"ticker": "WMT", "name": "Walmart", "asset_class": "Equity"},
    ],
    "Financials": [
        {"ticker": "JPM", "name": "JPMorgan Chase", "asset_class": "Equity"},
        {"ticker": "XLF", "name": "Financial Select Sector SPDR", "asset_class": "Equity"},
    ],
    "Real Estate": [
        {"ticker": "VNQ", "name": "Vanguard Real Estate ETF", "asset_class": "Equity"},
        {"ticker": "PLD", "name": "Prologis", "asset_class": "Equity"},
    ],
    "Crypto": [
        {"ticker": "BTC", "name": "Bitcoin", "asset_class": "Crypto"},
        {"ticker": "ETH", "name": "Ethereum", "asset_class": "Crypto"},
        {"ticker": "COIN", "name": "Coinbase", "asset_class": "Equity"},
    ],
    "Fintech": [
        {"ticker": "COIN", "name": "Coinbase", "asset_class": "Equity"},
        {"ticker": "PYPL", "name": "PayPal", "asset_class": "Equity"},
    ],
    "Broad Market": [
        {"ticker": "SPY", "name": "S&P 500 ETF", "asset_class": "Equity"},
        {"ticker": "QQQ", "name": "Nasdaq 100 ETF", "asset_class": "Equity"},
    ],
}


def assets_for_sector(sector: str) -> list[dict[str, str]]:
    return list(SECTOR_ASSETS.get(sector, SECTOR_ASSETS["Broad Market"]))