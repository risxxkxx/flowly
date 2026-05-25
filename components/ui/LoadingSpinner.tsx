import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={22} className="animate-spin" style={{color:'#cbd5e1'}} />
      <p className="text-sm" style={{color:'#94a3b8'}}>{text}</p>
    </div>
  )
}
