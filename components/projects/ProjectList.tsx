'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, FolderOpen, ArrowRight, Trash2 } from 'lucide-react'
import type { Project, Category } from '@/types'

const COLORS = [
  { label: 'Slate',  value: '#475569' },
  { label: 'Blue',   value: '#2563eb' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Green',  value: '#16a34a' },
  { label: 'Amber',  value: '#d97706' },
  { label: 'Red',    value: '#dc2626' },
  { label: 'Pink',   value: '#db2777' },
]

interface Props {
  userId: string
  category: Category
}

export default function ProjectList({ userId, category }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0].value })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('projects').select('*')
      .eq('owner_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setProjects(data || []); setLoading(false) })
  }, [userId, category])

  async function addProject(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('projects').insert({
      owner_id: userId,
      name: form.name,
      description: form.description || null,
      category,
      color: form.color,
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    setProjects([data, ...projects])
    setForm({ name: '', description: '', color: COLORS[0].value })
    setOpen(false)
    setSaving(false)
  }


  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"? All tasks/items inside it will also be deleted.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', project.id).eq('owner_id', userId)
    if (error) { setError(error.message); return }
    setProjects(projects.filter(p => p.id !== project.id))
  }
  if (loading) return (
    <div className="card p-8 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{color:'#cbd5e1'}} />
    </div>
  )

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={16} /> New project
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{backgroundColor:'rgba(0,0,0,0.3)'}}
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">New project</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={addProject} className="space-y-4">
              <div>
                <label className="label">Project name</label>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="e.g. Website redesign" required autoFocus />
              </div>
              <div>
                <label className="label">Description <span style={{color:'#94a3b8', fontWeight:400}}>(optional)</span></label>
                <textarea className="input resize-none" style={{minHeight:80}} value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="What is this project about?" />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setForm(f => ({...f, color: c.value}))}
                      className="w-7 h-7 rounded-full transition-all duration-150"
                      style={{
                        backgroundColor: c.value,
                        outline: form.color === c.value ? `3px solid ${c.value}` : 'none',
                        outlineOffset: 2,
                        opacity: form.color === c.value ? 1 : 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>{error}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{backgroundColor:'#f8fafc'}}>
            <FolderOpen size={22} style={{color:'#cbd5e1'}} />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">No projects yet</h3>
          <p className="text-sm" style={{color:'#94a3b8'}}>Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div key={project.id} className="card p-5 group block" style={{transition:'box-shadow 150ms'}}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: project.color}} />
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{project.name}</h3>
                </div>
                <button onClick={() => deleteProject(project)}
                  title="Delete project"
                  className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded flex-shrink-0"
                  style={{color:'#cbd5e1'}}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.color='#dc2626'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.color='#cbd5e1'}>
                  <Trash2 size={14} />
                </button>
              </div>
              {project.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{color:'#94a3b8'}}>{project.description}</p>
              )}
              <Link href={`/dashboard/projects/${project.id}`} className="flex items-center gap-1 text-xs font-medium mt-2" style={{color: project.color}}>
                Open <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
