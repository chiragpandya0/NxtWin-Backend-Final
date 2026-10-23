const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const { withTx } = require("../config/db");
const env = require("../config/env");
const User = require("../models/User");
const { sign, requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/errors");
const wallet = require("../services/wallet");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.isTest ? 1000 : 30, standardHeaders: true, legacyHeaders: false });

const publicUser = (u) => ({ id: u._id, email: u.email, name: u.name, role: u.role, balancePence: u.balancePence });

const ageOn = (dob, now = new Date()) => {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
};

const signup = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  name: z.string().trim().min(1).max(60),
  dob: z.coerce.date(),
});

router.post("/signup", limiter, validate(signup), async (req, res) => {
  const { email, password, name, dob } = req.body;
  if (ageOn(dob) < 18) return res.status(403).json({ error: "You must be 18 or over to sign up", code: "UNDERAGE" });
  const passwordHash = await bcrypt.hash(password, 10);
  const role = env.adminEmail && email.toLowerCase() === env.adminEmail ? "admin" : "user";
  const user = await withTx(async (session) => {
    const [u] = await User.create([{ email, passwordHash, name, dob, role }], { session });
    await wallet.signupGrant(session, u);
    return User.findById(u._id).session(session);
  });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

const login = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post("/login", limiter, validate(login), async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!ok || user.suspended) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
module.exports.ageOn = ageOn;
