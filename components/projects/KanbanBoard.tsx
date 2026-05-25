'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, Calendar, FileText, ChevronDown, ChevronUp, Trash2, Play, Pause, Clock, Flag, Search } from 'lucide-react'
import { format, isBefore, isSameDay, isThisWeek, parseISO } from 'date-fns'
import Toast from '@/components/ui/Toast'
import type { Priority } from '@/types'

type Status = 'todo' | 'inprogress' | 'done'
type DateBucket = 'overdue' | 'today' | 'thisWeek' | 'upcoming' | 'noDate'
type PriorityFilter = 'all' | Priority
type StatusFilter = 'all' | Status

interface Item {
  id: string
  project_id: string
  user_id: string
  title: string
  status: Status
  notes: string | null
  item_date: string | null
  priority: Priority
  completed_at: string | null
  total_seconds: number
  timer_started_at: string | null
  created_at: string
}

interface Props {
  projectId: string
  userId: string
  isOwner: boolean
  initialItems: Item[]
}

const COLUMNS: { key: Status; label: string; color: string; bg: string }[] = [
  { key: 'todo',       label: 'To Do',      color: '#64748b', bg: '#f8fafc' },
  { key: 'inprogress', label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
  { key: 'done',       label: 'Done',        color: '#16a34a', bg: '#f0fdf4' },
]

const PRIORITIES: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'low', label: 'Low', color: '#64748b', bg: '#f8fafc' },
  { value: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb' },
  { value: 'high', label: 'High', color: '#dc2626', bg: '#fef2f2' },
]

const DATE_FILTERS: { key: DateBucket | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
]

function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function getItemSeconds(item: Item, now: number) {
  const savedSeconds = item.total_seconds || 0
  if (!item.timer_started_at) return savedSeconds
  const activeSeconds = Math.max(0, Math.floor((now - new Date(item.timer_started_at).getTime()) / 1000))
  return savedSeconds + activeSeconds
}

function itemDate(date: string | null) {
  return date ? parseISO(`${date}T00:00:00`) : null
}

function getDateBucket(item: Item, today = new Date()): DateBucket {
  const date = itemDate(item.item_date)
  if (!date) return 'noDate'
  if (isBefore(date, new Date(today.getFullYear(), today.getMonth(), today.getDate()))) return 'overdue'
  if (isSameDay(date, today)) return 'today'
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'thisWeek'
  return 'upcoming'
}

function priorityRank(priority: Priority | null | undefined) {
  if (priority === 'high') return 0
  if (priority === 'medium') return 1
  return 2
}

function priorityStyle(priority: Priority | null | undefined) {
  return PRIORITIES.find(p => p.value === (priority || 'medium')) || PRIORITIES[1]
}

