import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap, Battery, MapPin, Calendar } from 'lucide-react'
import DailyLogList from '@/components/plants/DailyLogList'
import SharePlantButton from '@/components/plants/SharePlantButton'
import type { Plant } from '@/types'

export default async function PlantPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: plant } = await supabase
    .from('plants')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!plant) notFound()

  const isOwner = plant.owner_id === user!.id

  if (!isOwner) {
    const { data: access } = await supabase
      .from('plant_access')
      .select('id')
      .eq('plant_id', params.id)
      .eq('viewer_id', user!.id)
      .single()
    if (!access) notFound()
  }

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('plant_id', params.id)
    .order('log_date', { ascending: false })
    .limit(30)

  return (
    <div>
      {/* Back */}
      <Link href="/dashboard/work" className="btn-ghost mb-6 -ml-2 inline-flex">
        <ArrowLeft size={16} />
        Back to Work
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">{plant.name}</h1>
          {plant.location && (
            <div className="flex items-center gap-1.5 text-surface-500 text-sm mt-1">
              <MapPin size={14} />
              {plant.location}
            </div>
          )}
        </div>
        {isOwner && <SharePlantButton plantId={plant.id} plantName={plant.name} />}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-surface-500 text-xs mb-2">
            <Zap size={13} className="text-amber-500" />
            CAPACITY
          </div>
          <p className="text-2xl font-semibold text-surface-900">{plant.capacity_kw}</p>
          <p className="text-xs text-surface-400 mt-0.5">kW</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-surface-500 text-xs mb-2">
            <Battery size={13} className="text-brand-500" />
            BESS STORAGE
          </div>
          <p className="text-2xl font-semibold text-surface-900">{plant.battery_kwh}</p>
          <p className="text-xs text-surface-400 mt-0.5">kWh</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-surface-500 text-xs mb-2">
            <Calendar size={13} />
            LOG ENTRIES
          </div>
          <p className="text-2xl font-semibold text-surface-900">{logs?.length ?? 0}</p>
          <p className="text-xs text-surface-400 mt-0.5">total</p>
        </div>
      </div>

      {/* Daily logs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-surface-900">Daily logs</h2>
        </div>
        <DailyLogList
          plantId={plant.id}
          userId={user!.id}
          isOwner={isOwner}
          initialLogs={logs || []}
        />
      </div>
    </div>
  )
}
