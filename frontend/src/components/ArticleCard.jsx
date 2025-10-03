//frontend/src/components/ArticleCard.jsx
import React from 'react'
import { format } from 'timeago.js'
import SentimentPill from './SentimentPill'

export default function ArticleCard({ a }) {
  return (
    <a href={a.url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-white p-5 shadow hover:shadow-md transition">
      <div className="flex items-start gap-4">
        {a.image_url ? (
          <img src={a.image_url} alt="" className="w-24 h-24 object-cover rounded-xl" />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No Image</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium">{a.source}</span>
            {a.published_at && <span>• {format(a.published_at)}</span>}
            <SentimentPill score={a.sentiment ?? 0} />
          </div>
          <h3 className="mt-1 font-semibold text-base line-clamp-2">{a.title}</h3>
          {a.summary && <p className="mt-2 text-sm text-gray-700 line-clamp-4">{a.summary}</p>}
        </div>
      </div>
    </a>
  )
}