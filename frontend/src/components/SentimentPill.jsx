import React from 'react'

export default function SentimentPill({ score = 0 }) {
  const label = score > 0.1 ? 'Bullish' : score < -0.1 ? 'Bearish' : 'Neutral'
  const color =
    score > 0.1
      ? 'bg-green-100 text-green-700'
      : score < -0.1
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
}