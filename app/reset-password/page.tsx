'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // When user clicks the reset link, Supabase sets a recovery session in the URL hash.
    // The supabase-js client will pick it up automatically in the browser.
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setReady(!!data.session)
      // If session isn't present yet, user may have opened on a different device/browser.
      // They must open the link in the same browser OR you can use "PKCE" style flows later.
    })()
  }, [])

  async function updatePassword() {
    setBusy(true)
    setToast(null)
    try {
      if (password.length < 8) throw new Error('Password must be at least 8 characters')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setToast('Password updated ✅ Redirecting…')
      setTimeout(() => (window.location.href = '/login'), 800)
    } catch (e: any) {
      setToast(e?.message || 'Could not update password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>

        {!ready ? (
          <p className="text-sm text-white/60 mt-3">
            Open the reset link from your email in this same browser.
          </p>
        ) : (
          <p className="text-sm text-white/60 mt-3">Set a new password below.</p>
        )}

        {toast && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            {toast}
          </div>
        )}

        <div className="mt-5">
          <label className="text-[11px] text-white/60">New Password</label>
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            disabled={!ready}
          />
        </div>

        <button
          onClick={updatePassword}
          disabled={busy || !ready}
          className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition bg-[var(--accent)] text-[var(--accentText)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </div>
  )
}
