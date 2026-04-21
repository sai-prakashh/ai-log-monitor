require("dotenv").config();

const mongoose = require("mongoose");
const amqp = require("amqplib");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const Alert = require("./models/Alert");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker MongoDB Connected ✅"))
  .catch(err => console.log("Worker DB Error ❌:", err));

const RETRY_DELAY = 5000;
const MAX_RETRIES = 20;

async function connectWithRetry(attempt = 1) {
  try {
    // FIX: was "amqp://localhost" — wrong inside Docker
    const connection = await amqp.connect("amqp://rabbitmq");
    const channel = await connection.createChannel();

    // FIX: durable:true to match backend + ai-service
    await channel.assertQueue("logs", { durable: true });
    channel.prefetch(1);

    console.log("Worker started 🛠️ — waiting for messages");

    channel.consume("logs", async (msg) => {
      if (!msg) return;

      const log = JSON.parse(msg.content.toString());

      try {
        // FIX: was "http://localhost:5001" — wrong inside Docker
        const response = await fetch("http://ai:5001/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(log)
        });

        const result = await response.json();
        console.log("AI Result 🤖:", result);

        // FIX: was checking result.anomaly === "HIGH"
        // analyze.py returns result.alert (boolean) + result.severity (string)
        if (result.alert === true && result.severity === "CRITICAL") {
          console.log("🚨 ALERT detected!");

          await Alert.create({
            logId: log._id,
            service: log.service,
            message: result.reason,
            severity: result.severity
          });

          console.log("✅ Alert saved to DB");
        }

        channel.ack(msg);

      } catch (err) {
        console.error("Worker processing error ❌:", err.message);
        channel.nack(msg, false, false);
      }
    });

    connection.on("close", () => {
      console.error("RabbitMQ connection closed — restarting worker in 5s");
      setTimeout(() => connectWithRetry(), RETRY_DELAY);
    });

  } catch (err) {
    console.error(`Worker attempt ${attempt} failed:`, err.message);
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying in 5s... (${attempt}/${MAX_RETRIES})`);
      setTimeout(() => connectWithRetry(attempt + 1), RETRY_DELAY);
    } else {
      console.error("Max retries reached. Worker giving up ❌");
    }
  }
}

connectWithRetry();