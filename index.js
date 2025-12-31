/***********************
 * DRY RUN GRID BOT
 * NO REAL TRADES
 ***********************/

const GRID_COUNT = 6;
const GRID_STEP = 0.02;        // 2%
const GRID_AMOUNT = 15;       // $15
const MARGIN = 2;             // 2x (logic only)

let basePrice = 1000;
let lastPrice = basePrice;

let grids = [];

console.log("🧪 DRY RUN STRATEGY BOT STARTED");

// -------- GRID SETUP ----------
function setupGrids(price) {
  grids = [];
  for (let i = 1; i <= GRID_COUNT; i++) {
    grids.push({
      level: i,
      buyPrice: +(price * (1 - GRID_STEP * i)).toFixed(2),
      sellPrice: null,
      state: "WAIT_BUY" // WAIT_BUY | HOLD
    });
  }

  console.log("📊 New Grids Created from Base:", price);
  console.table(grids.map(g => ({
    Grid: g.level,
    Buy: g.buyPrice,
    State: g.state
  })));
}

// -------- FAKE PRICE FEED ----------
function getFakePrice() {
  const move = (Math.random() - 0.5) * 25; // volatility
  lastPrice = +(lastPrice + move).toFixed(2);
  return lastPrice;
}

// -------- INITIAL SETUP ----------
setupGrids(basePrice);

// -------- MAIN LOOP ----------
setInterval(() => {
  const price = getFakePrice();
  console.log("\n📈 Current Price:", price);

  // 🔼 Trailing base (bull move)
  if (price > basePrice * 1.01) {
    basePrice = price;
    console.log("🚀 New High → Updating Base Price:", basePrice);
    setupGrids(basePrice);
    return;
  }

  // 🔽 Grid logic
  grids.forEach(grid => {
    // BUY CONDITION
    if (grid.state === "WAIT_BUY" && price <= grid.buyPrice) {
      grid.state = "HOLD";
      grid.sellPrice = +(grid.buyPrice * (1 + GRID_STEP)).toFixed(2);

      console.log(
        `🟢 BUY SIGNAL | Grid ${grid.level}
         Price: ${grid.buyPrice}
         Amount: $${GRID_AMOUNT} | Margin: ${MARGIN}x
         🎯 Target Sell: ${grid.sellPrice}`
      );
    }

    // SELL CONDITION
    if (grid.state === "HOLD" && price >= grid.sellPrice) {
      console.log(
        `🔵 SELL SIGNAL | Grid ${grid.level}
         Sell Price: ${grid.sellPrice}
         Profit: 2%`
      );

      // reset grid
      grid.state = "WAIT_BUY";
      grid.sellPrice = null;
    }
  });
}, 5000);