export default function KanbanBoard({ projectId, userId, isOwner, initialItems }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [addingTo, setAddingTo] = useState<Status | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ title: string; notes: string; item_date: string; priority: Priority }>({ title: '', notes: '', item_date: '', priority: 'medium' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateBucket | 'all'>('all')
  const [toast, setToast] = useState<{message: string; type: 'success'|'error'} | null>(null)
  const [formError, setFormError] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  function resetForm() {
    setForm({ title: '', notes: '', item_date: '', priority: 'medium' })
    setFormError('')
  }

  function showToast(message: string, type: 'success'|'error' = 'success') {
    setToast({ message, type })
  }

  async function addItem(status: Status) {
    if (!form.title.trim()) return
    setFormError('')
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('items').insert({
      project_id: projectId,
      user_id: userId,
      title: form.title.trim(),
      status,
      notes: form.notes || null,
      item_date: form.item_date || null,
      priority: form.priority,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      total_seconds: 0,
      timer_started_at: null,
    }).select().single()

    if (error) {
      const message = error.message || 'Failed to add item.'
      setFormError(message)
      showToast(`Failed to add item: ${message}`, 'error')
      setSaving(false)
      return
    }
    setItems([...items, data])
    resetForm()
    setAddingTo(null)
    showToast('Item added.')
    setSaving(false)
  }

  async function moveItem(item: Item, newStatus: Status) {
    const supabase = createClient()
    const movingToDone = newStatus === 'done'
    const totalSeconds = getItemSeconds(item, Date.now())
    const { data } = await supabase.from('items').update({
      status: newStatus,
      completed_at: movingToDone ? new Date().toISOString() : null,
      timer_started_at: movingToDone ? null : item.timer_started_at,
      total_seconds: totalSeconds,
    }).eq('id', item.id).select().single()
    if (data) {
      setItems(items.map(i => i.id === item.id ? data : i))
      showToast(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label}.`)
    }
  }

  async function toggleTimer(item: Item) {
    const supabase = createClient()
    const isRunning = Boolean(item.timer_started_at)
    const update = isRunning
      ? { timer_started_at: null, total_seconds: getItemSeconds(item, Date.now()) }
      : { timer_started_at: new Date().toISOString() }
    const { data, error } = await supabase.from('items').update(update).eq('id', item.id).select().single()
    if (error) { showToast('Failed to update timer.', 'error'); return }
    if (data) setItems(items.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Delete this item?')) return
    const supabase = createClient()
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (!error) {
      setItems(items.filter(i => i.id !== id))
      if (expanded === id) setExpanded(null)
      showToast('Item deleted.')
    }
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('items').update({
      title: editing.title,
      notes: editing.notes,
      item_date: editing.item_date,
      priority: editing.priority,
    }).eq('id', editing.id).select().single()

    if (error) { showToast('Failed to save.', 'error'); setSaving(false); return }
    setItems(items.map(i => i.id === editing.id ? data : i))
    setEditing(null)
    showToast('Item saved.')
    setSaving(false)
  }

  const sortedItems = [...items].sort((a, b) => {
    const priorityOrder = priorityRank(a.priority) - priorityRank(b.priority)
    if (priorityOrder !== 0) return priorityOrder
    return (a.item_date || '9999-12-31').localeCompare(b.item_date || '9999-12-31')
  })

  const filteredItems = sortedItems.filter(item => {
    const search = searchTerm.trim().toLowerCase()
    const matchesSearch = !search || item.title.toLowerCase().includes(search) || (item.notes || '').toLowerCase().includes(search)
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
    const matchesDate = dateFilter === 'all' || getDateBucket(item) === dateFilter
    return matchesSearch && matchesStatus && matchesPriority && matchesDate
  })

  const visibleColumns = statusFilter === 'all' ? COLUMNS : COLUMNS.filter(column => column.key === statusFilter)
  const hasActiveFilters = Boolean(searchTerm.trim()) || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all'

  function clearFilters() {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setDateFilter('all')
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="card p-4 mb-5 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'#94a3b8'}} />
          <input className="input pl-9" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search board items and notes..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All statuses</option>
              {COLUMNS.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}>
              <option value="all">All priorities</option>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DATE_FILTERS.map(filter => {
            const active = dateFilter === filter.key
            return (
              <button key={filter.key} onClick={() => setDateFilter(filter.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{backgroundColor: active ? '#0f172a' : '#f8fafc', color: active ? '#fff' : '#64748b', border:'1px solid #e2e8f0'}}>
                {filter.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={{color:'#94a3b8'}}>
            Showing {filteredItems.length} of {items.length} items
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost px-3 py-1.5 text-xs">Clear filters</button>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{backgroundColor:'rgba(0,0,0,0.3)'}}
          onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit item</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" value={editing.title}
                  onChange={e => setEditing({...editing, title: e.target.value})} />
              </div>
              <div>
                <label className="label">Due date</label>
                <input className="input" type="date" value={editing.item_date || ''}
                  onChange={e => setEditing({...editing, item_date: e.target.value || null})} />
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={editing.priority || 'medium'}
                  onChange={e => setEditing({...editing, priority: e.target.value as Priority})}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" style={{minHeight:120}}
                  value={editing.notes || ''}
                  onChange={e => setEditing({...editing, notes: e.target.value || null})}
                  placeholder="Add notes here..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={saveEdit} className="btn-primary flex-1" disabled={saving}>
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleColumns.map(col => {
          const colItems = filteredItems.filter(i => i.status === col.key)
          return (
            <div key={col.key} className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: col.color}} />
                  <span className="text-sm font-semibold" style={{color: col.color}}>{col.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{backgroundColor: col.bg, color: col.color}}>
                    {colItems.length}
                  </span>
                </div>
                {isOwner && (
                  <button onClick={() => { setAddingTo(col.key); resetForm() }}
                    className="btn-ghost p-1" style={{color: col.color}}>
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {addingTo === col.key && (
                <div className="card p-4 space-y-3">
                  <input className="input" value={form.title} autoFocus
                    onChange={e => setForm(f => ({...f, title: e.target.value}))}
                    placeholder="Item title..."
                    onKeyDown={e => e.key === 'Enter' && addItem(col.key)} />
                  {formError && (
                    <div className="px-3 py-2 rounded-xl text-xs leading-relaxed" style={{backgroundColor:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>
                      {formError}
                    </div>
                  )}
                  <input className="input" type="date" value={form.item_date}
                    onChange={e => setForm(f => ({...f, item_date: e.target.value}))} />
                  <select className="input" value={form.priority}
                    onChange={e => setForm(f => ({...f, priority: e.target.value as Priority}))}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <textarea className="input resize-none" style={{minHeight:80}}
                    value={form.notes}
                    onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    placeholder="Notes (optional)..." />
                  <div className="flex gap-2">
                    <button onClick={() => setAddingTo(null)} className="btn-secondary flex-1 py-2 text-xs">Cancel</button>
                    <button onClick={() => addItem(col.key)} className="btn-primary flex-1 py-2 text-xs"
                      disabled={saving || !form.title.trim()}>
                      {saving ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {colItems.length === 0 && addingTo !== col.key && (
                  <div className="rounded-xl border-2 border-dashed p-6 text-center" style={{borderColor:'#e2e8f0'}}>
                    <p className="text-xs" style={{color:'#cbd5e1'}}>No items</p>
                  </div>
                )}
                {colItems.map(item => {
                  const isRunning = Boolean(item.timer_started_at)
                  const priority = priorityStyle(item.priority)
                  const dateBucket = getDateBucket(item)
                  const dueColor = dateBucket === 'overdue' ? '#dc2626' : dateBucket === 'today' ? '#d97706' : '#94a3b8'
                  return (
                    <div key={item.id} className="card p-4 group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-900 flex-1 leading-snug">{item.title}</p>
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isOwner && (
                            <>
                              <button onClick={() => setEditing(item)}
                                title="Edit"
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                style={{color:'#94a3b8'}}>
                                <FileText size={13} />
                              </button>
                              <button onClick={() => deleteItem(item.id)}
                                title="Delete"
                                className="p-1 rounded transition-colors"
                                style={{color:'#94a3b8'}}
                                onMouseOver={e => (e.currentTarget as HTMLElement).style.color='#dc2626'}
                                onMouseOut={e => (e.currentTarget as HTMLElement).style.color='#94a3b8'}>
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                            title={expanded === item.id ? 'Collapse' : 'Expand'}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            style={{color:'#94a3b8'}}>
                            {expanded === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: priority.bg, color: priority.color}}>
                          <Flag size={10} />
                          {priority.label}
                        </div>
                        {item.item_date && (
                          <div className="flex items-center gap-1.5" style={{color: dueColor}}>
                            <Calendar size={11} />
                            <span className="text-xs">{format(new Date(item.item_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs" style={{color: isRunning ? '#16a34a' : '#94a3b8'}}>
                          <Clock size={11} />
                          {formatDuration(getItemSeconds(item, now))}
                        </div>
                        {isOwner && item.status !== 'done' && (
                          <button onClick={() => toggleTimer(item)}
                            className="px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                            style={{backgroundColor: isRunning ? '#fef2f2' : '#f0fdf4', color: isRunning ? '#dc2626' : '#16a34a'}}>
                            {isRunning ? <Pause size={11} /> : <Play size={11} />}
                            {isRunning ? 'Stop' : 'Start'}
                          </button>
                        )}
                      </div>

                      {expanded === item.id && (
                        <p className="text-xs leading-relaxed mt-2 pt-2 whitespace-pre-wrap"
                          style={{color: item.notes ? '#64748b' : '#cbd5e1', borderTop:'1px solid #f1f5f9', fontStyle: item.notes ? 'normal' : 'italic'}}>
                          {item.notes || 'No notes added.'}
                        </p>
                      )}

                      {isOwner && (
                        <div className="flex gap-1 mt-3 pt-2" style={{borderTop:'1px solid #f1f5f9'}}>
                          {COLUMNS.filter(c => c.key !== col.key).map(c => (
                            <button key={c.key} onClick={() => moveItem(item, c.key)}
                              className="text-xs px-2 py-1 rounded-lg transition-all flex-1 font-medium"
                              style={{backgroundColor: c.bg, color: c.color}}
                              onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity='0.7'}
                              onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity='1'}>
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
