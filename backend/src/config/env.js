const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  port: process.env.PORT || 5500,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((s) => s.trim()),
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  sportmonksToken: process.env.SPORTMONKS_API_TOKEN,
  oddsApiKey: process.env.ODDS_API_KEY,
  weatherKey: process.env.WEATHERSTACK_API_KEY,
  isTest: process.env.NODE_ENV === "test",
};

if (!env.isTest && !env.jwtSecret) {
  console.error("JWT_SECRET is required");
  process.exit(1);
}
if (env.isTest && !env.jwtSecret) env.jwtSecret = "test-secret";

module.exports = env;
