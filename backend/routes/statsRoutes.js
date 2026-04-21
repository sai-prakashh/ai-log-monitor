const express = require("express");
const router  = express.Router();
const { getHealthStats, getServiceStats, getTimeSeries } = require("../controllers/statsController");

// no auth required so frontend can poll freely — add auth middleware if needed
router.get("/stats",            getHealthStats);
router.get("/stats/services",   getServiceStats);
router.get("/stats/timeseries", getTimeSeries);

module.exports = router;