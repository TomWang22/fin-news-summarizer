// frontend/src/utils/sources.js
export const QUALITY_SOURCES = [
  { label: 'None',            sourceId: '',                         domain: '' },
  { label: 'Reuters',         sourceId: 'reuters',                  domain: 'reuters.com' },
  { label: 'Bloomberg',       sourceId: 'bloomberg',                domain: 'bloomberg.com' },
  { label: 'Financial Times', sourceId: 'financial-times',          domain: 'ft.com' },
  { label: 'WSJ',             sourceId: 'the-wall-street-journal',  domain: 'wsj.com' },
  { label: 'CNBC',            sourceId: 'cnbc',                     domain: 'cnbc.com' },
  { label: 'MarketWatch',     sourceId: 'marketwatch',              domain: 'marketwatch.com' },
  { label: 'Yahoo Finance',   sourceId: 'yahoo-finance',            domain: 'finance.yahoo.com' },
  { label: 'Business Insider',sourceId: 'business-insider',         domain: 'businessinsider.com' },
  { label: 'The Verge',       sourceId: 'the-verge',                domain: 'theverge.com' },
  { label: 'TechCrunch',      sourceId: 'techcrunch',               domain: 'techcrunch.com' },
];

export const QUALITY_BY_LABEL = Object.fromEntries(
  QUALITY_SOURCES.map(s => [s.label, s])
);

export const LABEL_BY_SOURCE_ID = Object.fromEntries(
  QUALITY_SOURCES.filter(s => s.sourceId).map(s => [s.sourceId, s.label])
);
