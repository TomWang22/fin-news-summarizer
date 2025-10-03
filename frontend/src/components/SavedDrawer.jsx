import React, { useEffect, useState } from 'react'
import useSavedSearches from '../hooks/useSavedSearches'

export default function SavedDrawer({ open, onClose, onLoadSaved }) {
  const { items, nextCursor, loading, error, fetchPage, remove, reset } = useSavedSearches()
  const [q, setQ] = useState('')
  const [order, setOrder] = useState('id')
  const [dir, setDir] = useState('desc')

  useEffect(() => {
    if (open) {
      reset()
      fetchPage({ q, limit: 10, order, dir })
    }
  }, [open]) // eslint-disable-line

  const loadMore = () => {
    if (nextCursor === null) return
    fetchPage({ q, limit: 10, order, dir, cursor: nextCursor })
  }

  const onSearch = (e) => {
    e.preventDefault()
    reset()
    fetchPage({ q, limit: 10, order, dir })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Saved Searches</h2>
          <button onClick={onClose} className="px-2 py-1 border rounded-md">Close</button>
        </div>

        <form onSubmit={onSearch} className="flex gap-2 mb-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name…" className="flex-1 border rounded-md px-2 py-1"/>
          <select value={order} onChange={e => setOrder(e.target.value)} className="border rounded-md px-2 py-1">
            <option value="id">Order: ID</option>
            <option value="created_at">Order: Created</option>
          </select>
          <select value={dir} onChange={e => setDir(e.target.value)} className="border rounded-md px-2 py-1">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <button className="border rounded-md px-3 py-1">Go</button>
        </form>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoadSaved?.(it.params)} className="px-2 py-1 border rounded-md">Load</button>
                <button onClick={() => remove(it.id)} className="px-2 py-1 border rounded-md">Delete</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3">
          {nextCursor !== null ? (
            <button disabled={loading} onClick={loadMore} className="px-3 py-2 border rounded-md w-full">
              {loading ? 'Loading…' : 'Load more'}
            </button>
          ) : (
            <div className="text-center text-xs text-gray-500">No more results.</div>
          )}
        </div>
      </div>
    </div>
  )
}
