'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

const DEFAULT_THEME = 'blue'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let alive = true

    async function bootTheme() {
      try {
        // 1️⃣ Try localStorage first (fastest, instant paint)
        const cached = localStorage.getItem('flow-theme')
        if (cached) {
          document.documentElement.dataset.theme = cached
        }

        // 2️⃣ Load user theme from Supabase (source of truth)
        const { data: userRes } = await supabase.auth.getUser()
        const uid = userRes.user?.id
        if (!uid || !alive) return

        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', uid)
          .single()

        const theme = data?.theme || DEFAULT_THEME

        // 3️⃣ Apply + persist
        document.documentElement.dataset.theme = theme
        localStorage.setItem('flow-theme', theme)
      } catch {
        // Safe fallback
        document.documentElement.dataset.theme = DEFAULT_THEME
      }
    }

    bootTheme()

    return () => {
      alive = false
    }
  }, [])

  return <>{children}</>
}
