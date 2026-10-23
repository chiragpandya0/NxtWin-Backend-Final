// Thin wrapper so services can emit without holding the io instance. No-op until init().
const jwt = require("jsonwebtoken");
const env = require("../config/env");

let io = null;

const init = (server) => { io = server; };

const attach = (server) => {
  init(server);
  server.on("connection", (socket) => {
    socket.on("joinMarket", (id) => socket.join(`market_${id}`));
    socket.on("leaveMarket", (id) => socket.leave(`market_${id}`));
    // Personal room requires a valid token; the userId comes from the token, not the client.
    socket.on("auth", (token) => {
      try {
        const { sub } = jwt.verify(token, env.jwtSecret);
        socket.join(`user_${sub}`);
      } catch (_) { /* ignore bad tokens */ }
    });
  });
};

const emitPrice = (marketId, pYes, extra = {}) =>
  io && io.to(`market_${marketId}`).emit("priceUpdate", { marketId: String(marketId), pYes, pNo: 1 - pYes, ...extra });
const emitBalance = (userId, balancePence) =>
  io && io.to(`user_${userId}`).emit("balanceUpdate", { balancePence });
const emitMarketStatus = (marketId, status, resolution = null) =>
  io && io.emit("marketStatus", { marketId: String(marketId), status, resolution });

module.exports = { init, attach, emitPrice, emitBalance, emitMarketStatus };
