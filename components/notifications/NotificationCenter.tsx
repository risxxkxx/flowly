'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, X, AlertCircle, Clock, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type NotificationItem = {
  id: string
  title: string
  message: string
  type: 'overdue' | 'today' | 'priority' | 'timer'
  read: boolean
  createdAt: string
}

type Locale = 'en' | 'mk'

export default function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [browserBlocked, setBrowserBlocked] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const locale = useMemo<Locale>(() => {
    if (typeof document === 'undefined') return 'en'
    const match = document.cookie.match(/(?:^|;\s*)vault_locale=(en|mk)/)
    return match?.[1] === 'mk' ? 'mk' : 'en'
  }, [])

  const text = useMemo(() => {
    if (locale === 'mk') {
      return {
        alerts: 'Flowly известувања',
        unread: 'непрочитани',
        markAll: 'Прочитани',
        emptyTitle: 'Нема известувања',
        emptyMessage: 'Сè е во ред засега.',
        browserBlocked:
          'Browser известувањата се блокирани. Вклучи ги во поставките на browser-от.',
        enableBrowser: 'Вклучи browser известувања',
        overdueTitle: 'Задача со поминат рок',
        itemOverdueTitle: 'Ставка со поминат рок',
        dueTodayTitle: 'Задача со рок денес',
        itemDueTodayTitle: 'Ставка со рок денес',
        highPriorityTitle: 'Висок приоритет оваа недела',
        timerTitle: 'Тајмерот сè уште работи',
        taskDue: 'имаше рок до',
        itemDue: 'имаше рок до',
        dueToday: 'има рок денес',
        timerRunning: 'Тајмерот работи повеќе од 4 часа.',
      }
    }

    return {
      alerts: 'Flowly notifications',
      unread: 'unread',
      markAll: 'Read',
      emptyTitle: 'No notifications',
      emptyMessage: 'Everything looks good for now.',
      browserBlocked:
        'Browser notifications are blocked. Enable them in your browser settings.',
      enableBrowser: 'Enable browser notifications',
      overdueTitle: 'Task overdue',
      itemOverdueTitle: 'Item overdue',
      dueTodayTitle: 'Task due today',
      itemDueTodayTitle: 'Item due today',
      highPriorityTitle: 'High priority this week',
      timerTitle: 'Timer still running',
      taskDue: 'was due on',
      itemDue: 'was due on',
      dueToday: 'is due today',
      timerRunning: 'Timer has been running for more than 4 hours.',
    }
  }, [locale])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)
    setBrowserBlocked(Notification.permission === 'denied')

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/flowly-sw.js').catch(() => {
        // Browser notifications still work without breaking the app.
      })
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      const supabase = createClient()
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const weekAhead = new Date(startOfToday)
      weekAhead.setDate(weekAhead.getDate() + 7)

      const [{ data: tasks }, { data: items }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id,title,due_date,completed,priority,timer_started_at')
          .eq('user_id', userId),
        supabase
          .from('items')
          .select('id,title,item_date,status,priority,timer_started_at')
          .eq('user_id', userId),
      ])

      if (cancelled) return

      const generated: NotificationItem[] = []

      ;(tasks || []).forEach((task: any) => {
        if (!task.completed && task.due_date) {
          const due = new Date(`${task.due_date}T00:00:00`)

          if (due < startOfToday) {
            generated.push({
              id: `task-overdue-${task.id}`,
              title: text.overdueTitle,
              message: `${task.title} ${text.taskDue} ${formatDate(task.due_date)}.`,
              type: 'overdue',
              read: false,
              createdAt: new Date().toISOString(),
            })
          } else if (sameDay(due, today)) {
            generated.push({
              id: `task-today-${task.id}`,
              title: text.dueTodayTitle,
              message: `${task.title} ${text.dueToday}.`,
              type: 'today',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }

          if (task.priority === 'high' && due >= startOfToday && due <= weekAhead) {
            generated.push({
              id: `task-priority-${task.id}`,
              title: text.highPriorityTitle,
              message: task.title,
              type: 'priority',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }
        }

        if (task.timer_started_at && isRunningLong(task.timer_started_at)) {
          generated.push({
            id: `task-timer-${task.id}`,
            title: text.timerTitle,
            message: `${task.title} — ${text.timerRunning}`,
            type: 'timer',
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      })

      ;(items || []).forEach((item: any) => {
        if (item.status !== 'done' && item.item_date) {
          const due = new Date(`${item.item_date}T00:00:00`)

          if (due < startOfToday) {
            generated.push({
              id: `item-overdue-${item.id}`,
              title: text.itemOverdueTitle,
              message: `${item.title} ${text.itemDue} ${formatDate(item.item_date)}.`,
              type: 'overdue',
              read: false,
              createdAt: new Date().toISOString(),
            })
          } else if (sameDay(due, today)) {
            generated.push({
              id: `item-today-${item.id}`,
              title: text.itemDueTodayTitle,
              message: `${item.title} ${text.dueToday}.`,
              type: 'today',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }

          if (item.priority === 'high' && due >= startOfToday && due <= weekAhead) {
            generated.push({
              id: `item-priority-${item.id}`,
              title: text.highPriorityTitle,
              message: item.title,
              type: 'priority',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }
        }

        if (item.timer_started_at && isRunningLong(item.timer_started_at)) {
          generated.push({
            id: `item-timer-${item.id}`,
            title: text.timerTitle,
            message: `${item.title} — ${text.timerRunning}`,
            type: 'timer',
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      })

      setNotifications(previous => {
        const readIds = new Set(previous.filter(n => n.read).map(n => n.id))
        return generated.map(n => ({
          ...n,
          read: readIds.has(n.id),
        }))
      })

      maybeShowBrowserNotification(generated, permission)
    }

    loadNotifications()
    const interval = window.setInterval(loadNotifications, 60_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [userId, text, permission])

  async function enableBrowserNotifications() {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    setBrowserBlocked(result === 'denied')
  }

  function markAllAsRead() {
    setNotifications(current => current.map(n => ({ ...n, read: true })))
  }

  function markOneAsRead(id: string) {
    setNotifications(current =>
      current.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    setOpen(false)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(value => !value)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all"
        style={{
          backgroundColor: open ? '#f1f5f9' : 'transparent',
          color: '#64748b',
        }}
        aria-label="Open notifications"
        type="button"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed z-[9999] left-3 right-3 bottom-24 max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-4 sm:right-auto sm:w-[20rem] md:w-[19rem]">
          <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900">{text.alerts}</h3>
              <p className="text-sm text-slate-400">
                {unreadCount} {text.unread}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <Check size={14} />
                  {text.markAll}
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {browserBlocked && (
            <div className="px-4 py-3 text-sm text-red-600 border-b border-slate-100">
              {text.browserBlocked}
            </div>
          )}

          {permission === 'default' && (
            <div className="px-4 py-3 border-b border-slate-100">
              <button
                type="button"
                onClick={enableBrowserNotifications}
                className="w-full rounded-xl bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800 transition"
              >
                {text.enableBrowser}
              </button>
            </div>
          )}

          <div className="max-h-[calc(70vh-9rem)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Bell size={18} className="text-slate-300" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  {text.emptyTitle}
                </h4>
                <p className="text-sm text-slate-400 mt-1">{text.emptyMessage}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markOneAsRead(notification.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: getNotificationStyle(notification.type).bg,
                        color: getNotificationStyle(notification.type).color,
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {notification.title}
                        </p>

                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-slate-500 leading-snug mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
  })
}

function isRunningLong(startedAt: string) {
  const started = new Date(startedAt).getTime()
  const now = Date.now()
  const fourHours = 4 * 60 * 60 * 1000
  return now - started > fourHours
}

function maybeShowBrowserNotification(
  notifications: NotificationItem[],
  permission: NotificationPermission | 'unsupported'
) {
  if (typeof window === 'undefined') return
  if (permission !== 'granted') return
  if (!('Notification' in window)) return

  const unread = notifications[0]
  if (!unread) return

  const key = `flowly_browser_notification_${unread.id}`
  if (sessionStorage.getItem(key)) return

  new Notification(unread.title, {
    body: unread.message,
    icon: '/favicon.ico',
  })

  sessionStorage.setItem(key, '1')
}

function getNotificationStyle(type: NotificationItem['type']) {
  if (type === 'overdue') return { bg: '#fef2f2', color: '#dc2626' }
  if (type === 'today') return { bg: '#fffbeb', color: '#d97706' }
  if (type === 'priority') return { bg: '#eff6ff', color: '#2563eb' }
  return { bg: '#f0fdf4', color: '#16a34a' }
}

function getNotificationIcon(type: NotificationItem['type']) {
  if (type === 'timer') return <Clock size={16} />
  if (type === 'today') return <CalendarDays size={16} />
  return <AlertCircle size={16} />
}