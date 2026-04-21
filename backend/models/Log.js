const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  service: String,
  level: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Log", logSchema);