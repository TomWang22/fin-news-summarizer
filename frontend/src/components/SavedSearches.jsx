// =================== frontend/src/components/SavedSearches.jsx ===================
import React, { useEffect, useState } from 'react'
import { listSaved, saveSearch, removeSaved, clearAllSaved } from '../utils/savedSearches'
import { listSavedServer, createSavedServer, deleteSavedServer } from '../api/saved'
import { useToast } from './Toast'

export default function SavedSearches({ currentParams, onLoad }) {
  const { push } = useToast()
  const [items, setItems] = useState(listSaved())
  const [name, setName] = useState('')
  const [syncServer, setSyncServer] = useState(false)
  const [loading, setLoading] = useState(false)

  async function refreshServer() {
    try {
      setLoading(true)
      const rows = await listSavedServer()
      setItems(rows.map(r => ({ id: `srv:${r.id}`, name: r.name, params: r.params, created_at: r.created_at })))
    } catch (e) {
      push('Server sync unavailable; using local.', 'error')
      setSyncServer(false)
      setItems(listSaved())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // optimistic probe: if server responds, keep sync on
    (async () => {
      try {
        await listSavedServer()
        setSyncServer(true)
        await refreshServer()
      } catch {
        setSyncServer(false)
      }
    })()
  }, [])

  function refreshLocal() { setItems(listSaved()) }

  async function onSave() {
    if (!currentParams) return
    const nm = name || currentParams.query || 'Search'
    try {
      if (syncServer) {
        await createSavedServer(nm, currentParams)
        await refreshServer()
      } else {
        saveSearch(nm, currentParams)
        refreshLocal()
      }
      push('Saved!')
      setName('')
    } catch {
      push('Save failed', 'error')
    }
  }

  async function onDelete(it) {
    try {
      if (syncServer && it.id.startsWith('srv:')) {
        const id = it.id.split(':')[1]
        await deleteSavedServer(id)
        await refreshServer()
      } else {
        removeSaved(it.id)
        refreshLocal()
      }
      push('Deleted')
    } catch {
      push('Delete failed', 'error')
    }
  }

  async function onToggleSync(v) {
    setSyncServer(v)
    if (v) await refreshServer()
    else { setItems(listSaved()); push('Using local storage') }
  }

  async function onUse(it) {
    try {
      await onLoad?.(it.params)
      push('Loaded')
    } catch {
      push('Load failed', 'error')
    }
  }

  return (
    <div className="rounded-2xl border p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Saved Searches</div>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={syncServer} onChange={e => onToggleSync(e.target.checked)} />
          Sync to server
        </label>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          placeholder="Name this search"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button onClick={onSave} disabled={loading}
                className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm disabled:opacity-60">
          Save
        </button>
        <button onClick={() => { clearAllSaved(); setItems([]); push('Cleared') }}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
          Clear local
        </button>
      </div>

      <div className="mt-3 max-h-56 overflow-auto divide-y">
        {items.length === 0 ? (
          <div className="text-xs text-gray-500">No saved searches.</div>
        ) : items.map(it => (
          <div key={it.id} className="py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{it.name}</div>
              <div className="text-xs text-gray-500 truncate">{it.params?.query}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => onUse(it)} className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50">Load</button>
              <button onClick={() => onDelete(it)} className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}