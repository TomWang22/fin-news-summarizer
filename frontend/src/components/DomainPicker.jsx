// ================== frontend/src/components/DomainPicker.jsx ==================
import React from 'react'

const PRESETS = [
  { label: 'Any', value: '' },
  { label: 'Reuters', value: 'reuters.com' },
  { label: 'Bloomberg', value: 'bloomberg.com' },
  { label: 'Financial Times', value: 'ft.com' },
  { label: 'WSJ (paywalled)', value: 'wsj.com' },
]

export default function DomainPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 items-center">
      <select
        className="rounded-2xl border px-3 py-2 bg-white"
        value={PRESETS.find(p => p.value === value)?.value ?? ''}
        onChange={e => {
          const v = e.target.value
          onChange(v)  // preset fills the input
        }}
      >
        {PRESETS.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
      </select>
      <input
        className="rounded-2xl border px-3 py-2 bg-white flex-1"
        placeholder="Custom domains: reuters.com,bloomberg.com"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}