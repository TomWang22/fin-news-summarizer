<<<<<<< HEAD
# fin-news-summarizer
Financial news summarizer with a FastAPI backend and a Kafka event stream (Redpanda). Fetches headlines via RSS/NewsAPI, generates concise summaries and quick sentiment, and emits/consumes search events. Includes Redis, Postgres, Prometheus/Grafana metrics, Nginx TLS dev proxy, Docker Compose, and rate limiting!! Multi-worker recent-message buffer.

# Fin News Summarizer

Production-style demo that fetches financial news, summarizes, adds quick sentiment,
and emits search events to Kafka (Redpanda). Prometheus + Grafana for metrics,
Nginx for TLS local dev.

**Stack:** FastAPI · Gunicorn/Uvicorn · aiokafka · Redis · Postgres · Redpanda · Prometheus · Grafana · Nginx · Docker Compose

---

## Quickstart (dev)

```bash
# 1) Copy example envs and add your NEWSAPI_KEY
cp backend/.env.example backend/.env
cp infra/env.api.example infra/env.api
# edit both and set NEWSAPI_KEY=YOUR_KEY

# 2) Boot full stack
docker compose -f infra/docker-compose.yaml up -d --build
Open:

API via Nginx (TLS): https://localhost

Metrics: https://localhost/metrics

Prometheus: http://localhost:9090

Grafana: http://localhost:3000 (admin / admin)

Dev TLS uses self-signed/mkcert; your browser may warn.

Smoke test
bash
Copy code
# Search (RSS by default)
curl -sk "https://localhost/api/search?query=AAPL&limit=3" | jq .

# Emit a manual Kafka test message
curl -sk -X POST https://localhost/api/kafka/emit \
  -H 'content-type: application/json' \
  -d '{"data":"hello kafka"}'

# View recent Kafka events (Redis-backed ring buffer)
curl -sk "https://localhost/api/kafka/recent?limit=5" | jq .
Optional (inside Kafka container):

bash
Copy code
# Tail last 10 records
docker compose -f infra/docker-compose.yaml exec kafka \
  rpk topic consume searches --offset -10 -n 10 --format json --pretty-print=false \
  | jq -r '.value | fromjson? // .'
Endpoints
GET /api/health – health probe

GET /api/diag – env/feature flags (safe subset)

GET /api/search – query, limit, provider rss|newsapi, optional date_from|date_to|domains|sources

POST /api/kafka/emit – manual Kafka test payload

GET /api/kafka/recent?limit=N – recent Kafka events (Redis ring)

GET /metrics – Prometheus metrics

Environment
backend/.env (local dev, not in repo)

infra/env.api (compose env for API, not in repo)

Examples are committed as backend/.env.example and infra/env.api.example.

Runbook (dev)
bash
Copy code
# Boot
docker compose -f infra/docker-compose.yaml up -d --build

# Logs (API)
docker compose -f infra/docker-compose.yaml logs -f api | egrep 'kafka|Application startup|Started server process'

# Stop
docker compose -f infra/docker-compose.yaml down
Notes
This is a demo / portfolio project; not financial advice.

Do not commit real secrets. Rotate any keys before making the repo public.

Local Postgres is isolated within Docker unless you explicitly publish ports.

License
MIT

yaml
Copy code

---

That’s it. After you paste the README, run the git commands above and push. If you plan to show this publicly, make sure you **rotated** any keys you pasted earlier, then set the repo to **Public** so recruiters can see it.
::contentReference[oaicite:0]{index=0}




=======
Financial News Summarizer (FastAPI + React)

Fetch finance headlines (free RSS by default; optional NewsAPI), summarize them, tag sentiment, and serve a clean SPA. Batteries included: HTTPS (dev via mkcert), Nginx, Postgres, Redis cache, Prometheus metrics, Grafana dashboards, and optional Kafka.

Stack

Frontend: Vite + React (static build served by Nginx)

Backend: FastAPI + Gunicorn/Uvicorn

DB: Postgres

Cache/Rate limit backing: Redis

Edge: Nginx (HTTP→HTTPS, SPA, proxy /api, exposes /metrics)

Observability: Prometheus + Grafana, /metrics via prometheus-fastapi-instrumentator

(Optional) Kafka (Redpanda) for async pipelines

Prerequisites

Docker Desktop (or Docker Engine) + docker compose

macOS/Linux shell (commands below are POSIX)

For dev HTTPS: mkcert

# macOS
brew install mkcert
mkcert -install

One-time setup (dev HTTPS)
# from the repo root
mkdir -p certs
mkcert -cert-file certs/dev-cert.pem -key-file certs/dev-key.pem localhost 127.0.0.1 ::1


Compose mounts these into the Nginx container at /etc/nginx/certs/….

Configuration

Backend env lives in infra/env.api. Useful knobs:

ALLOWED_ORIGINS=http://localhost:5173
NEWSAPI_KEY=...                # optional; leave empty to use only RSS
DATABASE_URL=postgresql://finuser:finpass@db:5432/finnews

SECURITY_HEADERS=1
MAX_BODY_BYTES=1048576
RATE_LIMIT=60/minute

# Cache & async
REDIS_URL=redis://redis:6379/0
CACHE_TTL_SECONDS=60
ENABLE_CACHE=1

# Kafka (optional)
ENABLE_KAFKA=0
KAFKA_BOOTSTRAP=kafka:9092

Run (all services)
cd infra
docker compose up -d --build


Exposed ports:

App: https://localhost/
 (HTTP on 80 redirects to HTTPS)

API proxied at /api (e.g., https://localhost/api/search?...)

Prometheus: http://localhost:9090/

Grafana: http://localhost:3000/
 (user: admin, pass: admin default)

Redis (optional host debug): localhost:6379

Quick health checks
# Nginx → API
curl -sk https://localhost/api/health | jq

# Metrics via edge (proxied to API)
curl -sk https://localhost/metrics | head

# Redis diag (the API hits Redis from inside the network)
curl -sk https://localhost/api/diag/redis | jq

API Quick Start

Search (RSS default):

curl -sk 'https://localhost/api/search?query=AAPL&limit=5' | jq


Search via NewsAPI (requires NEWSAPI_KEY):

curl -sk 'https://localhost/api/search?query=NVDA&provider=newsapi&limit=3' | jq


Diagnostics:

curl -sk https://localhost/api/diag | jq
curl -sk https://localhost/api/diag/db | jq
curl -sk https://localhost/api/whoami | jq          # IP as seen by the app
curl -sk https://localhost/api/diag/addr | jq       # XFF/X-Real-IP/limiter key

Observability

/metrics: exported by the API, proxied by Nginx (location = /metrics).

Prometheus scrapes the API (config in infra/observability/prometheus.yml).

Grafana can be pointed at Prometheus (add data source http://prometheus:9090
).

Create a dashboard and graph counters like http_request_duration_seconds_count, etc.

Redis cache & rate limits

Redis is available at the Compose DNS name redis inside the network.

The app uses Redis for caching (when ENABLE_CACHE=1) and can back rate limits.

Handy container-side checks (use the app’s venv Python):

docker compose exec api sh -lc '/venv/bin/python - <<PY
import redis
r = redis.Redis(host="redis", port=6379, decode_responses=True)
r.set("hello","world")
print("hello->", r.get("hello"))
PY'


Note: We deliberately run the app with a venv inside the image. When you exec, prefer /venv/bin/python to ensure imports match the running app.

Local HTTPS (mkcert) details

Nginx server block (443) uses the mounted certs:

ssl_certificate     /etc/nginx/certs/dev-cert.pem;
ssl_certificate_key /etc/nginx/certs/dev-key.pem;


HTTP (80) redirects to HTTPS.

If you change Nginx confs:

docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload

Scaling & load-balancing (dev)

You can run multiple API containers:

docker compose up -d --scale api=2


For simple Compose, Docker’s internal DNS may round-robin the service name, but Nginx resolves DNS only on start. For serious LB and service discovery, consider Swarm/Kubernetes or list static upstreams. Dev setup is fine for 1–2 replicas while experimenting.

Development tips

When you change Python deps (backend/requirements.txt):

cd infra
docker compose build --no-cache api && docker compose up -d api


When you exec into the API and import stuff, use the venv:

docker compose exec api sh -lc '/venv/bin/python -c "import redis; print(redis.__version__)"'


Frontend changes
Rebuild your static assets into frontend/dist (the Nginx image copy step expects that directory). If you’re developing the frontend separately with Vite dev server, point CORS via ALLOWED_ORIGINS.

Endpoints (current)

GET /api/health

GET /api/search

Query params: query, limit, provider (rss|newsapi), summarize_sentences, date_from/date_to (newsapi), domains, sources

GET /api/diag

GET /api/diag/db

GET /api/whoami

GET /api/diag/addr

GET /metrics (Prometheus, proxied by Nginx)

Project layout (abridged)
backend/
  app/
    main.py
    models.py
    providers/
      rss.py
      newsapi.py
    services/
      summarizer.py
      sentiment.py
    routers/
      saved_searches.py   # conditionally mounted if DB accessible
  requirements.txt
frontend/
  dist/                   # built SPA that Nginx serves
infra/
  docker-compose.yaml
  nginx.Dockerfile
  nginx/
    default.conf          # HTTPS, SPA, /api proxy, /metrics proxy
  observability/
    prometheus.yml
certs/
  dev-cert.pem
  dev-key.pem

Production notes (TLS with Let’s Encrypt)

Point a real DNS record to your server (A/AAAA).

Use a plain‐HTTP Nginx server block to serve /.well-known/acme-challenge/ from a shared volume, run certbot certonly --webroot, then switch the Nginx 443 server block to use the issued cert. Automate renewal with a lightweight certbot container (as a sidecar) and reload Nginx on success.

Alternatively, terminate TLS at a cloud LB/ingress and keep Nginx internal.

Optional: Kafka (Redpanda)

We ship a dev-friendly Kafka compatible broker:

# produce/consume from inside the network (e.g., aiokafka in the app)
KAFKA_BOOTSTRAP=kafka:9092
ENABLE_KAFKA=1


(You’ll need to wire actual producers/consumers in the code to use it.)

Troubleshooting

import redis fails during docker exec
You likely used the system Python. Use /venv/bin/python …. The app itself runs in that venv (Gunicorn CMD points to /venv/bin/gunicorn).

Changed dependencies aren’t picked up
Rebuild the API with --no-cache after editing backend/requirements.txt.

Nginx warns: listen ... http2 is deprecated
Use:

listen 443 ssl;
http2 on;


Nginx restarting in a loop
Run docker compose logs nginx and nginx -t. Common culprits: duplicated directives, invalid cert paths, or syntax errors.

HTTP 301 to HTTPS surprises cURL
curl -i http://localhost/ will show Location: https://localhost/. Use -L or hit HTTPS directly: curl -sk https://localhost/….

License

MIT (or your choice). Contributions welcome!
>>>>>>> aed69db (feat: initial commit — Financial News Summarizer (FastAPI + Kafka + Redis + Postgres + Prom/Grafana + Nginx))
