import "dotenv/config";

console.log("🔍 TWELVEDATA_API_KEY loaded:", Boolean(process.env.TWELVEDATA_API_KEY));

import express from "express";
import cors from "cors";

import {
  startPriceStream,
  subscribe,
  unsubscribe,
  priceStore,
  getWsStatus,
} from "./wsClient.js";

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(express.json());

/* -------------------- Boot WS once -------------------- */
if (process.env.TWELVEDATA_API_KEY) {
  startPriceStream();
} else {
  console.warn("⚠️ TWELVEDATA_API_KEY is missing in env (.env). WS will not connect.");
}

/* -------------------- Routes -------------------- */

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({ ok: true, service: "price-ws-backend" });
});

/**
 * Get latest prices (polling endpoint for Base44)
 * GET /prices?symbols=AAPL,BTC/USD
 */
app.get("/prices", (req, res) => {
  const symbols = (req.query.symbols || "")
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const result = {};

  for (const symbol of symbols) {
    if (priceStore[symbol]) {
      result[symbol] = priceStore[symbol];
    }
  }

  res.json(result);
});

/**
 * Subscribe symbols
 * POST /subscriptions
 * body: { "symbols": ["AAPL", "BTC/USD"] }
 */
app.post("/subscriptions", (req, res) => {
  const { symbols } = req.body;

  if (!Array.isArray(symbols)) {
    return res.status(400).json({
      error: "symbols must be an array",
    });
  }

  subscribe(symbols);

  res.json({
    ok: true,
    subscribed: symbols.map(s => s.toUpperCase()),
  });
});

/**
 * Unsubscribe symbols
 * DELETE /subscriptions
 * body: { "symbols": ["AAPL"] }
 */
app.delete("/subscriptions", (req, res) => {
  const { symbols } = req.body;

  if (!Array.isArray(symbols)) {
    return res.status(400).json({
      error: "symbols must be an array",
    });
  }

  unsubscribe(symbols);

  res.json({
    ok: true,
    unsubscribed: symbols.map(s => s.toUpperCase()),
  });
});

/**
 * WebSocket status & debug info
 * GET /ws-status
 */
app.get("/ws-status", (req, res) => {
  res.json(getWsStatus());
});

/* -------------------- Start Server -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Price backend running on http://localhost:${PORT}`);
});