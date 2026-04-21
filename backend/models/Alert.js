const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  logId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Log"
  },
  service: String,
  message: String,
  severity: String,
  reason: String, // 🔥 ADD THIS
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Alert", alertSchema);