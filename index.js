import dotenv from "dotenv";
dotenv.config();

import {
  SignerClient,
  TransactionApi,
  OrderApi,
} from "zklighter-sdk";

/* ================= CONFIG ================= */

const BASE_URL = "https://mainnet.zklighter.elliot.ai";
const SYMBOL = "ETH-USDC";

const GRID_COUNT = 5;
const GRID_AMOUNT = 3;       // $3 per trade
const GRID_STEP = 0.02;      // 2%
const SELL_TARGET = 0.02;   // 2%

const MAX_ACTIVE_GRIDS = 2;
const TICK_INTERVAL = 7000; // 7 sec

/* ================= STATE ================= */

let basePrice = null;
let activeGrids = 0;
let grids = [];

/* ================= LOG ================= */

function log(msg) {
  console.log(new Date().toLocaleTimeString(), msg);
}

/* ================= SDK SETUP ================= */

const signer = new SignerClient({
  url: BASE_URL,
  apiPrivateKeys: {
    [process.env.LIGHTER_API_KEY]: process.env.LIGHTER_API_SECRET,
  },
  accountIndex: Number(process.env.LIGHTER_ACCOUNT_INDEX || 1),
});

const txApi = new TransactionApi({ basePath: BASE_URL });
const orderApi = new OrderApi({ basePath: BASE_URL });

/* ================= PRICE FETCH (SAFE) ================= */

async function getMarketPrice() {
  const book = await orderApi.orderBooks({ symbol: SYMBOL });

  if (!book) throw new Error("Orderbook missing");

  const bids =
    book.bids ||
    book.orderbook?.bids ||
    book.data?.bids;

  if (!bids || bids.length === 0) {
    throw new Error("No bids in orderbook");
  }

  const bestBid = bids[0];
  const price = Array.isArray(bestBid)
    ? Number(bestBid[0])
    : Number(bestBid.price);

  if (!price || isNaN(price)) {
    throw new Error("Invalid bid price");
  }

  return price;
}

/* ================= ORDER FUNCTIONS ================= */

async function placeBuy(price) {
  const nonce = await txApi.nextNonce({
    accountIndex: signer.accountIndex,
  });

  const signedTx = await signer.signOrder({
    symbol: SYMBOL,
    side: "BUY",
    price,
    quoteAmount: GRID_AMOUNT,
    nonce,
  });

  await txApi.sendTx({ tx: signedTx });
  log(`🟢 REAL BUY $${GRID_AMOUNT} @ ${price}`);
}

async function placeSell(price) {
  const nonce = await txApi.nextNonce({
    accountIndex: signer.accountIndex,
  });

  const signedTx = await signer.signOrder({
    symbol: SYMBOL,
    side: "SELL",
    price,
    quoteAmount: GRID_AMOUNT,
    nonce,
  });

  await txApi.sendTx({ tx: signedTx });
  log(`🔵 REAL SELL @ ${price}`);
}

/* ================= GRID SETUP ================= */

function setupGrids(base) {
  grids = [];
  for (let i = 1; i <= GRID_COUNT; i++) {
    grids.push({
      id: i,
      buy: +(base * (1 - GRID_STEP * i)).toFixed(2),
      sell: null,
      state: "WAIT",
    });
  }

  log(`📊 Grids created from base ${base}`);
}

/* ================= MAIN LOOP ================= */

async function tick() {
  try {
    if (process.env.BOT_ENABLED !== "true") return;

    const price = await getMarketPrice();
    log(`📈 Price: ${price}`);

    // Trailing base price (new high)
    if (!basePrice || price > basePrice * 1.01) {
      basePrice = price;
      setupGrids(basePrice);
      return;
    }

    for (const g of grids) {
      // BUY
      if (
        g.state === "WAIT" &&
        price <= g.buy &&
        activeGrids < MAX_ACTIVE_GRIDS
      ) {
        await placeBuy(g.buy);
        g.state = "HOLD";
        g.sell = +(g.buy * (1 + SELL_TARGET)).toFixed(2);
        activeGrids++;
      }

      // SELL
      if (g.state === "HOLD" && price >= g.sell) {
        await placeSell(g.sell);
        g.state = "WAIT";
        g.sell = null;
        activeGrids--;
      }
    }
  } catch (err) {
    log(`❌ Error in tick: ${err.message}`);
  }
}

/* ================= START ================= */

log("🚀 REAL MICRO LIVE BOT STARTED");
setInterval(tick, TICK_INTERVAL);
