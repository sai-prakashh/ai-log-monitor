const express = require("express");
const router  = express.Router();

const { getAlerts, createAlert } = require("../controllers/alertController");

router.get("/alerts", getAlerts);

// 🔥 Internal endpoint: AI service → backend → DB + socket broadcast
router.post("/alerts/internal", async (req, res) => {
  const io = req.app.get("io");   // grab socket.io instance
  await createAlert(req.body, io);
  res.json({ ok: true });
});

module.exports = router;