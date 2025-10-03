# Accept **kwargs for compatibility; ignore extras.
from __future__ import annotations

import re
import datetime as dt
from typing import Any

import httpx
import feedparser

from app.services.normalize import strip_html, parse_rfc822_date

class RSSProvider:
    name = "rss"

    async def fetch(self, query: str, limit: int, client: httpx.AsyncClient, **kwargs) -> list[dict[str, Any]]:
        q = re.sub(r"\s+", "+", query.strip())
        feeds = [
            f"https://news.google.com/rss/search?q={q}+when:7d+finance&hl=en-US&gl=US&ceid=US:en",
            f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={q}&region=US&lang=en-US",
        ]

        items: list[dict[str, Any]] = []
        for url in feeds:
            try:
                r = await client.get(url, timeout=10)
                r.raise_for_status()
            except Exception:
                continue

            parsed = feedparser.parse(r.text)
            for e in parsed.entries[:limit]:
                title = strip_html(getattr(e, "title", "") or "")
                link = getattr(e, "link", "") or ""
                desc = strip_html(getattr(e, "summary", "") or getattr(e, "description", "") or "")
                published = parse_rfc822_date(getattr(e, "published", None))
                source = getattr(getattr(e, "source", {}), "title", "") or getattr(parsed.feed, "title", "RSS")
                items.append({
                    "title": title,
                    "url": link,
                    "description": desc,
                    "published_at": published,
                    "source": source,
                    "image_url": None,
                })

        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for it in items:
            key = it["url"] or it["title"]
            if key in seen:
                continue
            seen.add(key)
            deduped.append(it)

        deduped.sort(
            key=lambda x: x["published_at"] or dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc),
            reverse=True,
        )
        return deduped[:limit]