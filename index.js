const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");
const env = require("./src/config/env");
const connectDB = require("./src/config/db");
const socket = require("./src/services/socket");
const { errorHandler } = require("./src/middleware/errors");
const cron = require("./src/jobs/cron");

const createApp = () => {
  const app = express();
  app.set("trust proxy", 1); // behind nginx
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => res.json({ ok: true }));
  app.use("/api/auth", require("./src/routes/auth"));
  app.use("/api", require("./src/routes/markets"));
  app.use("/api", require("./src/routes/weather"));
  app.use("/api/admin", require("./src/routes/admin"));
  app.use("/api", require("./src/routes/trade")); // last: applies requireAuth to everything it handles
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);
  return app;
};

const main = async () => {
  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  socket.attach(new Server(server, { cors: { origin: env.corsOrigin, methods: ["GET", "POST"] } }));
  cron.start();
  server.listen(env.port, () => console.log(`Server is running on port ${env.port}`));
};

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { createApp };
