// ========================== frontend/src/api/saved.js ==========================
import client from './client'

export async function listSavedServer() {
  const { data } = await client.get('/api/saved')
  return data
}
export async function createSavedServer(name, params) {
  const { data } = await client.post('/api/saved', { name, params })
  return data
}
export async function deleteSavedServer(id) {
  const { data } = await client.delete(`/api/saved/${id}`)
  return data
}
