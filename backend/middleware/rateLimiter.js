/**
 * rateLimiter.js
 * ─────────────────────────────────────────────────────────────────
 * In-memory sliding-window rate limiter (no Redis needed).
 * Usage:
 *   const { apiLimiter, logLimiter } = require("./rateLimiter");
 *   router.post("/logs", logLimiter, createLog);
 *   app.use("/api", apiLimiter);
 * ─────────────────────────────────────────────────────────────────
 */

const store = new Map(); // ip → [timestamps]

function createLimiter({ windowMs = 60_000, max = 100, message = "Too many requests" } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now  = Date.now();
    const windowStart = now - windowMs;

    if (!store.has(key)) store.set(key, []);

    // prune old timestamps
    const timestamps = store.get(key).filter(t => t > windowStart);
    timestamps.push(now);
    store.set(key, timestamps);

    const remaining = Math.max(0, max - timestamps.length);

    res.setHeader("X-RateLimit-Limit",     max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset",     Math.ceil((windowStart + windowMs) / 1000));

    if (timestamps.length > max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        window: `${windowMs / 1000}s`
      });
    }

    next();
  };
}

// General API limiter: 200 req / min per IP
const apiLimiter = createLimiter({
  windowMs: 60_000,
  max: 200,
  message: "API rate limit exceeded — slow down"
});

// Log creation: 60 logs / min per IP (prevents spam)
const logLimiter = createLimiter({
  windowMs: 60_000,
  max: 60,
  message: "Log rate limit exceeded — max 60 logs/min per IP"
});

// Auth endpoints: 10 attempts / 15 min (brute-force protection)
const authLimiter = createLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  message: "Too many auth attempts — please wait 15 minutes"
});

// Clean up old entries every 5 min to avoid memory leak
setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [key, ts] of store.entries()) {
    const fresh = ts.filter(t => t > cutoff);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}, 5 * 60_000);

module.exports = { apiLimiter, logLimiter, authLimiter, createLimiter };