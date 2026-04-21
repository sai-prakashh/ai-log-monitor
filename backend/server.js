require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { connectQueue } = require("./utils/rabbitmq");
const { apiLimiter }   = require("./middleware/rateLimiter");

const app    = express();
const server = http.createServer(app);

// ── CORS: allow your Render frontend URL + localhost for dev ────────────────
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL    // set this in Render env vars
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      // In development, allow all
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  }
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json());
app.set("io", io);

// ── Global rate limiter ─────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ── DB + RabbitMQ ───────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");
    connectQueue();
  })
  .catch(err => console.log("MongoDB Error ❌:", err));

// ── Routes ──────────────────────────────────────────────────────────────────
const logRoutes   = require("./routes/logRoutes");
const authRoutes  = require("./routes/authRoutes");
const alertRoutes = require("./routes/alertRoutes");
const statsRoutes = require("./routes/statsRoutes");

app.use("/api",      logRoutes);
app.use("/api/auth", authRoutes);
app.use("/api",      alertRoutes);
app.use("/api",      statsRoutes);

// ── Health check (Render pings this to keep service alive) ──────────────────
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// ── Socket ──────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));