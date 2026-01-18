'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { DEFAULT_THEME, THEME_VARS, ThemeKey } from '@/lib/themes'

function applyTheme(theme: ThemeKey) {
  const t = THEME_VARS[theme] || THEME_VARS[DEFAULT_THEME]
  const r = document.documentElement

  r.style.setProperty('--accent', t.accent)
  r.style.setProperty('--accent2', t.accent2)
  r.style.setProperty('--accentText', t.textOnAccent)
  r.style.setProperty('--card', t.card)
  r.style.setProperty('--cardBorder', t.cardBorder)
  r.style.setProperty('--glow', t.glow)

  r.setAttribute('data-theme', theme)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    async function boot() {
      try {
        // default immediately to avoid flash
        applyTheme(DEFAULT_THEME)

        const { data } = await supabase.auth.getSession()
        const uid = data.session?.user?.id
        if (!uid) {
          if (!alive) return
          setReady(true)
          return
        }

        const { data: prof } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', uid)
          .single()

        const theme = (prof?.theme || DEFAULT_THEME) as ThemeKey
        applyTheme(theme)

        // update theme live if session changes
        supabase.auth.onAuthStateChange(async (_evt, session) => {
          const id = session?.user?.id
          if (!id) return applyTheme(DEFAULT_THEME)
          const { data: p } = await supabase.from('profiles').select('theme').eq('id', id).single()
          applyTheme(((p?.theme || DEFAULT_THEME) as ThemeKey) || DEFAULT_THEME)
        })

        if (!alive) return
        setReady(true)
      } catch {
        applyTheme(DEFAULT_THEME)
        if (!alive) return
        setReady(true)
      }
    }

    boot()
    return () => {
      alive = false
    }
  }, [])

  const body = useMemo(() => children, [children])
  if (!ready) return body
  return body
}
