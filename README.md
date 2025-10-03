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




