# Folio Prices Backend

A lightweight Node.js service that acts as a real-time price proxy and cache for financial data using the **Twelve Data** WebSocket API. It supports live price updates for stocks and crypto, including pre-market and post-market (extended hours) data.

## Features
- **Real-time Streaming**: Connects to Twelve Data WebSockets once and caches prices in-memory.
- **Extended Hours**: Includes `prepost=true` to fetch data during US pre-market and post-market sessions.
- **Trend Detection**: Automatically tracks price movement with a trend indicator (`+`, `-`, `=`).
- **Subscription Management**: Dynamic subscribing/unsubscribing to symbols via REST API.

---

## Connection Guide

The service is deployed at: **[https://folio-prices-backend.onrender.com](https://folio-prices-backend.onrender.com)**

Alternatively, if running locally, it uses `http://localhost:3001` (or the `PORT` defined in your environment).

### 1. Fetching Latest Prices
To get the latest cached prices for specific symbols.

- **Endpoint**: `GET /prices`
- **Query Parameter**: `symbols` (Comma-separated list)
- **Example**: `GET /prices?symbols=AAPL,BTC/USD,TSLA`

**Response Structure:**
```json
{
  "AAPL": {
    "price": 190.5,
    "ts": 1736801356000,
    "trend": "+"
  },
  "BTC/USD": {
    "price": 42500.1,
    "ts": 1736801356050,
    "trend": "-"
  }
}
```
- `price`: The latest numerical price.
- `ts`: Unix timestamp (milliseconds) of the update.
- `trend`: Movement since the previous update (`+` increase, `-` decrease, `=` no change).

---

### 2. Managing Subscriptions
The service only fetches data for symbols it is currently "subscribed" to on the Twelve Data WebSocket.

#### Subscribe to Symbols
Use this to add new stocks or crypto to the live stream.
- **Endpoint**: `POST /subscriptions`
- **Body**: `{ "symbols": ["AMD", "NVDA"] }`

#### Unsubscribe from Symbols
Use this to stop tracking symbols and save bandwidth/API limits.
- **Endpoint**: `DELETE /subscriptions`
- **Body**: `{ "symbols": ["AMD"] }`

---

### 3. Monitoring Service Health
Get real-time status of the WebSocket connection and current activity.

- **Endpoint**: `GET /ws-status`
- **Response Example**:
```json
{
  "connected": true,
  "connecting": false,
  "activeSubscriptions": ["AAPL", "BTC/USD"],
  "pendingSubscribe": [],
  "storeSize": 2
}
```

---

## How to Run
1. Create a `.env` file and add your API key:
   ```env
   TWELVEDATA_API_KEY=your_api_key_here
   PORT=3001
   ```
2. Install dependencies: `npm install`
3. Start the server: `npm start`

## Deployment
This service is configured for easy deployment on platforms like Render or Heroku. Ensure you add the `TWELVEDATA_API_KEY` to your deployment's environment variables.
