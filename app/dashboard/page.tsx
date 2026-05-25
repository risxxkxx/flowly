'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Home, CheckSquare, ArrowRight, Loader2, Clock, BarChart3 } from 'lucide-react'
import { startOfWeek } from 'date-fns'
import { useT } from '@/lib/i18n-context'

type ProjectHours = {
  projectId: string
  name: string
  seconds: number
}

type Stats = {
  workProjects: number
  choresProjects: number
  openTasks: number
  completedThisWeek: number
  projectHours: ProjectHours[]
}

function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export default function DashboardPage() {
  const { t } = useT()
  const [stats, setStats] = useState<Stats>({ workProjects: 0, choresProjects: 0, openTasks: 0, completedThisWeek: 0, projectHours: [] })
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setFirstName((user.user_metadata?.full_name || user.email || 'there').split(' ')[0])
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()

      const [
        { count: wp },
        { count: cp },
        { count: ot },
        { data: tasks },
        { data: projects },
        { data: items },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('category', 'work'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('category', 'chores'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', false),
        supabase.from('tasks').select('id, project_id, completed, completed_at, total_seconds').eq('user_id', user.id),
        supabase.from('projects').select('id, name').eq('owner_id', user.id),
        supabase.from('items').select('id, project_id, status, completed_at, total_seconds').eq('user_id', user.id),
      ])

      const projectNames = new Map((projects || []).map(project => [project.id, project.name]))
      const secondsByProject = new Map<string, number>()

      ;(tasks || []).forEach(task => {
        if (!task.project_id) return
        secondsByProject.set(task.project_id, (secondsByProject.get(task.project_id) || 0) + (task.total_seconds || 0))
      })

      ;(items || []).forEach(item => {
        if (!item.project_id) return
        secondsByProject.set(item.project_id, (secondsByProject.get(item.project_id) || 0) + (item.total_seconds || 0))
      })

      const completedTasksThisWeek = (tasks || []).filter(task => task.completed && task.completed_at && task.completed_at >= weekStart).length
      const completedItemsThisWeek = (items || []).filter(item => item.status === 'done' && item.completed_at && item.completed_at >= weekStart).length

      const projectHours = Array.from(secondsByProject.entries())
        .map(([projectId, seconds]) => ({ projectId, name: projectNames.get(projectId) || 'Untitled project', seconds }))
        .filter(project => project.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 5)

      setStats({
        workProjects: wp ?? 0,
        choresProjects: cp ?? 0,
        openTasks: ot ?? 0,
        completedThisWeek: completedTasksThisWeek + completedItemsThisWeek,
        projectHours,
      })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={22} className="animate-spin" style={{color:'#cbd5e1'}} /></div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.goodDay')}, {firstName}</h1>
        <p className="mt-1" style={{color:'#94a3b8'}}>{t('dashboard.overview')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('dashboard.workProjects'),   value: stats.workProjects,   icon: Briefcase },
          { label: t('dashboard.choresProjects'), value: stats.choresProjects, icon: Home },
          { label: t('dashboard.openTasks'),      value: stats.openTasks,      icon: CheckSquare },
          { label: 'Done this week',              value: stats.completedThisWeek, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 text-sm mb-3" style={{color:'#94a3b8'}}>
              <Icon size={14} />{label}
            </div>
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5 mb-8">
        <div className="flex items-center gap-2 text-sm font-medium mb-4" style={{color:'#64748b'}}>
          <Clock size={15} /> Hours by project
        </div>
        {stats.projectHours.length === 0 ? (
          <p className="text-sm" style={{color:'#94a3b8'}}>No tracked time yet. Start a timer on a task/item to see statistics here.</p>
        ) : (
          <div className="space-y-3">
            {stats.projectHours.map(project => (
              <div key={project.projectId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-800">{project.name}</span>
                  <span style={{color:'#64748b'}}>{formatDuration(project.seconds)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{backgroundColor:'#f1f5f9'}}>
                  <div className="h-full rounded-full" style={{width: `${Math.max(6, (project.seconds / stats.projectHours[0].seconds) * 100)}%`, backgroundColor:'#16a34a'}} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-xs font-medium uppercase tracking-wider mb-3" style={{color:'#94a3b8'}}>{t('dashboard.sections')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: '/dashboard/work',   icon: Briefcase, color: '#1e293b', bg: '#f8fafc', label: t('nav.work'),   desc: t('dashboard.workDesc') },
          { href: '/dashboard/chores', icon: Home,      color: '#4f46e5', bg: '#eef2ff', label: t('nav.chores'), desc: t('dashboard.choresDesc') },
        ].map(({ href, icon: Icon, color, bg, label, desc }) => (
          <Link key={href} href={href} className="card p-6 group block">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{backgroundColor: bg}}>
              <Icon size={20} style={{color}} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
            <p className="text-sm mb-4" style={{color:'#94a3b8'}}>{desc}</p>
            <div className="flex items-center gap-1 text-sm font-medium" style={{color:'#16a34a'}}>
              {t('dashboard.open')} <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
