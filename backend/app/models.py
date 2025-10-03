from __future__ import annotations

import datetime as dt
from typing import Optional, Literal, List
from pydantic import BaseModel, HttpUrl

class Article(BaseModel):
    """Single normalized news article."""
    title: str
    url: HttpUrl
    source: str
    published_at: Optional[dt.datetime] = None
    summary: str = ""
    sentiment: Optional[float] = None  # range [-1, 1]
    image_url: Optional[HttpUrl] = None

class SearchResponse(BaseModel):
    """Response envelope for /api/search."""
    query: str
    provider: Literal["rss", "newsapi"]
    count: int
    articles: List[Article]