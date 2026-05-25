'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, CheckSquare, Square, Trash2, Calendar, Play, Pause, Clock, Flag, Search } from 'lucide-react'
import { format, isBefore, isSameDay, isThisWeek, parseISO } from 'date-fns'
import type { Task, Category, Priority } from '@/types'

interface Props {
  userId: string
  category: Category
  projectId?: string
  readOnly?: boolean
}

type TaskBucket = 'overdue' | 'today' | 'thisWeek' | 'upcoming' | 'noDate'
type StatusFilter = 'all' | 'open' | 'completed'
type PriorityFilter = 'all' | Priority
type DueFilter = 'all' | TaskBucket

const PRIORITIES: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'low', label: 'Low', color: '#64748b', bg: '#f8fafc' },
  { value: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb' },
  { value: 'high', label: 'High', color: '#dc2626', bg: '#fef2f2' },
]

const BUCKETS: { key: TaskBucket; label: string; helper: string }[] = [
  { key: 'overdue', label: 'Overdue', helper: 'Past due and still open' },
  { key: 'today', label: 'Today', helper: 'Due today' },
  { key: 'thisWeek', label: 'This week', helper: 'Due later this week' },
  { key: 'upcoming', label: 'Upcoming', helper: 'Future deadlines' },
  { key: 'noDate', label: 'No deadline', helper: 'Open tasks without a date' },
]

const DUE_FILTERS: { key: DueFilter; label: string }[] = [
  { key: 'all', label: 'All dates' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'noDate', label: 'No deadline' },
]

function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function getTaskSeconds(task: Task, now: number) {
  const savedSeconds = task.total_seconds || 0
  if (!task.timer_started_at) return savedSeconds
  const activeSeconds = Math.max(0, Math.floor((now - new Date(task.timer_started_at).getTime()) / 1000))
  return savedSeconds + activeSeconds
}

function dueDate(date: string | null) {
  return date ? parseISO(`${date}T00:00:00`) : null
}

