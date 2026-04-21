const Alert = require("../models/Alert");

const SEVERITY_RANK = { CRITICAL: 3, ERROR: 2, WARNING: 1, INFO: 0 };

// ── Internal: called by AI service via POST /api/alerts/internal ────────────
exports.createAlert = async (data, io) => {
  try {
    const alert = new Alert({
      service:  data.service,
      message:  data.message,
      severity: data.severity,
      reason:   data.reason
    });

    await alert.save();
    console.log("🚨 Alert saved to DB:", alert.severity, alert.service);

    // 🔥 Real-time push to all connected frontends
    if (io) {
      io.emit("new-alert", alert);
    }
  } catch (err) {
    console.error("❌ Alert save failed:", err.message);
  }
};

// ── GET /api/alerts  ─────────────────────────────────────────────────────────
// Supports ?severity=CRITICAL&page=1&limit=50
exports.getAlerts = async (req, res) => {
  try {
    const page     = parseInt(req.query.page)  || 1;
    const limit    = parseInt(req.query.limit) || 50;
    const severity = req.query.severity || null;

    const query = {};
    if (severity) query.severity = severity;

    const total  = await Alert.countDocuments(query);
    const pages  = Math.ceil(total / limit);

    // Sorted: CRITICAL first, then by createdAt desc
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Client-side severity sort on this page
    alerts.sort((a, b) =>
      (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0)
    );

    res.json({ count: total, page, pages, data: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};