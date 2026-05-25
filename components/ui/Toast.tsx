'use client'

import { useEffect, useState } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'

interface Props {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export default function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
        style={{
          backgroundColor: type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: type === 'success' ? '#15803d' : '#dc2626',
        }}>
        {type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
