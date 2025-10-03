// =========================================
// frontend/src/components/DatePresets.jsx
// =========================================
import React from 'react'

function fmt(d) { return d.toISOString().slice(0,10) }

export default function DatePresets({ onSet }) {
  // why: quick ranges improve UX
  function setDays(n) {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - n)
    onSet({ from: fmt(from), to: fmt(to) })
  }
  function setToday() {
    const to = new Date()
    onSet({ from: fmt(to), to: fmt(to) })
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-600">Range:</span>
      <button type="button" onClick={() => setToday()} className="rounded-full border px-3 py-1 hover:bg-gray-50">Today</button>
      <button type="button" onClick={() => setDays(3)} className="rounded-full border px-3 py-1 hover:bg-gray-50">3d</button>
      <button type="button" onClick={() => setDays(7)} className="rounded-full border px-3 py-1 hover:bg-gray-50">7d</button>
      <button type="button" onClick={() => setDays(30)} className="rounded-full border px-3 py-1 hover:bg-gray-50">30d</button>
      <button type="button" onClick={() => onSet({ from: '', to: '' })} className="rounded-full border px-3 py-1 hover:bg-gray-50">Clear</button>
    </div>
  )
}