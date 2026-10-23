const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async (uri = env.mongoUri) => {
  await mongoose.connect(uri);
  console.log("MongoDB connected");
};

// Run fn(session) in a transaction, retrying transient write conflicts.
const withTx = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.withTx = withTx;
