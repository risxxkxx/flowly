'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Shield, CheckSquare, FolderOpen, Users, ArrowRight } from 'lucide-react'
import en from '@/messages/en.json'
import mk from '@/messages/mk.json'

type Locale = 'en' | 'mk'

const messages = { en, mk }

function getCookieLocale(): Locale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)vault_locale=(en|mk)/)
  return match?.[1] === 'mk' ? 'mk' : 'en'
}

function saveLocale(locale: Locale) {
  document.cookie = `vault_locale=${locale};path=/;max-age=31536000`
}

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    setLocale(getCookieLocale())
  }, [])

  const t = useMemo(() => messages[locale].landing, [locale])

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    saveLocale(nextLocale)
  }

  const features = [
    {
      icon: FolderOpen,
      title: t.features.projects.title,
      desc: t.features.projects.desc,
    },
    {
      icon: CheckSquare,
      title: t.features.tasks.title,
      desc: t.features.tasks.desc,
    },
    {
      icon: Shield,
      title: t.features.twoWorlds.title,
      desc: t.features.twoWorlds.desc,
    },
    {
      icon: Users,
      title: t.features.share.title,
      desc: t.features.share.desc,
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 sm:px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Shield size={15} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Flowly</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => changeLocale('en')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                locale === 'en'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLocale('mk')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                locale === 'mk'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              MK
            </button>
          </div>

          <Link href="/auth/login" className="btn-ghost">
            {t.signIn}
          </Link>

          <Link href="/auth/register" className="btn-primary">
            {t.startFree}
          </Link>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-gray-900 tracking-tight mb-6 leading-tight">
          {t.title}
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          {t.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/register"
            className="btn-primary w-full sm:w-auto justify-center text-base px-6 py-3"
          >
            {t.startFree} <ArrowRight size={16} />
          </Link>

          <Link
            href="/auth/login"
            className="btn-secondary w-full sm:w-auto justify-center text-base px-6 py-3"
          >
            {t.signIn}
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-400">{t.free}</p>
      </section>

      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-20 sm:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5 sm:p-6">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Icon size={19} className="text-gray-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: '#f1f5f9' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span>Flowly</span>
          </div>
          <span>Plan work. Track time. Stay in flow.</span>
        </div>
      </footer>
    </div>
  )
}