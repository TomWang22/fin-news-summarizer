// ================== frontend/src/utils/csv.js ==================
export function toCSV(rows, headers) {
  const esc = (s) => {
    const t = (s ?? '').toString().replace(/"/g, '""')
    return /[",\n]/.test(t) ? `"${t}"` : t
  }
  const head = headers.map(h => esc(h.label)).join(',')
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(',')).join('\n')
  return head + '\n' + body
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  a.remove(); URL.revokeObjectURL(url)
}
