# backend/smoke_services.py
from __future__ import annotations

from app.services.summarizer import summarize
from app.services.sentiment import quick_sentiment

def demo():
    sample_html = """
    <h1>Earnings beat expectations</h1>
    <p>Shares jumped after the company posted record profits and strong growth.</p>
    <p>Analysts upgraded the stock. However, debt remains a concern for some investors.</p>
    """
    summary = summarize(sample_html, max_sentences=2)
    sentiment = quick_sentiment(f"{summary}")

    print("=== Smoke Test: summarizer + sentiment ===")
    print("Summary (2 sentences):")
    print(summary)
    print("\nSentiment score [-1..1]:", round(sentiment, 3))

    # Edge: empty text
    print("\n=== Edge: empty text ===")
    print("Summary:", summarize("", max_sentences=2))
    print("Sentiment:", quick_sentiment(""))

    # Edge: long, no punctuation
    runon = "Stocks rallied as demand increased significantly across regions with supply improving and inventories normalizing while management guided higher next quarter revenue"
    print("\n=== Edge: run-on text (no punctuation) ===")
    print("Summary:", summarize(runon, max_sentences=2))
    print("Sentiment:", quick_sentiment(runon))

if __name__ == "__main__":
    demo()
