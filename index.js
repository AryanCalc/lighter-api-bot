// ===============================
// Lighter Grid Bot – FINAL VERSION
// HTTP Ticker Based (NO WebSocket)
// ===============================

import express from "express";
import dotenv from "dotenv";
import { OrderApi, SignerClient } from "zklighter-sdk";

dotenv.config();

// ---------------- CONFIG ----------------
const SYMBOL = "ETH-USDC";
const GRID_COUNT = 5;
const GRID_AMOUNT = 3;        // $3 per grid
const MARGIN = 2;             // 2x
const GRID_GAP_PERCENT = 2;   // 2% gap
const SELL_PROFIT_PERCENT = 2; // 2% target
const TICK_INTERVAL = 15000;  // 15 sec
// ----------------------------------------

if (!process.env.LIGHTER_API_KEY || !process.env.LIGHTER_API_SECRET) {
  console.error("❌ Missing API keys");
  process.exit(1);
}

// ---------- SDK SETUP ----------
const signer = new SignerClient({
  apiKey: process.env.LIGHTER_API_KEY,
  apiSecret: process.env.LIGHTER_API_SECRET,
  accountIndex: 1,
});

const orderApi = new OrderApi(signer);

// ---------- EXPRESS (Replit alive) ----------
const app = express();
app.get("/", (_, res) => res.send("Lighter Bot Running"));
app.listen(5000, () =>
  console.log("🚀 HTTP Server running on port 5000")
);

// ---------- STATE ----------
let basePrice = null;
let grids = [];
let activeBuys = new Set();

// ---------- PRICE FETCH (SAFE) ----------
async function getMarketPrice() {
  const ticker = await orderApi.ticker({ symbol: SYMBOL });
  if (!ticker || !ticker.lastPrice) return null;

  const price = Number(ticker.lastPrice);
  return isNaN(price) ? null : price;
}

// ---------- GRID CREATION ----------
function createGrids(price) {
  grids = [];
  for (let i = 1; i <= GRID_COUNT; i++) {
    const buyPrice = price * (1 - (GRID_GAP_PERCENT / 100) * i);
    const sellPrice = buyPrice * (1 + SELL_PROFIT_PERCENT / 100);

    grids.push({
      level: i,
      buyPrice,
      sellPrice,
      filled: false,
    });
  }

  console.log(`📊 ${GRID_COUNT} grids created from base ${price.toFixed(2)}`);
}

// ---------- GRID LOGIC ----------
function handleGridLogic(price) {
  if (!basePrice) {
    basePrice = price;
    createGrids(price);
    return;
  }

  for (const grid of grids) {
    if (!grid.filled && price <= grid.buyPrice) {
      console.log(
        `🟢 BUY SIGNAL | Grid ${grid.level} | Price: ${price.toFixed(2)}`
      );
      console.log(
        `💰 Amount: $${GRID_AMOUNT} | Margin: ${MARGIN}x`
      );
      console.log(
        `🎯 Target Sell: ${grid.sellPrice.toFixed(2)}`
      );

      grid.filled = true;
      activeBuys.add(grid.level);
    }

    if (grid.filled && price >= grid.sellPrice) {
      console.log(
        `🔴 SELL SIGNAL | Grid ${grid.level} | Price: ${price.toFixed(2)}`
      );

      grid.filled = false;
      activeBuys.delete(grid.level);
    }
  }
}

// ---------- MAIN LOOP ----------
console.log("🚀 REAL MICRO LIVE BOT STARTED");

setInterval(async () => {
  try {
    if (process.env.BOT_ENABLED !== "true") {
      console.log("⏸ BOT DISABLED");
      return;
    }

    const price = await getMarketPrice();

    if (!price) {
      console.log("⏳ Waiting for price...");
      return;
    }

    console.log(`📈 Price: ${price.toFixed(2)}`);
    handleGridLogic(price);

  } catch (err) {
    console.log("❌ Tick error:", err.message);
  }
}, TICK_INTERVAL);
