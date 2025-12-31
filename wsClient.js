// wsClient.js
import WebSocket from "ws";

const API_KEY = process.env.TWELVEDATA_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ TWELVEDATA_API_KEY is missing in env (.env). WS will not connect.");
}

// Public: latest prices (symbol -> { price, ts })
export const priceStore = {};

// Private WS manager state
let ws = null;
let isConnected = false;
let isConnecting = false;

// Track what we believe is currently subscribed on THIS connection
const activeSubscriptions = new Set();

// If subscribe() is called before open, we queue symbols here
const pendingSubscribe = new Set();

// Optional: keepalive + reconnect
let heartbeatTimer = null;
let reconnectTimer = null;

// --- Helpers ---
function buildWsUrl() {
  // Per Twelve Data docs: wss://ws.twelvedata.com/v1/quotes/price?apikey=your_api_key
  return `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`;
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  // Recommended ~10s
  heartbeatTimer = setInterval(() => {
    if (ws && isConnected) {
      try {
        ws.send(JSON.stringify({ action: "heartbeat" }));
      } catch (e) {
        console.warn("⚠️ Heartbeat send failed:", e?.message || e);
      }
    }
  }, 10_000);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function scheduleReconnect(delayMs = 2000) {
  if (reconnectTimer) return; // already scheduled
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(); // re-connect
  }, delayMs);
}

function connect() {
  if (!API_KEY) return;
  if (isConnected || isConnecting) return;

  isConnecting = true;
  console.log("🔌 Connecting to Twelve Data WS...");

  ws = new WebSocket(buildWsUrl());

  ws.on("open", () => {
    isConnected = true;
    isConnecting = false;
    console.log("✅ WS connected");

    // IMPORTANT:
    // A new WS connection starts with no subscriptions.
    // Clear activeSubscriptions because server state is reset.
    activeSubscriptions.clear();

    startHeartbeat();

    // Flush any pending subscriptions requested before open
    if (pendingSubscribe.size > 0) {
      const symbols = [...pendingSubscribe];
      pendingSubscribe.clear();
      internalSubscribe(symbols);
    }
  });

  ws.on("message", (raw) => {
    const msg = safeJsonParse(raw.toString());
    if (!msg) return;

    // Useful debugging:
    // console.log("RAW:", msg);

    // Price events
    if (msg.event === "price" && msg.symbol && msg.price) {
      priceStore[msg.symbol] = {
        price: Number(msg.price),
        ts: Number(msg.timestamp) || Date.now(),
      };
      return;
    }

    // Subscription status events
    if (msg.event === "subscribe-status") {
      // You can inspect msg.success / msg.fails if you want stricter tracking.
      return;
    }

    if (msg.event === "unsubscribe-status") {
      return;
    }

    // Heartbeat response
    if (msg.event === "heartbeat") {
      return;
    }
  });

  ws.on("close", () => {
    console.warn("⚠️ WS closed");
    isConnected = false;
    isConnecting = false;
    stopHeartbeat();

    // clear ws ref
    ws = null;

    // schedule reconnect
    scheduleReconnect(2000);
  });

  ws.on("error", (err) => {
    // In WS, error is often followed by close
    console.warn("⚠️ WS error:", err?.message || err);
  });
}

// Internal subscribe that assumes connection is open
function internalSubscribe(symbols) {
  const cleaned = symbols
    .map((s) => String(s).trim())
    .filter(Boolean);

  const toSubscribe = cleaned.filter((s) => !activeSubscriptions.has(s));
  if (toSubscribe.length === 0) return;

  ws.send(
    JSON.stringify({
      action: "subscribe",
      params: { symbols: toSubscribe.join(",") },
    })
  );

  toSubscribe.forEach((s) => activeSubscriptions.add(s));
}

// --- Public API ---

// Connect ONLY (no auto subscribe). Call once from index.js on startup.
export function startPriceStream() {
  connect();
}

// Subscribe symbols (safe to call even if not connected yet)
export function subscribe(symbols = []) {
  const cleaned = symbols
    .map((s) => String(s).trim())
    .filter(Boolean);

  if (cleaned.length === 0) return;

  // If not connected yet, queue them
  if (!isConnected || !ws) {
    cleaned.forEach((s) => pendingSubscribe.add(s));
    connect();
    return;
  }

  internalSubscribe(cleaned);
}

// Unsubscribe symbols (only if currently active + connected)
export function unsubscribe(symbols = []) {
  const cleaned = symbols
    .map((s) => String(s).trim())
    .filter(Boolean);

  if (cleaned.length === 0) return;
  if (!isConnected || !ws) return;

  const toUnsubscribe = cleaned.filter((s) => activeSubscriptions.has(s));
  if (toUnsubscribe.length === 0) return;

  ws.send(
    JSON.stringify({
      action: "unsubscribe",
      params: { symbols: toUnsubscribe.join(",") },
    })
  );

  toUnsubscribe.forEach((s) => activeSubscriptions.delete(s));
}

// Debug/status helper
export function getWsStatus() {
  return {
    connected: isConnected,
    connecting: isConnecting,
    activeSubscriptions: [...activeSubscriptions],
    pendingSubscribe: [...pendingSubscribe],
    storeSize: Object.keys(priceStore).length,
  };
}