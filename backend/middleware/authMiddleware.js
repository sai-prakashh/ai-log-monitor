const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Access denied — no token" });
    }

    // FIX: handles both "Bearer eyJ..." and raw "eyJ..." formats
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();

  } catch (err) {
    console.error("Auth Error ❌:", err.message);
    res.status(400).json({ error: "Invalid or expired token" });
  }
};