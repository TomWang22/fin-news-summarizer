// frontend/src/utils/query.js
// Small helper to expand common tickers for NewsAPI queries.
// Helper to expand tickers and broaden queries for more results.

export const TICKER_MAP = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  GOOGL: "Google",
  GOOG: "Google",
  AMZN: "Amazon",
  NVDA: "Nvidia",
  META: "Meta",
  TSLA: "Tesla",
  ORCL: "Oracle",
  IBM: "IBM",
  NFLX: "Netflix",
};

export function expandTickers(q) {
  if (!q || typeof q !== "string") return q;
  const parts = q.split(/,|\s+OR\s+/i).map((s) => s.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const term of parts) {
    const up = term.replace(/[^A-Z]/g, "").toUpperCase();
    const exp = TICKER_MAP[up] ? `(${up} OR ${TICKER_MAP[up]})` : term;
    const key = exp.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(exp);
    }
  }
  return out.length ? out.join(" OR ") : q;
}

// Adds sector/macro synonyms to pull more hits on NewsAPI.
export function broadenQuery(q) {
  if (!q || typeof q !== "string") return q;
  const extra = [
    "(earnings OR guidance OR upgrade OR downgrade OR outlook)",
    "(stock OR shares OR equities)",
    "(market OR index OR rally OR selloff)",
    "(Federal Reserve OR interest rates OR CPI OR inflation)",
  ];
  return `${q} OR ${extra.join(" OR ")}`;
}

export function buildQuery({ base, provider, broad }) {
  let q = base;
  // Server (provider) will handle ticker expansion. We keep only optional 'broad' synonyms here.
  if (provider === "newsapi" && broad) q = broadenQuery(q);
  return q;
}

// Handy presets for quick testing.
export const PRESETS = {
  "Big Tech": "AAPL, MSFT, AMZN, GOOGL, META",
  Semiconductors: "NVDA, AMD, AVGO, TSM, INTC",
  "Macro (Fed, CPI)": "Federal Reserve, CPI, inflation, interest rates",
  AI: "AI chips, generative AI, foundation models",
  Energy: "crude oil, natural gas, OPEC, refinery",
};