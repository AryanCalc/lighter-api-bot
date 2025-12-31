import dotenv from "dotenv";
dotenv.config();

const GRID_COUNT = 7;
const GRID_STEP = 0.02;
const GRID_AMOUNT = 2;
const SELL_TARGET = 0.02;

const MAX_DAILY_LOSS = 3;
const MAX_ACTIVE_GRIDS = 2;

let dailyLoss = 0;
let activeGrids = 0;
let basePrice = null;

let grids = [];

function log(msg) {
  console.log(new Date().toLocaleTimeString(), msg);
}

// ---- MOCK PLACEHOLDERS (replace with Lighter SDK calls) ----
async function getPrice() {
  // 👉 yahan Lighter OrderApi / WS price aayega
  return basePrice
    ? basePrice * (1 + (Math.random() - 0.5) * 0.02)
    : 1000;
}

async function placeBuy(price) {
  log(`🟢 REAL BUY $${GRID_AMOUNT} @ ${price.toFixed(2)}`);
  return true; // assume filled
}

async function placeSell(price) {
  log(`🔵 REAL SELL @ ${price.toFixed(2)}`);
  return true; // assume filled
}
// ------------------------------------------------------------

function setupGrids(base) {
  grids = [];
  for (let i = 1; i <= GRID_COUNT; i++) {
    grids.push({
      level: i,
      buy: +(base * (1 - GRID_STEP * i)).toFixed(2),
      sell: null,
      state: "WAIT"
    });
  }
  log("📊 Grids created from base " + base.toFixed(2));
}

async function tick() {
  if (process.env.BOT_ENABLED !== "true") return;

  if (dailyLoss >= MAX_DAILY_LOSS) {
    log("🛑 Daily loss limit hit. Bot stopped.");
    process.exit(0);
  }

  const price = await getPrice();
  log(`📈 Price: ${price.toFixed(2)}`);

  if (!basePrice || price > basePrice * 1.01) {
    basePrice = price;
    setupGrids(basePrice);
    return;
  }

  for (const g of grids) {
    if (g.state === "WAIT" && price <= g.buy && activeGrids < MAX_ACTIVE_GRIDS) {
      const ok = await placeBuy(g.buy);
      if (ok) {
        g.state = "HOLD";
        g.sell = +(g.buy * (1 + SELL_TARGET)).toFixed(2);
        activeGrids++;
      }
    }

    if (g.state === "HOLD" && price >= g.sell) {
      const ok = await placeSell(g.sell);
      if (ok) {
        g.state = "WAIT";
        g.sell = null;
        activeGrids--;
      }
    }
  }
}

// ---- START LOOP ----
log("🚀 MICRO LIVE BOT STARTED");
setInterval(tick, 6000);
