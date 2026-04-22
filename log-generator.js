const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// 🔐 ✅ NEW TOKEN (UPDATED)
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZGNlYmFjY2U4NjU4M2M4MTQwYWI4ZSIsImlhdCI6MTc3NjM1NTIwNCwiZXhwIjoxNzc2NDQxNjA0fQ.MtezRg0OonEX_x_f4BX9VXMIrtJu_RupBFMeUlUyC04";

const SERVICES = [
  "auth-service",
  "payment-service",
  "user-service",
  "order-service"
];

const messages = {
  "auth-service": [
    { level: "info", msg: "login success" },
    { level: "error", msg: "invalid password" },
    { level: "info", msg: "token generated" }
  ],
  "payment-service": [
    { level: "info", msg: "payment processed" },
    { level: "error", msg: "payment failed" },
    { level: "error", msg: "gateway timeout" }
  ],
  "user-service": [
    { level: "info", msg: "user created" },
    { level: "info", msg: "profile updated" },
    { level: "error", msg: "user not found" }
  ],
  "order-service": [
    { level: "info", msg: "order placed" },
    { level: "info", msg: "order shipped" },
    { level: "error", msg: "order failed" }
  ]
};

let spikeMode = false;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 🚀 Send log
async function sendLog() {
  const service = getRandom(SERVICES);
  let log;

  if (spikeMode && Math.random() < 0.7) {
    log = { level: "error", msg: "critical failure" };
  } else {
    log = getRandom(messages[service]);
  }

  const body = {
    service,
    level: log.level,
    message: log.msg
  };

  try {
    const res = await fetch("https://ai-log-monitor-backend.onrender.com/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: TOKEN
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    // 🔥 Show response clearly
    if (res.ok) {
      console.log("✅ Log sent:", body);
    } else {
      console.log("❌ API Error:", data);
    }

  } catch (err) {
    console.error("❌ Network Error:", err.message);
  }
}

// 🔁 Continuous logs every 3 sec
setInterval(sendLog, 3000);

// 🔥 Error spike simulation
setInterval(() => {
  spikeMode = true;
  console.log("🔥 ERROR SPIKE STARTED");

  setTimeout(() => {
    spikeMode = false;
    console.log("✅ Spike ended");
  }, 10000);

}, 30000);