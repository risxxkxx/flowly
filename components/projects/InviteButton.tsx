'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X, Loader2, Check, Mail, Copy, Link } from 'lucide-react'

interface Props {
  projectId: string
  projectName: string
}

export default function InviteButton({ projectId, projectName }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'email' | 'link'>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${projectId}`
    : ''

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: matches, error: userErr } = await supabase
      .rpc('find_user_by_email', { email_query: email.toLowerCase().trim() })

    const viewer = Array.isArray(matches) ? matches[0] : null

    if (userErr || !viewer) {
      setError('No account found with that email address.')
      setLoading(false)
      return
    }

    if (viewer.id === user!.id) {
      setError('You cannot invite yourself.')
      setLoading(false)
      return
    }

    const { error: accessErr } = await supabase.from('project_access').upsert({
      project_id: projectId,
      owner_id: user!.id,
      viewer_id: viewer.id,
    }, { onConflict: 'project_id,viewer_id' })

    if (accessErr) { setError(accessErr.message); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function close() {
    setOpen(false)
    setEmail('')
    setError('')
    setSuccess(false)
    setTab('email')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <UserPlus size={15} /> Invite
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{backgroundColor:'rgba(0,0,0,0.3)'}}
          onClick={e => e.target === e.currentTarget && close()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Invite to project</h2>
              <button onClick={close} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <p className="text-sm mb-5" style={{color:'#94a3b8'}}>
              Give someone read-only access to <span className="font-medium text-gray-700">{projectName}</span>.
            </p>

            {success ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{backgroundColor:'#f0fdf4'}}>
                  <Check size={22} style={{color:'#16a34a'}} />
                </div>
                <p className="font-medium text-gray-900 mb-1">Access granted!</p>
                <p className="text-sm mb-5" style={{color:'#94a3b8'}}>They can now view this project.</p>
                <button onClick={close} className="btn-primary">Done</button>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{backgroundColor:'#f8fafc'}}>
                  {(['email', 'link'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                      style={tab === t
                        ? {backgroundColor:'white', color:'#0f172a', boxShadow:'0 1px 3px rgb(0 0 0 / 0.08)'}
                        : {color:'#94a3b8'}}>
                      {t === 'email' ? <Mail size={14} /> : <Link size={14} />}
                      {t === 'email' ? 'By email' : 'Copy link'}
                    </button>
                  ))}
                </div>

                {tab === 'email' ? (
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <label className="label">Email address</label>
                      <input className="input" type="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="colleague@example.com" required autoFocus />
                    </div>
                    {error && (
                      <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>{error}</div>
                    )}
                    <div className="flex gap-3">
                      <button type="button" onClick={close} className="btn-secondary flex-1">Cancel</button>
                      <button type="submit" className="btn-primary flex-1" disabled={loading}>
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        Grant access
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm" style={{color:'#94a3b8'}}>
                      Share this link. Anyone who opens it and has an account will get read-only access.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{backgroundColor:'#f8fafc', border:'1px solid #e2e8f0'}}>
                      <span className="text-xs flex-1 truncate font-mono" style={{color:'#64748b'}}>{inviteLink}</span>
                      <button onClick={copyLink} className="btn-ghost py-1.5 px-2 flex-shrink-0"
                        style={copied ? {color:'#16a34a'} : {}}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <button onClick={close} className="btn-secondary w-full">Close</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
