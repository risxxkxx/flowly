'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, X, Loader2, Check } from 'lucide-react'

export default function SharePlantButton({ plantId, plantName }: { plantId: string; plantName: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: viewer, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (userErr || !viewer) {
      setError('No account found with that email address.')
      setLoading(false)
      return
    }

    if (viewer.id === user!.id) {
      setError('You cannot share a plant with yourself.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('plant_access').upsert({
      plant_id: plantId,
      owner_id: user!.id,
      viewer_id: viewer.id,
    }, { onConflict: 'plant_id,viewer_id' })

    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Users size={16} /> Share
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-surface-900">Share plant</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <p className="text-sm text-surface-500 mb-6">
              Invite someone to view <span className="font-medium text-surface-700">{plantName}</span> in read-only mode.
            </p>

            {success ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-3">
                  <Check size={22} className="text-brand-600" />
                </div>
                <p className="font-medium text-surface-900 mb-1">Access granted!</p>
                <p className="text-sm text-surface-500 mb-5">They can now view this plant.</p>
                <button onClick={() => { setOpen(false); setSuccess(false); setEmail('') }}
                  className="btn-primary">Done</button>
              </div>
            ) : (
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input className="input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="colleague@example.com" required />
                </div>
                {error && (
                  <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading && <Loader2 size={15} className="animate-spin" />}
                    Grant access
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
