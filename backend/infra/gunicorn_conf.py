# backend/infra/gunicorn_conf.py
import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = int(os.getenv("WEB_CONCURRENCY", str(multiprocessing.cpu_count() * 2 + 1)))
worker_class = "uvicorn.workers.UvicornWorker"

# reasonable server settings
keepalive = 15
timeout = 60
graceful_timeout = 30

# logging to stdout/err so "docker logs" works
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# ensure real client IPs when behind nginx (also passed in CMD as fallback)
forwarded_allow_ips = "*"
