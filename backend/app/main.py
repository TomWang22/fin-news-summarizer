# backend/app/main.py
from __future__ import annotations
import os, re, datetime as dt
from pathlib import Path
from typing import Literal, Optional, Tuple

import httpx
import asyncio, json
from textwrap import shorten
from collections import deque
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter
import redis.asyncio as aioredis
from fastapi import FastAPI, Query, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.models import SearchResponse, Article
from app.services.summarizer import summarize
from app.services.sentiment import quick_sentiment
from app.providers.rss import RSSProvider
from app.providers.newsapi import NewsAPIProvider
from app.db import can_connect, get_db_info

# ---------- Env ----------
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "").strip()

# Hardening knobs
RATE_LIMIT = os.getenv("RATE_LIMIT", "60/minute").strip()
SECURITY_HEADERS_ENABLED = os.getenv("SECURITY_HEADERS", "0") == "1"
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", "0") or 0)

ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "0") == "1"
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "searches")

# ---------- Helpers ----------
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
IP_RE = re.compile(r"\s*([^,\s]+)\s*")

def _clean_date(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    s = s.strip()
    return s if DATE_RE.match(s) else None

def _pick_client_ip(request: Request) -> Tuple[str, dict]:
    headers = {k.lower(): v for k, v in request.headers.items()}

    cf_ip = headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip(), {"source": "cf-connecting-ip", "xff": headers.get("x-forwarded-for"), "xreal": headers.get("x-real-ip")}

    xff = headers.get("x-forwarded-for")
    if xff:
        m = IP_RE.match(xff)  # left-most entry
        if m:
            ip = m.group(1)
            return ip, {"source": "x-forwarded-for", "xff": xff, "xreal": headers.get("x-real-ip")}

    xreal = headers.get("x-real-ip")
    if xreal:
        return xreal.strip(), {"source": "x-real-ip", "xff": headers.get("x-forwarded-for"), "xreal": xreal}

    peer = get_remote_address(request)
    return peer or "0.0.0.0", {"source": "peer", "xff": headers.get("x-forwarded-for"), "xreal": headers.get("x-real-ip")}

def key_by_api_key_or_ip(request: Request) -> str:
    api_key = request.headers.get("x-api-key")
    if api_key:
        return api_key.strip()
    ip, _ctx = _pick_client_ip(request)
    return ip

# SlowAPI limiter
limiter = Limiter(key_func=key_by_api_key_or_ip, default_limits=[RATE_LIMIT])

# ---------- App ----------
app = FastAPI(title="Financial News Summarizer", version="0.6.1")

# Prometheus
Instrumentator().instrument(app).expose(
    app,
    endpoint="/metrics",
    include_in_schema=False,
    should_gzip=True,
)

# Custom Kafka counters
KAFKA_PRODUCED = Counter("kafka_messages_produced_total", "Kafka messages produced", ["topic"])
KAFKA_CONSUMED = Counter("kafka_messages_consumed_total", "Kafka messages consumed", ["topic"])

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# ---------- Redis (diag + shared ring) ----------
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
KAFKA_RING_KEY = os.getenv("KAFKA_RING_KEY", "kafka_recent")
KAFKA_RING_MAX = int(os.getenv("KAFKA_MEMORY_LOG", "200"))  # also used for Redis ring length

# ---------- Kafka (optional) ----------
if ENABLE_KAFKA:
    try:
        from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
    except Exception:
        AIOKafkaProducer = AIOKafkaConsumer = None

    @app.on_event("startup")
    async def _kafka_start():
        if not AIOKafkaProducer:
            print("[kafka] aiokafka not importable; skipping")
            return

        loop = asyncio.get_event_loop()

        # per-worker in-memory ring (debug)
        app.state.kafka_last = deque(maxlen=KAFKA_RING_MAX)
        app.state.kafka_topic = KAFKA_TOPIC

        async def _start_producer_forever():
            while True:
                try:
                    app.state.kafka_producer = AIOKafkaProducer(
                        loop=loop,
                        bootstrap_servers=KAFKA_BOOTSTRAP,
                        client_id=f"finnews-api-{os.getpid()}",
                    )
                    await app.state.kafka_producer.start()
                    print("[kafka] producer started")
                    # Wait forever; cancelled on shutdown
                    await asyncio.Event().wait()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    print(f"[kafka] producer error: {e}; retrying in 2s")
                    await asyncio.sleep(2)
                finally:
                    try:
                        prod = getattr(app.state, "kafka_producer", None)
                        if prod:
                            await prod.stop()
                    except Exception:
                        pass

        async def _consume_forever():
            while True:
                consumer = AIOKafkaConsumer(
                    app.state.kafka_topic,
                    loop=loop,
                    bootstrap_servers=KAFKA_BOOTSTRAP,
                    group_id="finnews-consumers",
                    enable_auto_commit=True,
                    auto_offset_reset="latest",
                )
                try:
                    await consumer.start()
                    print("[kafka] consumer started")
                    async for msg in consumer:
                        KAFKA_CONSUMED.labels(msg.topic).inc()

                        raw = msg.value or b""
                        decoded = raw.decode("utf-8", errors="ignore")
                        try:
                            parsed = json.loads(decoded)
                        except Exception:
                            parsed = decoded

                        ts_iso = dt.datetime.fromtimestamp(msg.timestamp / 1000.0, tz=dt.timezone.utc).isoformat()

                        details = ""
                        if isinstance(parsed, dict):
                            if "query" in parsed and "count" in parsed:
                                details = f" query={parsed.get('query')} count={parsed.get('count')}"
                            elif "data" in parsed:
                                details = f" data={shorten(str(parsed.get('data')), width=80, placeholder='…')}"

                        print(
                            f"[kafka] consume topic={msg.topic} off={msg.offset} at={ts_iso}"
                            f"{details} :: {shorten(str(parsed), width=120, placeholder='…')}"
                        )

                        event = {
                            "topic": msg.topic,
                            "offset": msg.offset,
                            "timestamp": msg.timestamp,  # ms since epoch
                            "ts_iso": ts_iso,
                            "key": (msg.key.decode("utf-8", "replace") if msg.key else None),
                            "value": parsed,
                        }

                        # In-memory per-worker ring
                        app.state.kafka_last.append(event)

                        # Mirror to Redis (shared across workers)
                        try:
                            await redis_client.lpush(KAFKA_RING_KEY, json.dumps(event))
                            await redis_client.ltrim(KAFKA_RING_KEY, 0, KAFKA_RING_MAX - 1)
                        except Exception as e:
                            print(f"[kafka] redis ring push failed: {e}")

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    print(f"[kafka] consumer error: {e}; retrying in 2s")
                    await asyncio.sleep(2)
                finally:
                    try:
                        await consumer.stop()
                        print("[kafka] consumer stopped")
                    except Exception:
                        pass

        app.state.kafka_prod_task = asyncio.create_task(_start_producer_forever())
        app.state.kafka_cons_task = asyncio.create_task(_consume_forever())

    @app.on_event("shutdown")
    async def _kafka_stop():
        for attr in ("kafka_cons_task", "kafka_prod_task"):
            task = getattr(app.state, attr, None)
            if task:
                task.cancel()
        prod = getattr(app.state, "kafka_producer", None)
        if prod:
            try:
                await prod.stop()
            except Exception:
                pass
        print("[kafka] shutdown complete")

# ---------- 429 handler ----------
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    retry_after = getattr(exc, "retry_after", None)
    if retry_after is None:
        reset_in = getattr(exc, "reset_in", None)
        try:
            retry_after = int(reset_in) if reset_in is not None else 60
        except Exception:
            retry_after = 60
    return JSONResponse(
        status_code=429,
        content={"detail": "Too Many Requests"},
        headers={"Retry-After": str(retry_after), "X-RateLimit-Remaining": "0"},
    )

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Security headers ----------
if SECURITY_HEADERS_ENABLED:
    @app.middleware("http")
    async def security_headers_mw(request: Request, call_next):
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        resp.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self' http://localhost:5173 data: blob:; "
            "img-src * data: blob:; connect-src *; "
            "style-src 'self' 'unsafe-inline' http://localhost:5173; "
            "script-src 'self' 'unsafe-inline'"
        )
        return resp

