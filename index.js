/************************************************
 * Lighter API Bot – STEP 1 (Base Version)
 * Platform: Railway
 * Purpose: Bot alive + API ready check
 ************************************************/

import axios from "axios";
import http from "http";

// ================= ENV VARIABLES =================
const API_KEY = process.env.LIGHTER_API_KEY;
const API_SECRET = process.env.LIGHTER_API_SECRET;

// ================= BASIC CHECK ===================
if (!API_KEY || !API_SECRET) {
  console.log("❌ ERROR: API KEY or API SECRET missing");
  process.exit(1);
}

console.log("✅ API keys loaded successfully");

// ================= BOT HEARTBEAT =================
// Ye sirf confirm karega ki bot 24×7 chal raha hai
setInterval(() => {
  console.log("🤖 Bot running | Time:", new Date().toLocaleTimeString());
}, 15000);

// ================= RAILWAY HTTP SERVER ============
// Railway free plan sleep avoid karne ke liye
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Lighter Bot is running");
}).listen(process.env.PORT || 3000);

console.log("🚀 Lighter API Bot Started Successfully");
