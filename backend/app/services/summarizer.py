# backend/app/services/summarizer.py
from __future__ import annotations
from .normalize import strip_html, sent_tokenize, word_freq

def summarize(text: str, max_sentences: int = 3) -> str:
    text = strip_html(text)
    sents = sent_tokenize(text)
    if not sents:
        return ""
    corpus = " ".join(sents)
    freq = word_freq(corpus)
    if not freq:
        return " ".join(sents[:max_sentences])

    scored: list[tuple[float, int, str]] = []
    for i, s in enumerate(sents):
        s_freq = word_freq(s)
        score = sum(freq.get(w, 0) for w in s_freq.keys())
        if i == 0:
            score *= 1.15  # why: lead sentences often carry key info
        scored.append((score, i, s))

    scored.sort(key=lambda t: (-t[0], t[1]))
    top = sorted(scored[:max_sentences], key=lambda t: t[1])
    return " ".join(s for _, _, s in top).strip()
