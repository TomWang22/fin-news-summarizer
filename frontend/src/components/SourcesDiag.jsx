// =========================================
// frontend/src/components/SourcesDiag.jsx
// =========================================
import React, { useState } from 'react'
import { probeSources } from '../api/diag'

// Defaults: a mix of source IDs and domains
const DEFAULT_ITEMS = [
  'reuters', 'bloomberg', 'financial-times', 'the-wall-street-journal',
  'cnbc', 'marketwatch', 'yahoo-finance', 'business-insider',
  'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com'
]

export default function SourcesDiag({ open, onClose, dateFrom, dateTo }) {
  const [items, setItems] = useState(DEFAULT_ITEMS.join(','))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  async function runProbe() {
    setLoading(true); setError(''); setData(null)
    try {
      const resp = await probeSources({ items, date_from: dateFrom, date_to: dateTo, limit: 1 })
      setData(resp)
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Probe failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start md:items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Check Sources (NewsAPI)</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>

        <div className="mt-3 space-y-3">
          <div className="text-sm text-gray-600">
            Enter comma-separated **source IDs** (e.g., <span className="font-mono">reuters</span>) or **domains** (e.g., <span className="font-mono">reuters.com</span>). We’ll try IDs first, then domains.
          </div>
          <textarea
            className="w-full rounded-xl border p-2 font-mono text-sm"
            rows={3}
            value={items}
            onChange={e => setItems(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={runProbe}
              disabled={loading}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-60"
            >
              {loading ? 'Probing…' : 'Run probe'}
            </button>
            {dateFrom || dateTo ? (
              <div className="text-xs text-gray-600">
                Using date range: {dateFrom || '…'} → {dateTo || '…'}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No date filter</div>
            )}
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

          {data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Item</th>
                    <th className="py-2">Hits</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tested.map((it) => (
                    <tr key={it} className="border-t">
                      <td className="py-2 font-mono">{it}</td>
                      <td className="py-2">{data.results[it] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}