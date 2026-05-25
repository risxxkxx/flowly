'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProjectList from '@/components/projects/ProjectList'
import TaskList from '@/components/tasks/TaskList'
import { useT } from '@/lib/i18n-context'
import { Loader2 } from 'lucide-react'

export default function ChoresPage() {
  const { t } = useT()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null))
  }, [])

  if (!userId) return <div className="flex items-center justify-center h-64"><Loader2 size={22} className="animate-spin" style={{color:'#cbd5e1'}} /></div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('chores.title')}</h1>
        <p className="mt-1" style={{color:'#94a3b8'}}>{t('chores.subtitle')}</p>
      </div>
      <div className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('chores.projects')}</h2>
        <ProjectList userId={userId} category="chores" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('chores.standaloneTasks')}</h2>
        <TaskList userId={userId} category="chores" />
      </div>
    </div>
  )
}
