// =================== frontend/src/utils/savedSearches.js ===================
const KEY = 'savedSearches:v1'
const safeParse = j => { try { return JSON.parse(j||'[]') } catch { return [] } }

export function listSaved() {
  const arr = safeParse(localStorage.getItem(KEY))
  return Array.isArray(arr) ? arr : []
}
export function saveSearch(name, params) {
  const arr = listSaved().filter(x => x.name !== name)
  arr.unshift({
    id: crypto.randomUUID(),
    name: (name || params?.query || '').trim() || new Date().toISOString(),
    params,
    created_at: new Date().toISOString(),
  })
  localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50)))
}
export function removeSaved(id) {
  const arr = listSaved().filter(x => x.id !== id)
  localStorage.setItem(KEY, JSON.stringify(arr))
}
export function clearAllSaved() {
  localStorage.setItem(KEY, JSON.stringify([]))
}
