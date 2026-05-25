'use client'

import { useState, ReactNode } from 'react'
import { I18nContext } from '@/lib/i18n-context'
import { createT, type Locale } from '@/lib/i18n'

interface Props {
  children: ReactNode
  messages: Record<string, any>
  initialLocale: Locale
}

export default function I18nProvider({ children, messages: initialMessages, initialLocale }: Props) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState(initialMessages)

  async function setLocale(newLocale: Locale) {
    const mod = await import(`@/messages/${newLocale}.json`)
    setMessages(mod.default)
    setLocaleState(newLocale)
    document.cookie = `vault_locale=${newLocale};path=/;max-age=31536000`
  }

  const t = createT(messages)

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}
