import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
          <Shield size={17} className="text-white" />
        </div>
        <span className="font-semibold text-lg text-gray-900 tracking-tight">Flowly</span>
      </Link>
      {children}
    </div>
  )
}
