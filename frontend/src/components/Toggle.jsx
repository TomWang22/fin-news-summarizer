//frontend/src/components/Toggle.jsx
import React from 'react'
export default function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-indigo-600 relative">
        <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></span>
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}