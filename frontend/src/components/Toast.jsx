// ====================== frontend/src/components/Toast.jsx ======================
import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, kind='info') => {
    const id = crypto.randomUUID()
    setToasts(ts => [...ts, { id, msg, kind }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 2500) // why: auto-dismiss
  }, [])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id}
               className={`rounded-xl px-3 py-2 text-sm shadow border bg-white ${t.kind==='error'?'border-red-300':'border-gray-200'}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
