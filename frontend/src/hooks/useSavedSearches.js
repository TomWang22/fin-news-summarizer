import { useCallback, useState } from 'react'
import client from '../api/client'

export default function useSavedSearches() {
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => { setItems([]); setNextCursor(null); setError('') }, [])

  const fetchPage = useCallback(async ({ q, limit = 10, order = 'id', dir = 'desc', cursor = null } = {}) => {
    const params = { limit, order, dir }
    if (q) params.q = q
    if (cursor !== null && cursor !== undefined) params.cursor = cursor
    setLoading(true); setError('')
    try {
      const { data } = await client.get('/api/saved', { params })
      setItems(prev => cursor ? [...prev, ...data.items] : data.items)
      setNextCursor(data.next_cursor)
      return data
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load saved searches')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id) => {
    await client.delete(`/api/saved/${id}`)
    setItems(prev => prev.filter(x => x.id !== id))
  }, [])

  return { items, nextCursor, loading, error, fetchPage, remove, reset }
}
