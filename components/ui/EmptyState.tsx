import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="card p-12 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{backgroundColor:'#f8fafc'}}>
        <Icon size={24} style={{color:'#cbd5e1'}} />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm leading-relaxed mb-5" style={{color:'#94a3b8', maxWidth:280, margin:'0 auto 20px'}}>
        {description}
      </p>
      {action}
    </div>
  )
}
