//frontend/src/components/Badge.jsx
import React from 'react'
export default function Badge({ children }) {
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{children}</span>
}