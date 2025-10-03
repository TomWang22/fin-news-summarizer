# fin-news-summarizer
Financial news summarizer with a FastAPI backend and a Kafka event stream (Redpanda). Fetches headlines via RSS/NewsAPI, generates concise summaries and quick sentiment, and emits/consumes search events. Includes Redis, Postgres, Prometheus/Grafana metrics, Nginx TLS dev proxy, Docker Compose, and rate limiting!! Multi-worker recent-message buffer.
