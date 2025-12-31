import axios from "axios";

const SYMBOL = "ETH-USDC";   // example
const GRID_COUNT = 6;
const GRID_STEP = 0.02;     // 2%
const GRID_AMOUNT = 15;     // $15
const MARGIN = 2;           // 2x

let lastPrice = 1000;       // dummy base price
let grids = [];

console.log("🧪 DRY RUN MODE STARTED");

// create grid prices
function setupGrids(basePrice) {
  grids = [];
  for (let i = 1; i <= GRID_COUNT; i++) {
    grids.push({
      buyPrice: basePrice * (1 - GRID_STEP * i),
      sold: false
    });
  }
  console.log("📊 Grids created:", grids);
}

// fake price generator (testing)
function getFakePrice() {
  const change = (Math.random() - 0.5) * 30;
  lastPrice += change;
  return Number(lastPrice.toFixed(2));
}

setupGrids(lastPrice);

setInterval(() => {
  const price = getFakePrice();
  console.log("📈 Current Price:", price);

  grids.forEach(grid => {
    if (!grid.sold && price <= grid.buyPrice) {
      console.log(
        `🟢 BUY SIGNAL @ ${grid.buyPrice} | Amount: $${GRID_AMOUNT} | Margin: ${MARGIN}x`
      );

      const sellPrice = grid.buyPrice * (1 + GRID_STEP);
      console.log(`🔵 TARGET SELL @ ${sellPrice.toFixed(2)}`);

      grid.sold = true;
    }
  });
}, 5000);
