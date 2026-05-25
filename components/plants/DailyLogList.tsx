'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, Calendar, Zap, Battery, FileText } from 'lucide-react'
import { format } from 'date-fns'
import type { DailyLog } from '@/types'

interface Props {
  plantId: string
  userId: string
  isOwner: boolean
  initialLogs: DailyLog[]
}

export default function DailyLogList({ plantId, userId, isOwner, initialLogs }: Props) {
  const router = useRouter()
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    log_date: format(new Date(), 'yyyy-MM-dd'),
    production_kwh: '',
    soc_percent: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.from('daily_logs').insert({
      plant_id: plantId,
      user_id: userId,
      log_date: form.log_date,
      production_kwh: form.production_kwh ? parseFloat(form.production_kwh) : null,
      soc_percent: form.soc_percent ? parseFloat(form.soc_percent) : null,
      notes: form.notes || null,
    }).select().single()

    if (error) { setError(error.message); setLoading(false); return }
    setLogs([data, ...logs])
    setOpen(false)
    setForm({ log_date: format(new Date(), 'yyyy-MM-dd'), production_kwh: '', soc_percent: '', notes: '' })
    setLoading(false)
  }

  return (
    <div>
      {isOwner && (
        <div className="mb-4">
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> Add today&apos;s log
          </button>
        </div>
      )}

      {/* Add log modal */}
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-surface-900">Add daily log</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.log_date}
                  onChange={e => set('log_date', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Production (kWh)</label>
                  <input className="input" type="number" step="0.01" min="0"
                    value={form.production_kwh} onChange={e => set('production_kwh', e.target.value)}
                    placeholder="e.g. 450" />
                </div>
                <div>
                  <label className="label">SOC (%)</label>
                  <input className="input" type="number" step="0.1" min="0" max="100"
                    value={form.soc_percent} onChange={e => set('soc_percent', e.target.value)}
                    placeholder="e.g. 85" />
                </div>
              </div>
              <div>
                <label className="label">Notes / MQTT report</label>
                <textarea className="input min-h-[100px] resize-none" value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Plant followed MQTT commands correctly. No issues observed..." />
              </div>

              {error && (
                <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Save log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log entries */}
      {logs.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={22} className="text-surface-400" />
          </div>
          <h3 className="font-medium text-surface-900 mb-1">No logs yet</h3>
          <p className="text-sm text-surface-500">Add the first daily log to start tracking performance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-surface-900">
                  <Calendar size={15} className="text-surface-400" />
                  {format(new Date(log.log_date + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-3">
                  {log.production_kwh != null && (
                    <div className="flex items-center gap-1.5 text-xs text-surface-600">
                      <Zap size={12} className="text-amber-500" />
                      {log.production_kwh} kWh
                    </div>
                  )}
                  {log.soc_percent != null && (
                    <div className="flex items-center gap-1.5 text-xs text-surface-600">
                      <Battery size={12} className="text-brand-500" />
                      {log.soc_percent}%
                    </div>
                  )}
                </div>
              </div>
              {log.notes && (
                <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-wrap">{log.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
