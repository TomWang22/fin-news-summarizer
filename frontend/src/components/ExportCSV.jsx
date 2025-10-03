// ================== frontend/src/components/ExportCSV.jsx ==================
import React from 'react'
import { toCSV, downloadCSV } from '../utils/csv'

export default function ExportCSV({ data }) {
  const disabled = !data || !data.articles || data.articles.length === 0
  function onExport() {
    const rows = data.articles.map(a => ({
      title: a.title,
      source: a.source,
      url: a.url,
      published_at: a.published_at || '',
      sentiment: typeof a.sentiment === 'number' ? a.sentiment.toFixed(3) : '',
      summary: a.summary || ''
    }))
    const headers = [
      { key: 'title', label: 'Title' },
      { key: 'source', label: 'Source' },
      { key: 'url', label: 'URL' },
      { key: 'published_at', label: 'Published At' },
      { key: 'sentiment', label: 'Sentiment' },
      { key: 'summary', label: 'Summary' },
    ]
    const csv = toCSV(rows, headers)
    downloadCSV('news_results.csv', csv)
  }
  return (
    <button
      disabled={disabled}
      onClick={onExport}
      className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      title={disabled ? 'Search first to export' : 'Download CSV'}
    >
      Export CSV
    </button>
  )
}