function getTaskBucket(task: Task, today = new Date()): TaskBucket {
  const date = dueDate(task.due_date)
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

export default function TaskList({ userId, category, projectId, readOnly }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<{ title: string; due_date: string; priority: Priority }>({ title: '', due_date: '', priority: 'medium' })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let query = supabase.from('tasks').select('*')
      .eq('user_id', userId)
      .eq('category', category)

    if (projectId) {
      query = query.eq('project_id', projectId)
    } else {
      query = query.is('project_id', null)
    }

    query.order('completed', { ascending: true })
         .order('due_date', { ascending: true, nullsFirst: false })
         .order('created_at', { ascending: false })
         .then(({ data }) => { setTasks(data || []); setLoading(false) })
  }, [userId, category, projectId])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('tasks').insert({
      user_id: userId,
      title: form.title,
      category,
      project_id: projectId || null,
      due_date: form.due_date || null,
      priority: form.priority,
      completed: false,
      completed_at: null,
      total_seconds: 0,
      timer_started_at: null,
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    setTasks([data, ...tasks])
    setForm({ title: '', due_date: '', priority: 'medium' })
    setOpen(false)
    setSaving(false)
  }

  async function toggleTask(task: Task) {
    const supabase = createClient()
    const completing = !task.completed
    const totalSeconds = getTaskSeconds(task, Date.now())
    const { data } = await supabase.from('tasks').update({
      completed: completing,
      completed_at: completing ? new Date().toISOString() : null,
      timer_started_at: completing ? null : task.timer_started_at,
      total_seconds: totalSeconds,
    }).eq('id', task.id).select().single()
    if (data) setTasks(tasks.map(t => t.id === task.id ? data : t))
  }

  async function toggleTimer(task: Task) {
    const supabase = createClient()
    const isRunning = Boolean(task.timer_started_at)
    const update = isRunning
      ? { timer_started_at: null, total_seconds: getTaskSeconds(task, Date.now()) }
      : { timer_started_at: new Date().toISOString() }
    const { data } = await supabase.from('tasks').update(update).eq('id', task.id).select().single()
    if (data) setTasks(tasks.map(t => t.id === task.id ? data : t))
  }

  async function deleteTask(id: string) {
    if (!window.confirm('Delete this task?')) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  const filteredTasks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return tasks.filter(task => {
      const matchesSearch = !search || task.title.toLowerCase().includes(search)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'open' ? !task.completed : task.completed)
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const matchesDue = dueFilter === 'all' || getTaskBucket(task) === dueFilter
      return matchesSearch && matchesStatus && matchesPriority && matchesDue
    })
  }, [tasks, searchTerm, statusFilter, priorityFilter, dueFilter])

  const openTasks = useMemo(() => [...filteredTasks]
    .filter(t => !t.completed)
    .sort((a, b) => {
      const bucketOrder = BUCKETS.findIndex(x => x.key === getTaskBucket(a)) - BUCKETS.findIndex(x => x.key === getTaskBucket(b))
      if (bucketOrder !== 0) return bucketOrder
      const priorityOrder = priorityRank(a.priority) - priorityRank(b.priority)
      if (priorityOrder !== 0) return priorityOrder
      return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31')
    }), [filteredTasks])
  const doneTasks = filteredTasks.filter(t => t.completed)
  const hasActiveFilters = Boolean(searchTerm.trim()) || statusFilter !== 'all' || priorityFilter !== 'all' || dueFilter !== 'all'

  function clearFilters() {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setDueFilter('all')
  }

  if (loading) return (
    <div className="card p-8 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{color:'#cbd5e1'}} />
    </div>
  )

  return (
    <div>
      {!readOnly && (
        <div className="mb-4">
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> Add task
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{backgroundColor:'rgba(0,0,0,0.3)'}}
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add task</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={addTask} className="space-y-4">
              <div>
                <label className="label">Task</label>
                <input className="input" value={form.title}
                  onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  placeholder="What needs to be done?" required autoFocus />
              </div>
              <div>
                <label className="label">Due date <span style={{color:'#94a3b8',fontWeight:400}}>(optional)</span></label>
                <input className="input" type="date" value={form.due_date}
                  onChange={e => setForm(f => ({...f, due_date: e.target.value}))} />
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority}
                  onChange={e => setForm(f => ({...f, priority: e.target.value as Priority}))}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {error && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{backgroundColor:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>{error}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Add task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {tasks.length > 0 && (
        <div className="card p-4 mb-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'#94a3b8'}} />
            <input className="input pl-9" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search tasks..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}>
                <option value="all">All priorities</option>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <select className="input" value={dueFilter} onChange={e => setDueFilter(e.target.value as DueFilter)}>
                {DUE_FILTERS.map(filter => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{color:'#94a3b8'}}>
              Showing {filteredTasks.length} of {tasks.length} tasks
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-ghost px-3 py-1.5 text-xs">Clear filters</button>
            )}
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{backgroundColor:'#f8fafc'}}>
            <CheckSquare size={22} style={{color:'#cbd5e1'}} />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">No tasks yet</h3>
          <p className="text-sm" style={{color:'#94a3b8'}}>
            {readOnly ? 'No tasks in this project.' : 'Add a task to get started.'}
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card p-8 text-center">
          <h3 className="font-medium text-gray-900 mb-1">No matching tasks</h3>
          <p className="text-sm mb-4" style={{color:'#94a3b8'}}>Try changing your search or filters.</p>
          <button onClick={clearFilters} className="btn-secondary">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-4">
          {BUCKETS.map(bucket => {
            const bucketTasks = openTasks.filter(t => getTaskBucket(t) === bucket.key)
            if (bucketTasks.length === 0) return null
            return (
              <div key={bucket.key} className="card overflow-hidden">
                <div className="px-4 py-3" style={{backgroundColor:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{bucket.label}</h3>
                      <p className="text-xs" style={{color:'#94a3b8'}}>{bucket.helper}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor:'#e2e8f0', color:'#475569'}}>
                      {bucketTasks.length}
                    </span>
                  </div>
                </div>
                {bucketTasks.map((task, i) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask}
                    onToggleTimer={toggleTimer} now={now} readOnly={readOnly} border={i > 0} />
                ))}
              </div>
            )
          })}

          {doneTasks.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2" style={{backgroundColor:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                <span className="text-xs font-medium uppercase tracking-wide" style={{color:'#94a3b8'}}>
                  Completed ({doneTasks.length})
                </span>
              </div>
              {doneTasks.map((task, i) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask}
                  onToggleTimer={toggleTimer} now={now} readOnly={readOnly} border={i > 0} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete, onToggleTimer, now, readOnly, border }: {
  task: Task
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
  onToggleTimer: (t: Task) => void
  now: number
  readOnly?: boolean
  border: boolean
}) {
  const isRunning = Boolean(task.timer_started_at)
  const seconds = getTaskSeconds(task, now)
  const priority = priorityStyle(task.priority)
  const bucket = getTaskBucket(task)
  const dueColor = bucket === 'overdue' ? '#dc2626' : bucket === 'today' ? '#d97706' : '#94a3b8'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 group transition-all duration-150 ${task.completed ? 'opacity-40' : ''}`}
      style={border ? {borderTop:'1px solid #f1f5f9'} : {}}>
      {!readOnly && (
        <button onClick={() => onToggle(task)} className="flex-shrink-0 transition-colors"
          style={{color: task.completed ? '#22c55e' : '#cbd5e1'}}>
          {task.completed ? <CheckSquare size={17} /> : <Square size={17} />}
        </button>
      )}
      <span className={`flex-1 text-sm ${task.completed ? 'line-through' : 'text-gray-800'}`}
        style={task.completed ? {color:'#94a3b8'} : {}}>
        {task.title}
      </span>
      <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: priority.bg, color: priority.color}}>
        <Flag size={10} />
        {priority.label}
      </div>
      {task.due_date && !task.completed && (
        <div className="flex items-center gap-1 text-xs" style={{color: dueColor}}>
          <Calendar size={11} />
          {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
        </div>
      )}
      <div className="flex items-center gap-1 text-xs" style={{color: isRunning ? '#16a34a' : '#94a3b8'}}>
        <Clock size={11} />
        {formatDuration(seconds)}
      </div>
      {!readOnly && !task.completed && (
        <button onClick={() => onToggleTimer(task)}
          className="px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1"
          style={{backgroundColor: isRunning ? '#fef2f2' : '#f0fdf4', color: isRunning ? '#dc2626' : '#16a34a'}}>
          {isRunning ? <Pause size={11} /> : <Play size={11} />}
          {isRunning ? 'Stop' : 'Start'}
        </button>
      )}
      {!readOnly && (
        <button onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded"
          style={{color:'#cbd5e1'}}
          onMouseOver={e => (e.currentTarget as HTMLElement).style.color='#ef4444'}
          onMouseOut={e => (e.currentTarget as HTMLElement).style.color='#cbd5e1'}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
