const express = require("express");
const fetch = require("node-fetch");
const env = require("../config/env");
const Weather = require("../models/WeatherSchema");
const { requireAdmin } = require("../middleware/auth");
const socket = require("../services/socket");

const router = express.Router();

router.get("/weather", async (req, res) => {
  const w = await Weather.findOne({ isActive: true }).sort({ fetchedAt: -1 }).lean();
  if (!w) return res.status(404).json({ error: "No weather data available" });
  res.json({ weather: w });
});

router.post("/admin/update-weather", requireAdmin, async (req, res) => {
  if (!env.weatherKey) return res.status(500).json({ error: "Weather API key not configured" });
  const r = await fetch(`http://api.weatherstack.com/current?access_key=${env.weatherKey}&query=London`);
  if (!r.ok) throw new Error(`WeatherStack API error: ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(data.error.info || "Weather API error");
  const w = await Weather.create({ location: data.location, current: data.current, fetchedAt: new Date(), isActive: true });
  res.json({ weather: w });
});

module.exports = router;
