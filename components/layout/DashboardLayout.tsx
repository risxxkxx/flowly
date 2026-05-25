'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Waves,
  LayoutDashboard,
  Briefcase,
  Home,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n-context'
import NotificationCenter from '@/components/notifications/NotificationCenter'

export default function DashboardLayout({
  children,
  userName,
  userId,
}: {
  children: React.ReactNode
  userName: string
  userId: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useT()

  const navItems = [
    { href: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { href: '/dashboard/work', label: t('nav.work'), icon: Briefcase },
    { href: '/dashboard/chores', label: t('nav.chores'), icon: Home },
  ]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-white flex-col"
        style={{ borderRight: '1px solid #e2e8f0' }}
      >
        <div
          className="flex items-center gap-2.5 px-5 py-5"
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Waves size={15} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">
            Flowly
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/dashboard' ? pathname === href : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={13} className="ml-auto opacity-40" />}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 space-y-0.5" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
              Alerts
            </span>
            <NotificationCenter userId={userId} />
          </div>

          <Link
            href="/dashboard/profile"
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              pathname === '/dashboard/profile'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <User size={15} />
            <span className="truncate">{userName}</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={15} />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white"
        style={{ borderBottom: '1px solid #e2e8f0' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Waves size={15} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">
              Flowly
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationCenter userId={userId} />

            <Link
              href="/dashboard/profile"
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center transition',
                pathname === '/dashboard/profile'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              )}
              aria-label="Profile"
            >
              <User size={16} />
            </Link>

            <button
              onClick={handleSignOut}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="md:pl-56 min-h-screen overflow-y-auto pt-16 md:pt-0 pb-24 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 animate-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white"
        style={{ borderTop: '1px solid #e2e8f0' }}
      >
        <div className="grid grid-cols-3 px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/dashboard' ? pathname === href : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition',
                  active ? 'bg-gray-900 text-white' : 'text-gray-500'
                )}
              >
                <Icon size={18} />
                <span className="truncate max-w-[90px]">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}