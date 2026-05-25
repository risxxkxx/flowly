import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KanbanBoard from '@/components/projects/KanbanBoard'
import InviteButton from '@/components/projects/InviteButton'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects').select('*').eq('id', params.id).single()

  if (!project) notFound()

  const isOwner = project.owner_id === user!.id

  if (!isOwner) {
    const { data: access } = await supabase
      .from('project_access').select('id')
      .eq('project_id', params.id).eq('viewer_id', user!.id).single()
    if (!access) notFound()
  }

  const { data: items } = await supabase
    .from('items').select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })

  const backHref = `/dashboard/${project.category}`

  return (
    <div>
      <Link href={backHref} className="btn-ghost mb-6 -ml-2 inline-flex">
        <ArrowLeft size={16} />
        Back to {project.category === 'work' ? 'Work' : 'Chores'}
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{backgroundColor: project.color}} />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm mt-0.5" style={{color:'#94a3b8'}}>{project.description}</p>
            )}
          </div>
        </div>
        {isOwner && (
          <InviteButton projectId={project.id} projectName={project.name} />
        )}
      </div>

      <KanbanBoard
        projectId={project.id}
        userId={user!.id}
        isOwner={isOwner}
        initialItems={items || []}
      />
    </div>
  )
}
