'use client'
import { createContext, useContext, useState, useEffect } from 'react'

interface ThemeContextType {
  isLightMode: boolean
  toggleLightMode: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isLightMode: false,
  toggleLightMode: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isLightMode, setIsLightMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('mits_light_mode')
    setTimeout(() => {
      if (stored === 'true') {
        setIsLightMode(true)
      }
      setMounted(true)
    }, 0)
  }, [])

  const toggleLightMode = () => {
    const next = !isLightMode
    setIsLightMode(next)
    localStorage.setItem('mits_light_mode', String(next))
  }

  // Prevent flash of unstyled content during hydration
  const value = {
    isLightMode: mounted ? isLightMode : false,
    toggleLightMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