# ---------- Max body size ----------
if MAX_BODY_BYTES > 0:
    @app.middleware("http")
    async def body_size_limit_mw(request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
            return Response(status_code=413, content="Payload Too Large")
        return await call_next(request)

# ---------- Routers (optional DB) ----------
DB_OK = can_connect()
if DB_OK:
    from app.routers.saved_searches import router as saved_router
    app.include_router(saved_router)

# ---------- Debug ----------
@app.get("/api/whoami")
@limiter.limit("2/second")
async def whoami(request: Request):
    chosen_ip, ctx = _pick_client_ip(request)
    return {
        "chosen_ip": chosen_ip,
        "source": ctx.get("source"),
        "headers_seen": {
            "x-forwarded-for": ctx.get("xff"),
            "x-real-ip": ctx.get("xreal"),
        },
        "peer": get_remote_address(request),
    }

@app.get("/api/diag/addr")
@limiter.limit("2/second")
async def diag_addr(request: Request):
    chosen_ip, ctx = _pick_client_ip(request)
    return {
        "client": getattr(request.client, "host", None),
        "x_forwarded_for": request.headers.get("x-forwarded-for"),
        "x_real_ip": request.headers.get("x-real-ip"),
        "forwarded": request.headers.get("forwarded"),
        "cf_connecting_ip": request.headers.get("cf-connecting-ip"),
        "chosen_ip": chosen_ip,
        "source": ctx.get("source"),
        "limiter_key": key_by_api_key_or_ip(request),
    }

# ---------- Redis diag ----------
@app.get("/api/diag/redis")
async def diag_redis():
    try:
        pong = await redis_client.ping()
        await redis_client.set("hello", "world", ex=60)
        val = await redis_client.get("hello")
        return {"ping": pong, "get": val}
    except Exception as e:
        raise HTTPException(500, f"redis error: {e}")

# ---------- Kafka recent (uses Redis ring first) ----------
@app.get("/api/kafka/recent")
async def kafka_recent(limit: int = Query(20, ge=1, le=200)):
    # Try shared Redis ring (works across workers)
    try:
        vals = await redis_client.lrange(KAFKA_RING_KEY, 0, limit - 1)
        items = []
        for v in vals:
            try:
                items.append(json.loads(v))
            except Exception:
                items.append({"value": v})
        if items:
            return {"count": len(items), "items": items, "source": "redis"}
    except Exception:
        pass  # fall back to per-worker memory

    # Fallback: per-worker in-memory deque (dev convenience)
    buf = getattr(app.state, "kafka_last", None)
    if buf is None:
        return {"enabled": False, "items": []}
    items = list(buf)[-limit:]
    return {"count": len(items), "items": items, "source": "memory"}

# ---------- Kafka emit test ----------
@app.post("/api/kafka/emit")
async def kafka_emit(payload: dict, request: Request):
    if not ENABLE_KAFKA or not getattr(app.state, "kafka_producer", None):
        return {"enabled": False}
    data = (payload or {}).get("data", "")
    if not isinstance(data, str):
        data = json.dumps(data)
    await app.state.kafka_producer.send_and_wait(
        app.state.kafka_topic,
        data.encode("utf-8"),
        key=b"manual",
    )
    KAFKA_PRODUCED.labels(app.state.kafka_topic).inc()
    return {"ok": True, "bytes": len(data)}

# ---------- Core endpoints ----------
@app.get("/api/health")
@limiter.limit("1/second")
async def health(request: Request):
    return {"status": "ok", "time": dt.datetime.now(dt.timezone.utc).isoformat()}

@app.get("/api/diag")
async def diag():
    return {
        "newsapi_key_set": bool(NEWSAPI_KEY),
        "allowed_origins": ALLOWED_ORIGINS,
        "providers": ["rss", "newsapi"],
        "db_enabled": bool(DB_OK),
        "version": "0.6.1",
    }

@app.get("/api/diag/sources")
async def diag_sources(
    items: str = Query(..., description="Comma-separated NewsAPI source IDs or domains"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(1, ge=1, le=3),
):
    if not NEWSAPI_KEY:
        raise HTTPException(400, "NEWSAPI_KEY not set.")
    df = _clean_date(date_from)
    dt_ = _clean_date(date_to)
    if (date_from and not df) or (date_to and not dt_):
        raise HTTPException(400, "Dates must be YYYY-MM-DD")

    provider = NewsAPIProvider(NEWSAPI_KEY)
    tested = [s.strip() for s in items.split(",") if s.strip()]
    results: dict[str, int] = {}

    async with httpx.AsyncClient(follow_redirects=True, headers={"User-Agent": "FinNewsSummarizer/1.0"}) as client:
        for it in tested:
            ok = False
            try:
                got = await provider.fetch("stocks OR earnings", limit, client, date_from=df, date_to=dt_, sources=it)
                results[it] = len(got)
                ok = True
            except Exception:
                pass
            if ok:
                continue
            try:
                got = await provider.fetch("stocks OR earnings", limit, client, date_from=df, date_to=dt_, domains=it)
                results[it] = len(got)
            except Exception:
                results[it] = 0
    return {"tested": tested, "results": results}

@app.get("/api/search", response_model=SearchResponse)
@limiter.limit("5/second")
async def search(
    request: Request,
    query: str = Query(min_length=1),
    limit: int = Query(10, ge=1, le=50),
    provider: Literal["rss", "newsapi"] = Query("rss"),
    summarize_sentences: int = Query(3, ge=1, le=6),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD (newsapi only)"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD (newsapi only)"),
    domains: Optional[str] = Query(None, description="Comma-separated domains, e.g. reuters.com,bloomberg.com (newsapi only)"),
    sources: Optional[str] = Query(None, description="Comma-separated NewsAPI source IDs, e.g. reuters,bloomberg (newsapi only)"),
):
    effective_query = query
    df = _clean_date(date_from)
    dt_ = _clean_date(date_to)
    if (date_from and not df) or (date_to and not dt_):
        raise HTTPException(400, "Dates must be YYYY-MM-DD")

    if provider == "rss":
        impl = RSSProvider()
        opts: dict = {}
    else:
        if not NEWSAPI_KEY:
            raise HTTPException(400, "NEWSAPI_KEY not set; add it to backend/.env and restart.")
        impl = NewsAPIProvider(NEWSAPI_KEY)
        opts = {
            "date_from": df,
            "date_to": dt_,
            "domains": (domains or "").strip() or None,
            "sources": (sources or "").strip() or None,
        }

    async with httpx.AsyncClient(follow_redirects=True, headers={"User-Agent": "FinNewsSummarizer/1.0"}) as client:
        raw = await impl.fetch(effective_query, limit, client, **opts)  # type: ignore[attr-defined]

    articles: list[Article] = []
    for it in raw:
        base_text = it.get("description") or ""
        summ = summarize(base_text, max_sentences=summarize_sentences) if base_text else ""
        sent = quick_sentiment(f"{it.get('title','')} {summ}")
        articles.append(Article(
            title=it.get("title", "").strip(),
            url=it.get("url", "https://example.com"),
            source=it.get("source", "Unknown"),
            published_at=it.get("published_at"),
            summary=summ,
            sentiment=sent,
            image_url=it.get("image_url"),
        ))

    # Fire-and-forget Kafka event
    if ENABLE_KAFKA and getattr(app.state, "kafka_producer", None):
        evt = {
            "ts": dt.datetime.now(dt.timezone.utc).isoformat(),
            "query": query,
            "limit": limit,
            "provider": provider,
            "count": len(articles),
            "ip": _pick_client_ip(request)[0],
        }
        payload = json.dumps(evt).encode("utf-8")
        asyncio.create_task(
            app.state.kafka_producer.send_and_wait(
                app.state.kafka_topic,
                payload,
                key=query.encode("utf-8"),
            )
        )
        KAFKA_PRODUCED.labels(app.state.kafka_topic).inc()

    return SearchResponse(query=query, provider=provider, count=len(articles), articles=articles)
