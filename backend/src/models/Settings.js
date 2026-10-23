const mongoose = require("mongoose");
const S = new mongoose.Schema({ key: { type: String, unique: true }, values: {} }, { timestamps: true });
module.exports = mongoose.models.Settings || mongoose.model("Settings", S);
