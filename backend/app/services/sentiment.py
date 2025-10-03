# backend/app/services/sentiment.py
from __future__ import annotations
import re
from typing import Iterable

WORD_RE = re.compile(r"[A-Za-z][A-Za-z']+")

# Why: broader finance lexicon; keep it small + readable
POS_RAW: set[str] = {
    "beat","beats","beating",
    "gain","gains","gained","gaining",
    "surge","surges","surged","soar","soars","soared","jump","jumps","jumped","rally","rallies","rallied",
    "record","outperform","outperforms","outperformed","upgrade","upgrades","upgraded",
    "strong","strength","growth","expand","expands","expanded","improve","improves","improved",
    "profit","profits","profitable","margin","margins","guidance-raise","raise","raises","raised",
    "bullish","buy","overweight","positive","optimistic"
}
NEG_RAW: set[str] = {
    "miss","misses","missed","misses-estimates",
    "fall","falls","fell","plunge","plunges","plunged","drop","drops","dropped","slump","slumps","slumped",
    "loss","losses","loss-making","profit-warning",
    "downgrade","downgrades","downgraded","underperform","underperforms","underperformed",
    "weak","weakness","slow","slows","slowed","slowdown","decline","declines","declined",
    "lawsuit","probe","investigation","fine","fines","penalty","penalties","fraud","recall","layoff","layoffs",
    "bearish","sell","underweight","negative","pessimistic","struggle","struggles","struggled","headwind","headwinds","cut","cuts","cutting"
}

NEGATIONS = {"not", "no", "never", "without", "hardly", "barely", "seldom"}

def _normalize_tokens(text: str) -> list[str]:
    # lowercase → crude stemming (strip common suffixes)
    toks = [w.lower() for w in WORD_RE.findall(text or "")]
    norm: list[str] = []
    for t in toks:
        for suf in ("ies","ing","ed","es","s"):  # simple suffix-stripping; keeps base signal
            if len(t) > 4 and t.endswith(suf):
                t = t[: -len(suf)]
                break
        norm.append(t)
    return norm

def _make_stem_set(words: Iterable[str]) -> set[str]:
    stems = set()
    for w in words:
        x = w.lower()
        for suf in ("ies","ing","ed","es","s"):
            if len(x) > 4 and x.endswith(suf):
                x = x[: -len(suf)]
                break
        stems.add(x)
    return stems

POS = _make_stem_set(POS_RAW)
NEG = _make_stem_set(NEG_RAW)

def quick_sentiment(text: str) -> float:
    """
    Returns a sentiment score in [-1, 1].
    Heuristic: count positive/negative stem matches with simple negation flip.
    """
    toks = _normalize_tokens(text)
    if not toks:
        return 0.0

    score = 0
    negate = False
    for t in toks:
        if t in NEGATIONS:
            negate = True
            continue

        val = 0
        if t in POS:
            val = 1
        elif t in NEG:
            val = -1

        if val != 0:
            score += -val if negate else val
            negate = False  # only flips the immediately-following sentiment word

    # normalize by rough length cap to keep within [-1,1] but scale with content
    denom = max(3, min(15, len(toks) // 6))
    return max(-1.0, min(1.0, score / denom))
