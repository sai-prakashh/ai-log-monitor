import os
import requests
from flask import Flask, request, jsonify
import pika
import json
import time
import threading
import logging
import sys
from collections import deque

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ai-service] %(levelname)s %(message)s",
    stream=sys.stdout
)
log = logging.getLogger(__name__)

app = Flask(__name__)

_history_lock = threading.Lock()
log_history   = deque(maxlen=50)

DLQ_NAME   = "logs.dlq"
MAIN_QUEUE = "logs"

# ── Read from environment (Render env vars) ──────────────────────────────────
# Locally: RABBITMQ_URL defaults to Docker service name
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
BACKEND_URL  = os.environ.get("BACKEND_URL",  "http://backend:5000")

log.info("BACKEND_URL = %s", BACKEND_URL)


# ── AI LOG ANALYSIS ──────────────────────────────────────────────────────────
def analyze_log(log_data):
    message   = log_data.get("message", "").lower()
    timestamp = time.time()

    with _history_lock:
        log_history.append((message, timestamp))
        history_snapshot = list(log_history)

    severity = "INFO"
    alert    = False
    reason   = "Normal log"

    if "critical" in message:
        severity = "CRITICAL"
        alert    = True
        reason   = "Critical issue detected"

    elif "error" in message or "failed" in message:
        severity = "ERROR"
        alert    = True
        reason   = "Error detected"

    elif "warning" in message:
        severity = "WARNING"
        reason   = "Warning detected"

    same_logs = [m for m, t in history_snapshot if m == message]
    if len(same_logs) >= 3:
        alert    = True
        severity = "CRITICAL"
        reason   = "Repeated same log detected"

    recent_errors = [
        m for m, t in history_snapshot
        if ("error" in m or "failed" in m) and (timestamp - t < 10)
    ]
    if len(recent_errors) >= 3:
        alert    = True
        severity = "CRITICAL"
        reason   = "Multiple errors detected in short time"

    return {
        "alert":    alert,
        "severity": severity,
        "reason":   reason,
        "message":  message
    }


# ── DLQ PUBLISHER ─────────────────────────────────────────────────────────────
def publish_to_dlq(channel, body, error_reason):
    try:
        channel.queue_declare(queue=DLQ_NAME, durable=True)
        dlq_payload = {
            "original_body": body.decode("utf-8", errors="replace"),
            "error_reason":  str(error_reason),
            "failed_at":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source_queue":  MAIN_QUEUE
        }
        channel.basic_publish(
            exchange="",
            routing_key=DLQ_NAME,
            body=json.dumps(dlq_payload),
            properties=pika.BasicProperties(delivery_mode=2, content_type="application/json")
        )
        log.warning("💀 Message sent to DLQ: %s", error_reason)
    except Exception as e:
        log.error("❌ Failed to publish to DLQ: %s", str(e))


# ── RABBITMQ CONSUMER ─────────────────────────────────────────────────────────
def consume_logs():
    log.info("🚀 Consumer thread started")

    while True:
        try:
            log.info("🔄 Connecting to RabbitMQ: %s", RABBITMQ_URL.replace(RABBITMQ_URL.split("@")[0], "amqp://*****") if "@" in RABBITMQ_URL else RABBITMQ_URL)

            params = pika.URLParameters(RABBITMQ_URL)
            params.heartbeat = 600
            params.blocked_connection_timeout = 300

            connection = pika.BlockingConnection(params)
            channel    = connection.channel()

            channel.queue_declare(queue=MAIN_QUEUE, durable=True)
            channel.queue_declare(queue=DLQ_NAME,   durable=True)
            channel.basic_qos(prefetch_count=1)

            log.info("✅ Connected to RabbitMQ — waiting for logs")

            def callback(ch, method, properties, body):
                try:
                    log_data = json.loads(body)
                    log.info("📥 Received log: %s", log_data)

                    result = analyze_log(log_data)
                    log.info("🤖 Result: %s", result)

                    if result["alert"]:
                        log.warning("🚨 ALERT: severity=%s reason=%s",
                                    result["severity"], result["reason"])
                        try:
                            response = requests.post(
                                f"{BACKEND_URL}/api/alerts/internal",
                                json={
                                    "service":  log_data.get("service"),
                                    "message":  result["message"],
                                    "severity": result["severity"],
                                    "reason":   result["reason"]
                                },
                                timeout=5
                            )
                            log.info("📡 Alert sent | status=%s", response.status_code)

                            if response.status_code >= 500:
                                raise ValueError(f"Backend returned {response.status_code}")

                        except Exception as e:
                            log.error("❌ Alert send failed: %s — routing to DLQ", str(e))
                            publish_to_dlq(ch, body, f"Alert delivery failed: {e}")
                            ch.basic_ack(delivery_tag=method.delivery_tag)
                            return

                    ch.basic_ack(delivery_tag=method.delivery_tag)

                except json.JSONDecodeError as exc:
                    log.error("❌ Invalid JSON — routing to DLQ: %s", exc)
                    publish_to_dlq(ch, body, f"JSON parse error: {exc}")
                    ch.basic_ack(delivery_tag=method.delivery_tag)

                except Exception as exc:
                    log.exception("❌ Processing failed — routing to DLQ: %s", exc)
                    publish_to_dlq(ch, body, str(exc))
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=MAIN_QUEUE, on_message_callback=callback, auto_ack=False)
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as exc:
            log.warning("⏳ RabbitMQ not ready: %s — retrying in 5s", exc)
            time.sleep(5)

        except Exception as exc:
            log.exception("💥 Consumer crashed: %s — reconnecting in 5s", exc)
            time.sleep(5)


# ── HTTP API ──────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return "AI Service Running 🤖"

@app.route("/health")
def health():
    return jsonify({"status": "ok", "time": time.time()})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON body"}), 400
    return jsonify(analyze_log(data))


# ── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log.info("🔥 Starting AI Service...")
    threading.Thread(target=consume_logs, daemon=True).start()
    app.run(host="0.0.0.0", port=5001, use_reloader=False)