import Link from 'next/link'
import { Shield, CheckSquare, FolderOpen, Users, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Shield size={15} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Flowly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost">Sign in</Link>
          <Link href="/auth/register" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-6xl font-semibold text-gray-900 tracking-tight mb-6 leading-tight">
          Everything in one place.
        </h1>
        <p className="text-xl text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Manage your work and personal life — projects, tasks, and goals — all under one roof.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/auth/register" className="btn-primary text-base px-6 py-3">
            Start for free <ArrowRight size={16} />
          </Link>
          <Link href="/auth/login" className="btn-secondary text-base px-6 py-3">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">Free · No credit card required</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FolderOpen, title: 'Projects', desc: 'Organize work and personal projects separately.' },
            { icon: CheckSquare, title: 'Tasks', desc: 'Track to-dos with due dates inside each project.' },
            { icon: Shield, title: 'Two worlds', desc: 'Work and Chores — completely separate spaces.' },
            { icon: Users, title: 'Share access', desc: 'Invite others to view your projects read-only.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Icon size={19} className="text-gray-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8" style={{borderColor:'#f1f5f9'}}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span>Flowly</span>
          </div>
          <span>Built with Next.js & Supabase</span>
        </div>
      </footer>
    </div>
  )
}
