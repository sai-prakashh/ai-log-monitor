const amqp = require("amqplib");

let channel     = null;
let isConnecting = false;

// ── Reads from env: RABBITMQ_URL (CloudAMQP on Render) ──────────────────────
// Locally: falls back to amqp://rabbitmq (Docker container name)
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";

async function connectQueue(retries = 10) {
  if (isConnecting) return;
  isConnecting = true;

  try {
    console.log("🐰 Connecting to RabbitMQ:", RABBITMQ_URL.replace(/:\/\/.*@/, "://*****@")); // hide credentials in logs
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue("logs", { durable: true });

    console.log("RabbitMQ connected ✅");

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
      channel = null;
      isConnecting = false;
      setTimeout(() => connectQueue(), 5000);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ disconnected — reconnecting...");
      channel = null;
      isConnecting = false;
      setTimeout(() => connectQueue(), 5000);
    });

    isConnecting = false;

  } catch (err) {
    console.error("RabbitMQ not ready... retrying ⏳", err.message);
    channel = null;
    isConnecting = false;

    if (retries > 0) {
      setTimeout(() => connectQueue(retries - 1), 5000);
    } else {
      console.error("RabbitMQ connection failed after all retries ❌");
    }
  }
}

function sendToQueue(data) {
  if (!channel) {
    console.warn("⚠️ RabbitMQ channel not ready — message not queued");
    return false;
  }

  try {
    channel.sendToQueue(
      "logs",
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    return true;
  } catch (err) {
    console.error("sendToQueue error:", err.message);
    channel = null;
    setTimeout(() => connectQueue(), 1000);
    return false;
  }
}

module.exports = { connectQueue, sendToQueue };