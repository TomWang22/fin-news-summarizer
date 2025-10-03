// =========================================
// frontend/src/api/diag.js
// =========================================
import client from './client'

export async function probeSources({ items, date_from, date_to, limit = 1 }) {
  const params = { items, limit }
  if (date_from) params.date_from = date_from
  if (date_to) params.date_to = date_to
  const res = await client.get('/api/diag/sources', { params })
  return res.data
}
