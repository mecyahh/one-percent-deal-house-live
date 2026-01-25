'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function errMsg(e: any) {
  return e?.message || e?.error_description || e?.error || 'Something failed'
}

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState('Signing you in…')

  useEffect(() => {
    ;(async () => {
      try {
        // Supabase magic links often come back with ?code=... for PKCE
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          window.location.href = '/analytics'
          return
        }

        // If no code exists, just try session and route
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          window.location.href = '/analytics'
          return
        }

        setMsg('No session found. Please return to login.')
      } catch (e: any) {
        setMsg(`Login failed: ${errMsg(e)}`)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center px-6">
      <div className="glass rounded-2xl border border-white/10 p-6 max-w-md w-full">
        <div className="text-lg font-semibold">Flow</div>
        <div className="text-sm text-white/60 mt-2">{msg}</div>
        <button
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-3 text-sm font-semibold"
          onClick={() => (window.location.href = '/login')}
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}
