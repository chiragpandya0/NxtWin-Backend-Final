const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");

const sign = (user) => jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: "7d" });

// Loads the user from the Bearer token. The user is never taken from the request body.
const requireAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authentication required" });
    let payload;
    try { payload = jwt.verify(token, env.jwtSecret); } catch { return res.status(401).json({ error: "Invalid or expired token" }); }
    const user = await User.findById(payload.sub);
    if (!user || user.suspended) return res.status(401).json({ error: "Account unavailable" });
    req.user = user;
    next();
  } catch (e) { next(e); }
};

// Role is read from the database, not the token, so demotions take effect immediately.
const requireAdmin = [requireAuth, (req, res, next) =>
  req.user.role === "admin" ? next() : res.status(403).json({ error: "Admin access required" })];

module.exports = { sign, requireAuth, requireAdmin };
