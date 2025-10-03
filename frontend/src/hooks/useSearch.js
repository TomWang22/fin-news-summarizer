// frontend/src/hooks/useSearch.js  (return the data so callers can chain fallback)
import { useState } from 'react'
import client from '../api/client'

export function useSearch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  async function search(params) {
    setLoading(true); setError('')
    try {
      const res = await client.get('/api/search', { params })
      setData(res.data)
      return res.data          // <-- important
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Request failed'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, data, search, setData }
}
