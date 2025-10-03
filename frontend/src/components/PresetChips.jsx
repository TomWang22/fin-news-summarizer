//frontend/src/components/PresetChips.jsx
import React from 'react'
export default function PresetChips({ presets, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(presets).map(([name, val]) => (
        <button
          key={name}
          onClick={() => onPick(val)}
          className="rounded-full bg-white border px-3 py-1 text-xs shadow-sm hover:shadow"
          title={val}
        >
          {name}
        </button>
      ))}
    </div>
  )
}