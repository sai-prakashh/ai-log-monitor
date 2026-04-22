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

// ── CORS origin checker ─────────────────────────────────────────────────────
// Allows:
//   1. localhost (local dev)
//   2. Any *.onrender.com domain (all your Render services)
//   3. FRONTEND_URL env var if you want to lock it to one specific URL later
function isAllowedOrigin(origin) {
  if (!origin) return true;                          // curl, mobile, server-to-server
  if (origin === "http://localhost:3000") return true;
  if (origin === "http://localhost:5000") return true;
  if (origin.endsWith(".onrender.com"))  return true; // ← covers ALL your Render services
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  return false;
}

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Apply CORS to ALL routes including preflight OPTIONS requests
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for every route

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error("Socket CORS blocked: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST"]
  }
});

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

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date(), env: process.env.NODE_ENV });
});

// ── Socket ──────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));