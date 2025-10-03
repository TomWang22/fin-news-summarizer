# backend/Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential curl ca-certificates libpq5 \
  && rm -rf /var/lib/apt/lists/*

# Create a dedicated venv
RUN python -m venv /venv

WORKDIR /app

# Install deps *into the venv* explicitly
COPY backend/requirements.txt /app/requirements.txt
RUN /venv/bin/pip install --upgrade pip setuptools wheel \
 && /venv/bin/pip install --no-cache-dir -r /app/requirements.txt

# App code
COPY backend /app

# Non-root runtime user
RUN useradd -m -u 10001 appuser
USER appuser

EXPOSE 8000

# Run gunicorn from the venv (so workers use the venv interpreter)
CMD ["/venv/bin/gunicorn", "-c", "/app/infra/gunicorn_conf.py", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--forwarded-allow-ips", "*", \
     "app.main:app"]
