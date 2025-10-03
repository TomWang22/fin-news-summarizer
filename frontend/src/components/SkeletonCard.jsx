//frontend/src/components/SkeletonCard.jsx
import React from 'react'
export default function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow animate-pulse">
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}