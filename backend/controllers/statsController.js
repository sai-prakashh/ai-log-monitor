const Log   = require("../models/Log");
const Alert = require("../models/Alert");

// ── /api/stats  ──────────────────────────────────────────────────────────────
// System Health Dashboard: totals, error rate, alerts/min, active services
exports.getHealthStats = async (req, res) => {
  try {
    const now = Date.now();
    const oneMin  = new Date(now - 60_000);
    const fiveMin = new Date(now - 300_000);

    const [
      totalLogs,
      totalErrors,
      totalAlerts,
      criticalAlerts,
      alertsLastMin,
      recentLogs,
      activeServicesRaw
    ] = await Promise.all([
      Log.countDocuments(),
      Log.countDocuments({ level: "error" }),
      Alert.countDocuments(),
      Alert.countDocuments({ severity: "CRITICAL" }),
      Alert.countDocuments({ createdAt: { $gte: oneMin } }),
      Log.countDocuments({ timestamp: { $gte: fiveMin } }),
      Log.distinct("service", { timestamp: { $gte: fiveMin } })
    ]);

    const errorRate = totalLogs > 0
      ? ((totalErrors / totalLogs) * 100).toFixed(1)
      : "0.0";

    res.json({
      totalLogs,
      totalErrors,
      errorRate: parseFloat(errorRate),
      totalAlerts,
      criticalAlerts,
      alertsPerMin: alertsLastMin,
      recentLogs,           // logs in last 5 min (throughput)
      activeServices: activeServicesRaw.length,
      activeServiceNames: activeServicesRaw
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── /api/stats/services  ─────────────────────────────────────────────────────
// Per-service breakdown: total logs, error count, last seen
exports.getServiceStats = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$service",
          total:    { $sum: 1 },
          errors:   { $sum: { $cond: [{ $eq: ["$level", "error"] }, 1, 0] } },
          warnings: { $sum: { $cond: [{ $eq: ["$level", "warning"] }, 1, 0] } },
          lastSeen: { $max: "$timestamp" }
        }
      },
      { $sort: { errors: -1 } }
    ];

    const services = await Log.aggregate(pipeline);

    // attach alert count per service
    const alertCounts = await Alert.aggregate([
      { $group: { _id: "$service", alerts: { $sum: 1 } } }
    ]);
    const alertMap = Object.fromEntries(alertCounts.map(a => [a._id, a.alerts]));

    const result = services.map(s => ({
      service:  s._id,
      total:    s.total,
      errors:   s.errors,
      warnings: s.warnings,
      alerts:   alertMap[s._id] || 0,
      errorRate: s.total > 0 ? ((s.errors / s.total) * 100).toFixed(1) : "0.0",
      lastSeen: s.lastSeen
    }));

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── /api/stats/timeseries  ───────────────────────────────────────────────────
// Bucketed log counts for time-series chart
// ?window=1  → last 1 min,  buckets of 5s
// ?window=5  → last 5 min,  buckets of 30s
// ?window=60 → last 60 min, buckets of 5min  (default)
exports.getTimeSeries = async (req, res) => {
  try {
    const window  = parseInt(req.query.window) || 60; // minutes
    const now     = Date.now();
    const from    = new Date(now - window * 60_000);

    // bucket size in seconds
    let bucketSec;
    if (window <= 1)  bucketSec = 5;
    else if (window <= 5) bucketSec = 30;
    else bucketSec = 300;

    const bucketMs = bucketSec * 1000;

    const pipeline = [
      { $match: { timestamp: { $gte: from } } },
      {
        $group: {
          _id: {
            bucket: {
              $subtract: [
                { $toLong: "$timestamp" },
                { $mod: [{ $toLong: "$timestamp" }, bucketMs] }
              ]
            },
            level: "$level"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.bucket": 1 } }
    ];

    const raw = await Log.aggregate(pipeline);

    // build unified bucket map
    const bucketMap = {};
    for (const r of raw) {
      const key = r._id.bucket;
      if (!bucketMap[key]) bucketMap[key] = { time: key, info: 0, error: 0, warning: 0 };
      const lvl = (r._id.level || "info").toLowerCase();
      bucketMap[key][lvl] = (bucketMap[key][lvl] || 0) + r.count;
    }

    // also add alert buckets
    const alertPipeline = [
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            $subtract: [
              { $toLong: "$createdAt" },
              { $mod: [{ $toLong: "$createdAt" }, bucketMs] }
            ]
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];
    const alertRaw = await Alert.aggregate(alertPipeline);
    const alertMap = Object.fromEntries(alertRaw.map(a => [a._id, a.count]));

    const data = Object.values(bucketMap).map(b => ({
      ...b,
      alerts: alertMap[b.time] || 0,
      label:  new Date(b.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: bucketSec < 60 ? "2-digit" : undefined })
    }));

    res.json({ window, bucketSec, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};