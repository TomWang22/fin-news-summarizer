# backend/app/providers/newsapi.py
from __future__ import annotations
import datetime as dt
from typing import Any
import re

import httpx
from fastapi import HTTPException

AGGREGATOR_BLOCKLIST = {"biztoc.com"}

TICKER_MAP = {
    "AAPL": "Apple", "MSFT": "Microsoft", "GOOGL": "Google", "GOOG": "Google",
    "AMZN": "Amazon", "NVDA": "Nvidia", "META": "Meta", "TSLA": "Tesla",
    "ORCL": "Oracle", "IBM": "IBM", "NFLX": "Netflix",
}

def _expand_query(q: str) -> str:
    parts = re.split(r"\s+OR\s+|,", q, flags=re.IGNORECASE)
    terms: list[str] = []
    seen: set[str] = set()
    for raw in parts:
        term = raw.strip()
        if not term:
            continue
        up = re.sub(r"[^A-Z]", "", term.upper())
        expanded = f"({up} OR {TICKER_MAP[up]})" if up in TICKER_MAP else term
        key = expanded.lower()
        if key not in seen:
            seen.add(key)
            terms.append(expanded)
    return " OR ".join(terms) if terms else q

class NewsAPIProvider:
    name = "newsapi"

    def __init__(self, api_key: str | None):
        self.api_key = (api_key or "").strip()

    async def _call(self, client: httpx.AsyncClient, params: dict) -> dict:
        r = await client.get("https://newsapi.org/v2/everything", params=params, timeout=12)
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "ok":
            # bubble up helpful message (rate limits, invalid params, etc.)
            raise HTTPException(502, f"NewsAPI: {data.get('message') or 'error'}")
        return data

    def _project(self, data: dict) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_titles: set[str] = set()
        for a in data.get("articles", []):
            src = (a.get("source") or {}).get("name", "") or "NewsAPI"
            if src.strip().lower() in AGGREGATOR_BLOCKLIST:
                continue
            title = (a.get("title") or "").strip()
            if not title or title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())
            desc = a.get("description") or a.get("content") or ""
            published = a.get("publishedAt")
            dt_parsed = None
            if published:
                try:
                    dt_parsed = dt.datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    dt_parsed = None
            items.append({
                "title": title,
                "url": a.get("url") or "",
                "description": desc,
                "published_at": dt_parsed,
                "source": src,
                "image_url": a.get("urlToImage"),
            })
        return items

    async def fetch(
        self,
        query: str,
        limit: int,
        client: httpx.AsyncClient,
        *,
        date_from: str | None = None,
        date_to: str | None = None,
        domains: str | None = None,
        sources: str | None = None,  # NEW
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            raise HTTPException(400, "NEWSAPI_KEY not set; use provider=rss or set the key.")

        expanded = _expand_query(query)
        base = {
            "pageSize": min(limit, 50),
            "language": "en",
            "sortBy": "publishedAt",
            "apiKey": self.api_key,
        }
        if date_from: base["from"] = date_from
        if date_to:   base["to"]   = date_to
        if domains:   base["domains"] = domains
        if sources:   base["sources"] = sources  # NEW

        # Pass 1: broad search in text fields
        params1 = dict(q=expanded, searchIn="title,description,content", **base)
        data1 = await self._call(client, params1)
        items1 = self._project(data1)
        if items1:
            return items1[:limit]

        # Pass 2: title-focused (strip parens so names match better)
        names_only = re.sub(r"[()]", "", expanded)
        params2 = dict(qInTitle=names_only, **base)
        data2 = await self._call(client, params2)
        items2 = self._project(data2)
        if items2:
            return items2[:limit]

        # Pass 3: broaden finance terms (still respects date/domains/sources)
        broader = f"{names_only} OR (earnings OR guidance OR upgrade OR downgrade OR outlook)"
        params3 = dict(q=broader, **base)
        data3 = await self._call(client, params3)
        items3 = self._project(data3)
        return items3[:limit]