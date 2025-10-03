# backend/app/services/normalize.py
from __future__ import annotations
import re
import html
import datetime as dt
from typing import Optional

WHITESPACE_RE = re.compile(r"\s+")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z']+")

def strip_html(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", text)  # why: drop scripts/styles
    text = re.sub(r"(?is)<.*?>", " ", text)
    return WHITESPACE_RE.sub(" ", text).strip()

def sent_tokenize(text: str) -> list[str]:
    text = WHITESPACE_RE.sub(" ", text or "").strip()
    if not text:
        return []
    parts = SENTENCE_SPLIT_RE.split(text)
    if len(parts) <= 1 and len(text) > 180:  # why: fallback when punctuation is missing
        chunk = 160
        return [text[i:i + chunk] for i in range(0, len(text), chunk)]
    return parts

def word_freq(text: str) -> dict[str, int]:
    freq: dict[str, int] = {}
    for w in WORD_RE.findall(text.lower()):
        if len(w) <= 2:
            continue
        freq[w] = freq.get(w, 0) + 1
    return freq

def parse_rfc822_date(s: str | None) -> Optional[dt.datetime]:
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        d = parsedate_to_datetime(s)
        return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
    except Exception:
        return None
