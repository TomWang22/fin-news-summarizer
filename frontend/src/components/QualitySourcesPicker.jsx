// frontend/src/components/QualitySourcesPicker.jsx
import React from 'react'
import { QUALITY_SOURCES } from '../utils/sources'

export default function QualitySourcesPicker({ value, onChange }) {
  // value is the label string; onChange gets the full config {label, sourceId, domain}
  return (
    <div className="flex gap-2 items-center">
      <label className="text-sm text-gray-700">Quality sources</label>
      <select
        className="rounded-2xl border px-3 py-2 bg-white"
        value={value}
        onChange={e => {
          const picked = QUALITY_SOURCES.find(s => s.label === e.target.value) || QUALITY_SOURCES[0]
          onChange(picked)
        }}
      >
        {QUALITY_SOURCES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
      </select>
    </div>
  )
}
