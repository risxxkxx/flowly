import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import DashboardLayout from '@/components/layout/DashboardLayout'
import I18nProvider from '@/components/layout/I18nProvider'
import { getMessages, type Locale, defaultLocale } from '@/lib/i18n'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cookieStore = cookies()
  const locale = (cookieStore.get('vault_locale')?.value || defaultLocale) as Locale
  const messages = await getMessages(locale)

  const userName = user.user_metadata?.full_name || user.email || 'User'

  return (
    <I18nProvider messages={messages} initialLocale={locale}>
      <DashboardLayout userName={userName} userId={user.id}>{children}</DashboardLayout>
    </I18nProvider>
  )
}
