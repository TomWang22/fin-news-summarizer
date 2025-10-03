//frontend/src/components/CopyLink.jsx
import React, { useState } from 'react'

export default function CopyLink() {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true); setTimeout(() => setCopied(false), 1200)
    } catch {}
  }
  return (
    <button onClick={onCopy} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}