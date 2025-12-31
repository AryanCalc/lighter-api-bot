// ================== BASIC SETUP ==================
import express from "express";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const SYMBOL = "ETH-USDC";

// ================== BOT CONFIG ==================
const GRID_COUNT = 5;
const AMOUNT_PER_GRID = 3; // $3 per grid
const BOT_ENABLED = process.env.BOT_ENABLED === "true";

// ================== STATE ==================
let latestPrice = null;
let grids = [];
let gridsInitialized = false;

// ================== LOGGER ==================
function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${msg}`);
}

// ================== HTTP SERVER ==================
app.get("/", (req, res) => {
  res.send("Lighter Bot is running");
});

app.listen(PORT, () => {
  log("🚀 HTTP Server running on port " + PORT);
});

// ================== WEBSOCKET PRICE FEED ==================
const WS_URL = "wss://mainnet.zklighter.elliot.ai/ws";
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  log("📡 WebSocket connected");

  ws.send(
    JSON.stringify({
      type: "subscribe",
      channel: "ticker",
      symbol: SYMBOL,
    })
  );
});

ws.on("message", (msg) => {
  try {
    const data = JSON.parse(msg.toString());

    if (data?.price) {
      latestPrice = Number(data.price);
      log(`📈 Price: ${latestPrice.toFixed(2)}`);
    }
  } catch (e) {
    // ignore junk
  }
});

ws.on("error", (err) => {
  log("❌ WebSocket error: " + err.message);
});

// ================== GRID CREATION ==================
function createGrids(basePrice) {
  grids = [];
  const gap = basePrice * 0.003; // 0.3% gap

  for (let i = 1; i <= GRID_COUNT; i++) {
    grids.push({
      buyPrice: basePrice - gap * i,
      sellPrice: basePrice + gap * i,
      active: true,
    });
  }

  gridsInitialized = true;
  log(`📊 ${GRID_COUNT} Grids created from base ${basePrice.toFixed(2)}`);
}

// ================== MAIN BOT LOOP ==================
setInterval(async () => {
  try {
    if (!latestPrice) {
      log("⏳ Waiting for price...");
      return;
    }

    if (!gridsInitialized) {
      createGrids(latestPrice);
      return;
    }

    if (!BOT_ENABLED) {
      log("🟡 BOT_ENABLED=false | Price monitoring only");
      return;
    }

    for (const grid of grids) {
      if (!grid.active) continue;

      if (latestPrice <= grid.buyPrice) {
        log(
          `🟢 BUY SIGNAL | Price: ${grid.buyPrice.toFixed(
            2
          )} | Amount: $${AMOUNT_PER_GRID}`
        );
        grid.active = false;
      }
    }
  } catch (err) {
    log("❌ Error in tick: " + err.message);
  }
}, 15000);

// ================== START LOG ==================
log("🚀 REAL MICRO LIVE BOT STARTED");
