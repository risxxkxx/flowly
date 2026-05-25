'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, User, Mail, Key, Check, Globe } from 'lucide-react'
import { useT } from '@/lib/i18n-context'
import { locales, localeNames, type Locale } from '@/lib/i18n'

export default function ProfilePage() {
  const { t, locale, setLocale } = useT()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setFullName(user.user_metadata?.full_name || '')
        setEmail(user.email || '')
      }
      setLoading(false)
    })
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    const supabase = createClient()
    const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (authErr) { setError(authErr.message); setSaving(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('users').update({ full_name: fullName }).eq('id', user.id)
    setSuccess(t('profile.profileUpdated'))
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPassword !== confirmPassword) { setPwError(t('profile.passwordMismatch')); return }
    if (newPassword.length < 8) { setPwError(t('profile.passwordShort')); return }
    setSavingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); setSavingPw(false); return }
    setPwSuccess(t('profile.passwordChanged'))
    setNewPassword('')
    setConfirmPassword('')
    setSavingPw(false)
    setTimeout(() => setPwSuccess(''), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={22} className="animate-spin" style={{color:'#cbd5e1'}} />
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('profile.title')}</h1>
        <p className="mt-1" style={{color:'#94a3b8'}}>{t('profile.subtitle')}</p>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Language */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Globe size={18} className="text-gray-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('profile.language')}</h2>
              <p className="text-sm" style={{color:'#94a3b8'}}>{t('profile.languageDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {locales.map(l => (
              <button key={l} onClick={() => setLocale(l)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={locale === l
                  ? {backgroundColor:'#111827', color:'white'}
                  : {backgroundColor:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0'}}>
                {localeNames[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Profile info */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <User size={18} className="text-gray-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('profile.personalInfo')}</h2>
              <p className="text-sm" style={{color:'#94a3b8'}}>{t('profile.personalInfoDesc')}</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="label">{t('profile.fullName')}</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('profile.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{color:'#94a3b8'}} />
                <input className="input pl-9" value={email} disabled style={{backgroundColor:'#f8fafc', color:'#94a3b8'}} />
              </div>
              <p className="text-xs mt-1.5" style={{color:'#94a3b8'}}>{t('profile.emailNote')}</p>
            </div>
            {error && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>{error}</div>}
            {success && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
                <Check size={15}/> {success}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              {t('profile.saveChanges')}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Key size={18} className="text-gray-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('profile.changePassword')}</h2>
              <p className="text-sm" style={{color:'#94a3b8'}}>{t('profile.changePasswordDesc')}</p>
            </div>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="label">{t('profile.newPassword')}</label>
              <input className="input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="label">{t('profile.confirmPassword')}</label>
              <input className="input" type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} placeholder={t('profile.repeatPassword')} />
            </div>
            {pwError && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>{pwError}</div>}
            {pwSuccess && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
                <Check size={15}/> {pwSuccess}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={savingPw}>
              {savingPw && <Loader2 size={15} className="animate-spin" />}
              {t('profile.changeBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
