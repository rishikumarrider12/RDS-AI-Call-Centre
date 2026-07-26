'use client'

import { ReactNode, useEffect, useState, useCallback, createContext, useContext } from 'react'

type Theme = 'system' | 'dark' | 'light'

const STORAGE_KEY = 'rds-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (_theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    setTheme(getInitialTheme())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const apply = (resolved: 'dark' | 'light') => {
      root.dataset.theme = resolved
      root.classList.toggle('dark', resolved === 'dark')
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches ? 'dark' : 'light')
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    apply(theme)
  }, [theme])

  const setThemeAndPersist = useCallback(
    (next: Theme) => {
      setTheme(next)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next)
      }
    },
    []
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeAndPersist }}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
