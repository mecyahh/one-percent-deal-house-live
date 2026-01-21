'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!alive) return

        if (data?.user) router.replace('/dashboard')
        else router.replace('/login')
      } catch {
        router.replace('/login')
      }
    })()

    return () => {
      alive = false
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
      <div className="glass px-6 py-5 text-sm text-white/80">Loading…</div>
    </div>
  )
}
