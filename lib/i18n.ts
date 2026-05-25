export type Locale = 'en' | 'mk'
export const locales: Locale[] = ['en', 'mk']
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  mk: 'Македонски',
}

export async function getMessages(locale: Locale) {
  return (await import(`../messages/${locale}.json`)).default
}

export function createT(messages: Record<string, any>) {
  return function t(key: string): string {
    const parts = key.split('.')
    let val: any = messages
    for (const p of parts) {
      val = val?.[p]
    }
    return typeof val === 'string' ? val : key
  }
}
