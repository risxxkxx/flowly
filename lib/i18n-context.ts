'use client'

import { createContext, useContext } from 'react'
import type { Locale } from './i18n'

export const I18nContext = createContext<{
  t: (key: string) => string
  locale: Locale
  setLocale: (l: Locale) => Promise<void>
}>({
  t: (k) => k,
  locale: 'en',
  setLocale: async () => {},
})

export function useT() {
  return useContext(I18nContext)
}
