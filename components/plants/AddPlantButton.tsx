'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'
import type { Category } from '@/types'

export default function AddPlantButton({ category, label }: { category: Category; label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', location: '', capacity_kw: '', battery_kwh: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('plants').insert({
      owner_id: user!.id,
      name: form.name,
      location: form.location || null,
      capacity_kw: parseFloat(form.capacity_kw),
      battery_kwh: parseFloat(form.battery_kwh),
      category,
    })

    if (error) { setError(error.message); setLoading(false); return }
    setOpen(false)
    setForm({ name: '', location: '', capacity_kw: '', battery_kwh: '' })
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> {label || 'Add plant'}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-surface-900">Add plant</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Plant name</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Site A - Roof 1" required />
              </div>
              <div>
                <label className="label">Location <span className="text-surface-400 font-normal">(optional)</span></label>
                <input className="input" value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="e.g. Skopje, North Macedonia" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Capacity (kW)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.capacity_kw}
                    onChange={e => set('capacity_kw', e.target.value)} placeholder="100" required />
                </div>
                <div>
                  <label className="label">BESS (kWh)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.battery_kwh}
                    onChange={e => set('battery_kwh', e.target.value)} placeholder="200" required />
                </div>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Add plant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
