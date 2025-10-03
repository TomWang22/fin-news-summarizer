import multiprocessing
import os

# Pick workers: env or (CPU*2)+1
workers = int(os.getenv("WEB_CONCURRENCY", (multiprocessing.cpu_count() * 2) + 1))
bind = "0.0.0.0:8000"
worker_class = "uvicorn.workers.UvicornWorker"
timeout = int(os.getenv("GUNICORN_TIMEOUT", "30"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))

# Logging
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"  # stdout
errorlog  = "-"  # stderr

# When behind reverse proxy/load balancer
# Uvicorn gets X-Forwarded-* via --forwarded-allow-ips "*"
