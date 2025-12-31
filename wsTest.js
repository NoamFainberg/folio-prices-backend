import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

const ws = new WebSocket(
  `wss://ws.twelvedata.com/v1/quotes/price?apikey=${process.env.TWELVE_DATA_API_KEY}`
);

ws.on("open", () => {
  console.log("✅ WS connected");

  ws.send(
    JSON.stringify({
      action: "subscribe",
      params: {
        symbols: "BTC/USD"
      }
    })
  );
});

ws.on("message", (raw) => {
  const msg = raw.toString();
  console.log("📩 RAW:", msg);
});

ws.on("error", (err) => {
  console.error("❌ WS error:", err);
});

ws.on("close", () => {
  console.warn("⚠️ WS closed");
});