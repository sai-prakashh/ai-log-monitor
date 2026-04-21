const express = require("express");
const router  = express.Router();

const { createLog, getLogs } = require("../controllers/logController");
const { logLimiter }         = require("../middleware/rateLimiter");

// logLimiter: 60 logs/min per IP — prevents log spam
router.post("/logs", logLimiter, createLog);
router.get("/logs",  getLogs);

module.exports = router;