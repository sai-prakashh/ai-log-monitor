const Log = require("../models/Log");
const { sendToQueue } = require("../utils/rabbitmq");

// CREATE LOG
const createLog = async (req, res) => {
  try {
    const { service, level, message } = req.body;

    if (!service || !level || !message) {
      return res.status(400).json({
        error: "All fields (service, level, message) are required"
      });
    }

    const newLog = await Log.create({ service, level, message });

    const queued = sendToQueue(newLog);
    if (!queued) {
      console.warn("⚠️ Log saved to DB but NOT queued (RabbitMQ not ready)");
    } else {
      console.log("📤 Sent log to RabbitMQ");
    }

    res.json({ message: "Log saved ✅", data: newLog });

  } catch (error) {
    console.error("Create Log Error ❌:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

// GET LOGS — FIX: now supports ?page=N&level=X&search=Y (App.js sends these)
const getLogs = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const level  = req.query.level  || null;
    const search = req.query.search || null;

    const query = {};
    if (level)  query.level   = level;
    if (search) query.message = { $regex: search, $options: "i" };

    const total = await Log.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ data: logs, page, pages, total });

  } catch (error) {
    console.error("Get Logs Error ❌:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createLog, getLogs };