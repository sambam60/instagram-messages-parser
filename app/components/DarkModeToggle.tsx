'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const DarkModeToggle: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement
    const initialDarkMode =
      root.classList.contains('dark') ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDarkMode(initialDarkMode)
    if (initialDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const root = window.document.documentElement
    if (isDarkMode) {
      root.classList.remove('dark')
      localStorage.theme = 'light'
    } else {
      root.classList.add('dark')
      localStorage.theme = 'dark'
    }
    setIsDarkMode(!isDarkMode)
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg transition-colors hover:bg-surface-hover text-muted"
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

export default DarkModeToggle
