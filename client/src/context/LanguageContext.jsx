import React, { createContext, useContext, useState, useCallback } from 'react'
import translations from '../i18n/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en')

  const setLang = useCallback((l) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }, [])

  const t = useCallback((key, vars) => {
    const str = translations[lang]?.[key] ?? translations['en']?.[key] ?? key
    if (!vars) return str
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), str)
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
