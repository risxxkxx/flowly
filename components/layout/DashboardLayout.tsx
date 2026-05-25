'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Waves, LayoutDashboard, Briefcase, Home, LogOut, ChevronRight, User } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n-context'
import NotificationCenter from '@/components/notifications/NotificationCenter'

export default function DashboardLayout({ children, userName, userId }: {
  children: React.ReactNode
  userName: string
  userId: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useT()

  const navItems = [
    { href: '/dashboard',        label: t('nav.overview'),  icon: LayoutDashboard },
    { href: '/dashboard/work',   label: t('nav.work'),      icon: Briefcase },
    { href: '/dashboard/chores', label: t('nav.chores'),    icon: Home },
  ]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{backgroundColor:'#f8fafc'}}>
      <aside className="w-56 bg-white flex flex-col flex-shrink-0" style={{borderRight:'1px solid #e2e8f0'}}>
        <div className="flex items-center gap-2.5 px-5 py-5" style={{borderBottom:'1px solid #f1f5f9'}}>
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Waves size={15} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Flowly</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}>
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={13} className="ml-auto opacity-40" />}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 space-y-0.5" style={{borderTop:'1px solid #f1f5f9'}}>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium" style={{color:'#94a3b8'}}>Alerts</span>
            <NotificationCenter userId={userId} />
          </div>
          <Link href="/dashboard/profile"
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              pathname === '/dashboard/profile' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            )}>
            <User size={15} />
            <span className="truncate">{userName}</span>
          </Link>
          <button onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
            style={{color:'#94a3b8'}}
            onMouseOver={e => {(e.currentTarget as HTMLElement).style.backgroundColor='#fef2f2';(e.currentTarget as HTMLElement).style.color='#dc2626'}}
            onMouseOut={e => {(e.currentTarget as HTMLElement).style.backgroundColor='';(e.currentTarget as HTMLElement).style.color='#94a3b8'}}>
            <LogOut size={15} />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 animate-in">
          {children}
        </div>
      </main>
    </div>
  )
}
