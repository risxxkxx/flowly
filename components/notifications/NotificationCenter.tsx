'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, Clock, Flag, Loader2, X } from 'lucide-react'
import { addDays, format, isBefore, isSameDay, isThisWeek, parseISO } from 'date-fns'
import type { Priority } from '@/types'
import { useT } from '@/lib/i18n-context'

type TaskRow = {
  id: string
  title: string
  completed: boolean
  due_date: string | null
  priority: Priority | null
  timer_started_at: string | null
  project_id: string | null
}

type ItemRow = {
  id: string
  title: string
  status: 'todo' | 'inprogress' | 'done'
  item_date: string | null
  priority: Priority | null
  timer_started_at: string | null
  project_id: string | null
}

type ProjectRow = {
  id: string
  name: string
}

type FlowlyNotification = {
  id: string
  title: string
  message: string
  type: 'due_today' | 'overdue' | 'high_priority' | 'timer'
  href?: string
  createdAt: string
}

const STORAGE_PREFIX = 'flowly-notifications'

function dateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDate(value: string | null) {
  return value ? parseISO(`${value}T00:00:00`) : null
}

function hoursSince(value: string) {
  return (Date.now() - new Date(value).getTime()) / 1000 / 60 / 60
}

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function setStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

async function ensureServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/flowly-sw.js')
  } catch {
    return null
  }
}

async function showBrowserNotification(notification: FlowlyNotification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const registration = await ensureServiceWorker()
  if (registration?.showNotification) {
    await registration.showNotification(notification.title, {
      body: notification.message,
      tag: notification.id,
      data: { url: notification.href || '/dashboard' },
      icon: '/favicon.ico',
    })
    return
  }

  const browserNotification = new Notification(notification.title, {
    body: notification.message,
    tag: notification.id,
  })
  browserNotification.onclick = () => {
    window.focus()
    if (notification.href) window.location.href = notification.href
  }
}


function notificationText(locale: 'en' | 'mk') {
  const mk = locale === 'mk'
  return {
    inProject: (projectName: string) => mk ? ` во ${projectName}` : ` in ${projectName}`,
    date: (date: Date) => mk ? format(date, 'dd.MM') : format(date, 'MMM d'),
    taskOverdueTitle: mk ? 'Задача со поминат рок' : 'Overdue task',
    taskDueTodayTitle: mk ? 'Задача со рок денес' : 'Task due today',
    itemOverdueTitle: mk ? 'Ставка со поминат рок' : 'Overdue board item',
    itemDueTodayTitle: mk ? 'Ставка со рок денес' : 'Board item due today',
    highPriorityTitle: mk ? 'Висок приоритет оваа недела' : 'High priority this week',
    timerTitle: mk ? 'Тајмерот сè уште работи' : 'Timer still running',
    overdueMessage: (title: string, context: string, date: Date) => mk
      ? `${title}${context} имаше рок до ${format(date, 'dd.MM')}.`
      : `${title}${context} was due on ${format(date, 'MMM d')}.`,
    todayMessage: (title: string, context: string) => mk
      ? `${title}${context} има рок денес.`
      : `${title}${context} is due today.`,
    highPriorityMessage: (title: string, context: string, date: Date) => mk
      ? `${title}${context} е со висок приоритет и има рок до ${format(date, 'dd.MM')}.`
      : `${title}${context} is high priority and due ${format(date, 'MMM d')}.`,
    timerMessage: (title: string, context: string) => mk
      ? `${title}${context} се следи повеќе од 4 часа.`
      : `${title}${context} has been tracking for more than 4 hours.`,
  }
}

