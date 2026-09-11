'use client'
import { useCallback, useEffect, useState } from 'react'
import { translations, Language, TranslationTree } from './translations'

const STORAGE_KEY = 'language'
const DEFAULT_LANGUAGE: Language = 'da'

function isLanguage(value: string | null): value is Language {
  return value === 'da' || value === 'en' || value === 'tl'
}

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch (e) {
    return DEFAULT_LANGUAGE
  }
}

// Module-level singleton so every mounted component shares the same
// language and re-renders the instant it changes anywhere in the app.
let currentLanguage: Language = readStoredLanguage()
const listeners = new Set<(lang: Language) => void>()

function setGlobalLanguage(lang: Language) {
  currentLanguage = lang
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, lang) } catch (e) {}
  }
  listeners.forEach(listener => listener(lang))
}

function resolveKey(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split('.')
  let node: TranslationTree | string = tree
  for (const part of parts) {
    if (typeof node === 'string') return undefined
    const next: string | TranslationTree | undefined = node[part]
    if (next === undefined) return undefined
    node = next
  }
  return typeof node === 'string' ? node : undefined
}

export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(() => currentLanguage)

  useEffect(() => {
    const listener = (lang: Language) => setLanguageState(lang)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setGlobalLanguage(lang)
  }, [])

  // t(key, fallback) - falls back to the given hardcoded string (or the key
  // itself) if a translation is missing, so nothing breaks if a key is added
  // to a component without a matching translation entry yet.
  const t = useCallback((key: string, fallback?: string): string => {
    const tree = translations[language]
    const value = tree ? resolveKey(tree, key) : undefined
    if (value !== undefined) return value
    return fallback !== undefined ? fallback : key
  }, [language])

  return { t, language, setLanguage }
}
