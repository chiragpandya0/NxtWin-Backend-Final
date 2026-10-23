// Create or update the admin account without seeding anything else.
// Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='...' node scripts/create-admin.js
require("../src/config/env");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDB, withTx } = require("../src/config/db");
const User = require("../src/models/User");
const wallet = require("../src/services/wallet");

(async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email) throw new Error("ADMIN_EMAIL is required");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  await connectDB();
  const passwordHash = await bcrypt.hash(password, 10);
  if (await User.exists({ email })) {
    await User.updateOne({ email }, { passwordHash, role: "admin", suspended: false });
    console.log(`Updated ${email}: password reset, role admin`);
  } else {
    await withTx(async (session) => {
      const [u] = await User.create([{ email, passwordHash, name: "Admin", dob: new Date("1990-01-01"), role: "admin" }], { session });
      await wallet.signupGrant(session, u);
    });
    console.log(`Created admin ${email}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