function buildNotifications(tasks: TaskRow[], items: ItemRow[], projects: ProjectRow[], locale: 'en' | 'mk') {
  const copy = notificationText(locale)
  const today = dateOnly()
  const projectNames = new Map(projects.map(project => [project.id, project.name]))
  const generated: FlowlyNotification[] = []
  const todayKey = format(today, 'yyyy-MM-dd')

  tasks.forEach(task => {
    const dueDate = parseDate(task.due_date)
    const projectName = task.project_id ? projectNames.get(task.project_id) : null
    const context = projectName ? copy.inProject(projectName) : ''
    const href = task.project_id ? `/dashboard/projects/${task.project_id}` : '/dashboard/work'

    if (!task.completed && dueDate) {
      if (isBefore(dueDate, today)) {
        generated.push({
          id: `task-overdue-${task.id}-${todayKey}`,
          title: copy.taskOverdueTitle,
          message: copy.overdueMessage(task.title, context, dueDate),
          type: 'overdue',
          href,
          createdAt: new Date().toISOString(),
        })
      } else if (isSameDay(dueDate, today)) {
        generated.push({
          id: `task-today-${task.id}-${todayKey}`,
          title: copy.taskDueTodayTitle,
          message: copy.todayMessage(task.title, context),
          type: 'due_today',
          href,
          createdAt: new Date().toISOString(),
        })
      } else if (task.priority === 'high' && isThisWeek(dueDate, { weekStartsOn: 1 }) && isBefore(dueDate, addDays(today, 7))) {
        generated.push({
          id: `task-high-${task.id}-${todayKey}`,
          title: copy.highPriorityTitle,
          message: copy.highPriorityMessage(task.title, context, dueDate),
          type: 'high_priority',
          href,
          createdAt: new Date().toISOString(),
        })
      }
    }

    if (!task.completed && task.timer_started_at && hoursSince(task.timer_started_at) >= 4) {
      generated.push({
        id: `task-timer-${task.id}-${todayKey}`,
        title: copy.timerTitle,
        message: copy.timerMessage(task.title, context),
        type: 'timer',
        href,
        createdAt: new Date().toISOString(),
      })
    }
  })

  items.forEach(item => {
    const dueDate = parseDate(item.item_date)
    const projectName = item.project_id ? projectNames.get(item.project_id) : null
    const context = projectName ? copy.inProject(projectName) : ''
    const href = item.project_id ? `/dashboard/projects/${item.project_id}` : '/dashboard/work'

    if (item.status !== 'done' && dueDate) {
      if (isBefore(dueDate, today)) {
        generated.push({
          id: `item-overdue-${item.id}-${todayKey}`,
          title: copy.itemOverdueTitle,
          message: copy.overdueMessage(item.title, context, dueDate),
          type: 'overdue',
          href,
          createdAt: new Date().toISOString(),
        })
      } else if (isSameDay(dueDate, today)) {
        generated.push({
          id: `item-today-${item.id}-${todayKey}`,
          title: copy.itemDueTodayTitle,
          message: copy.todayMessage(item.title, context),
          type: 'due_today',
          href,
          createdAt: new Date().toISOString(),
        })
      } else if (item.priority === 'high' && isThisWeek(dueDate, { weekStartsOn: 1 }) && isBefore(dueDate, addDays(today, 7))) {
        generated.push({
          id: `item-high-${item.id}-${todayKey}`,
          title: copy.highPriorityTitle,
          message: copy.highPriorityMessage(item.title, context, dueDate),
          type: 'high_priority',
          href,
          createdAt: new Date().toISOString(),
        })
      }
    }

    if (item.status !== 'done' && item.timer_started_at && hoursSince(item.timer_started_at) >= 4) {
      generated.push({
        id: `item-timer-${item.id}-${todayKey}`,
        title: copy.timerTitle,
        message: copy.timerMessage(item.title, context),
        type: 'timer',
        href,
        createdAt: new Date().toISOString(),
      })
    }
  })

  const priorityOrder: Record<FlowlyNotification['type'], number> = {
    overdue: 0,
    due_today: 1,
    timer: 2,
    high_priority: 3,
  }

  return generated.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type])
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const { locale } = useT()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<FlowlyNotification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [pushedIds, setPushedIds] = useState<string[]>([])
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

  const storageKey = `${STORAGE_PREFIX}-${userId}`
  const pushedKey = `${STORAGE_PREFIX}-pushed-${userId}`
  const copy = locale === 'mk' ? {
    title: 'Flowly известувања',
    unread: (count: number) => `${count} непрочитани`,
    markAll: 'Прочитани',
    markAllTitle: 'Означи ги сите како прочитани',
    enabled: 'Browser известувањата се вклучени',
    blocked: 'Browser известувањата се блокирани. Вклучи ги во поставките на browser-от.',
    unsupported: 'Овој browser не поддржува известувања.',
    enable: 'Вклучи browser push известувања',
    emptyTitle: 'Нема известувања',
    emptyDesc: 'Роковите и долгите активни тајмери ќе се прикажат тука.',
    titleAttr: 'Известувања',
  } : {
    title: 'Flowly notifications',
    unread: (count: number) => `${count} unread`,
    markAll: 'Read',
    markAllTitle: 'Mark all read',
    enabled: 'Browser notifications enabled',
    blocked: 'Browser notifications are blocked. Enable them in your browser settings.',
    unsupported: 'This browser does not support notifications.',
    enable: 'Enable browser push notifications',
    emptyTitle: 'No notifications',
    emptyDesc: 'Deadlines and long-running timers will show up here.',
    titleAttr: 'Notifications',
  }

  useEffect(() => {
    setReadIds(getStorage<string[]>(storageKey, []))
    setPushedIds(getStorage<string[]>(pushedKey, []))
    setPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported')
  }, [storageKey, pushedKey])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function loadNotifications() {
      const [{ data: tasks }, { data: items }, { data: projects }] = await Promise.all([
        supabase.from('tasks').select('id, title, completed, due_date, priority, timer_started_at, project_id').eq('user_id', userId),
        supabase.from('items').select('id, title, status, item_date, priority, timer_started_at, project_id').eq('user_id', userId),
        supabase.from('projects').select('id, name').eq('owner_id', userId),
      ])

      if (!mounted) return
      setNotifications(buildNotifications((tasks || []) as TaskRow[], (items || []) as ItemRow[], (projects || []) as ProjectRow[], locale))
      setLoading(false)
    }

    loadNotifications()
    const interval = window.setInterval(loadNotifications, 60000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [userId, locale])

  const unread = useMemo(() => notifications.filter(notification => !readIds.includes(notification.id)), [notifications, readIds])

  useEffect(() => {
    if (permission !== 'granted' || loading) return
    const nextToPush = unread.filter(notification => !pushedIds.includes(notification.id)).slice(0, 3)
    if (nextToPush.length === 0) return

    nextToPush.forEach(notification => {
      showBrowserNotification(notification).catch(() => undefined)
    })

    const updated = Array.from(new Set([...pushedIds, ...nextToPush.map(notification => notification.id)])).slice(-200)
    setPushedIds(updated)
    setStorage(pushedKey, updated)
  }, [permission, loading, unread, pushedIds, pushedKey])

  async function enableBrowserNotifications() {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    await ensureServiceWorker()
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  function markAllAsRead() {
    const next = Array.from(new Set([...readIds, ...notifications.map(notification => notification.id)])).slice(-300)
    setReadIds(next)
    setStorage(storageKey, next)
  }

  function markOneAsRead(id: string) {
    const next = Array.from(new Set([...readIds, id])).slice(-300)
    setReadIds(next)
    setStorage(storageKey, next)
  }

  return (
    <div ref={rootRef} className="relative">
      <button onClick={() => setOpen(value => !value)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all"
        style={{backgroundColor: open ? '#f1f5f9' : 'transparent', color:'#64748b'}}
        title={copy.titleAttr}>
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
            style={{backgroundColor:'#dc2626', color:'#fff'}}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 bottom-24 w-[calc(100vw-2rem)] max-w-sm card shadow-xl z-50 overflow-hidden max-h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:'1px solid #f1f5f9'}}>
            <div>
              <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
              <p className="text-xs" style={{color:'#94a3b8'}}>{copy.unread(unread.length)}</p>
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button onClick={markAllAsRead} className="btn-ghost px-2 py-1 text-xs" title={copy.markAllTitle}>
                  <Check size={13} />
                  {copy.markAll}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X size={15} /></button>
            </div>
          </div>

          <div className="px-4 py-3" style={{borderBottom:'1px solid #f1f5f9'}}>
            {permission === 'granted' ? (
              <div className="flex items-center gap-2 text-xs" style={{color:'#16a34a'}}>
                <Bell size={13} /> {copy.enabled}
              </div>
            ) : permission === 'denied' ? (
              <p className="text-xs" style={{color:'#dc2626'}}>{copy.blocked}</p>
            ) : permission === 'unsupported' ? (
              <p className="text-xs" style={{color:'#94a3b8'}}>{copy.unsupported}</p>
            ) : (
              <button onClick={enableBrowserNotifications} className="btn-secondary w-full py-2 text-xs">
                <Bell size={13} /> {copy.enable}
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,calc(100vh-18rem))] overflow-y-auto">
            {loading ? (
              <div className="p-6 flex items-center justify-center"><Loader2 size={18} className="animate-spin" style={{color:'#cbd5e1'}} /></div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-gray-900">{copy.emptyTitle}</p>
                <p className="text-xs mt-1" style={{color:'#94a3b8'}}>{copy.emptyDesc}</p>
              </div>
            ) : (
              notifications.map(notification => {
                const isRead = readIds.includes(notification.id)
                const Icon = notification.type === 'timer' ? Clock : notification.type === 'high_priority' ? Flag : Bell
                const color = notification.type === 'overdue' ? '#dc2626' : notification.type === 'due_today' ? '#d97706' : notification.type === 'timer' ? '#16a34a' : '#4f46e5'
                return (
                  <a key={notification.id} href={notification.href || '/dashboard'} onClick={() => { markOneAsRead(notification.id); setOpen(false) }}
                    className="block px-4 py-3 transition-all hover:bg-gray-50"
                    style={{borderBottom:'1px solid #f8fafc', opacity: isRead ? 0.62 : 1}}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:'#f8fafc', color}}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                          {!isRead && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#dc2626'}} />}
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{color:'#64748b'}}>{notification.message}</p>
                      </div>
                    </div>
                  </a>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
