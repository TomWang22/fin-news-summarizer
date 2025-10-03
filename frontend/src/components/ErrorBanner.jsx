import React from 'react'
export default function ErrorBanner({ message }) {
  if (!message) return null
  return <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{message}</div>
}
