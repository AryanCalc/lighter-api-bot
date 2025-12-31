import dotenv from "dotenv";
dotenv.config();

import {
  SignerClient,
  TransactionApi,
  OrderApi,
} from "zklighter-sdk";

// ================= CONFIG =================
const GRID_COUNT = 5;
const GRID_AMOUNT = 3;      // $3
const GRID_STEP = 0.02;     // 2%
const SELL_TARGET = 0.02;

const MAX_ACTIVE_GRIDS = 2;
const BASE_URL = "https://mainnet.zklighter.elliot.ai";
const SYMBOL = "ETH-USDC";

// ================= STATE =================
let basePrice = null;
let activeGrids = 0;
let grids = [];

// ================= LOG =================
function log(msg) {
  console.log(new Date().toLocaleTimeString(), msg);
}

// ================= SDK SETUP =================
const signer = new SignerClient({
  url: BASE_URL,
  apiPrivateKeys: {
    [process.env.LIGHTER_API_KEY]: process.env.LIGHTER_API_SECRET,
  },
  accountIndex: Number(process.env.LIGHTER_ACCOUNT_INDEX || 0),
});

const txApi = new TransactionApi({ basePath: BASE_URL });
const orderApi = new OrderApi({ basePath: BASE_URL });

// ================= HELPERS =================
async function getMarketPrice() {
  const book = await orderApi.orderBooks({ symbol: SYMBOL });
  return Number(book.bids[0][0]); // best bid
}

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

// ================= GRID =================
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
  log("📊 Grids created from base " + base);
}

// ================= MAIN LOOP =================
async function tick() {
  if (process.env.BOT_ENABLED !== "true") return;

  const price = await getMarketPrice();
  log(`📈 Price: ${price}`);

  if (!basePrice || price > basePrice * 1.01) {
    basePrice = price;
    setupGrids(basePrice);
    return;
  }

  for (const g of grids) {
    if (g.state === "WAIT" && price <= g.buy && activeGrids < MAX_ACTIVE_GRIDS) {
      await placeBuy(g.buy);
      g.state = "HOLD";
      g.sell = +(g.buy * (1 + SELL_TARGET)).toFixed(2);
      activeGrids++;
    }

    if (g.state === "HOLD" && price >= g.sell) {
      await placeSell(g.sell);
      g.state = "WAIT";
      g.sell = null;
      activeGrids--;
    }
  }
}

// ================= START =================
log("🚀 REAL MICRO LIVE BOT STARTED");
setInterval(tick, 7000);
