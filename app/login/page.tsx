'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'pin'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [pinSent, setPinSent] = useState(false)
  const [pin, setPin] = useState('')

  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function loginWithPassword() {
    setBusy(true)
    setToast(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (e: any) {
      setToast(e?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendPin() {
    setBusy(true)
    setToast(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Optional: if you want magic link redirects too.
          // emailRedirectTo: `${window.location.origin}/dashboard`,
          shouldCreateUser: false,
        },
      })
      if (error) throw error
      setPinSent(true)
      setToast('6-digit PIN sent to your email ✅')
    } catch (e: any) {
      setToast(e?.message || 'Could not send PIN')
    } finally {
      setBusy(false)
    }
  }

  async function verifyPin() {
    setBusy(true)
    setToast(null)
    try {
      const token = pin.replace(/\D/g, '').slice(0, 6)
      if (token.length !== 6) throw new Error('Enter the 6-digit code')

      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (e: any) {
      setToast(e?.message || 'PIN verification failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-6">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-white/60 mt-1">Access your account.</p>

        {toast && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            {toast}
          </div>
        )}

        {/* Mode toggle */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('password')
              setPinSent(false)
              setPin('')
            }}
            className={[
              'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
              mode === 'password' ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10',
            ].join(' ')}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('pin')
              setPassword('')
            }}
            className={[
              'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
              mode === 'pin' ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10',
            ].join(' ')}
          >
            PIN (6-digit)
          </button>
        </div>

        <div className="mt-5">
          <label className="text-[11px] text-white/60">Email</label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        {mode === 'password' ? (
          <>
            <div className="mt-4">
              <label className="text-[11px] text-white/60">Password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={loginWithPassword}
              disabled={busy}
              className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition bg-[var(--accent)] text-[var(--accentText)] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Logging in…' : 'Log in'}
            </button>

            <a className="mt-4 block text-sm text-white/60 hover:text-white" href="/forgot-password">
              Forgot password?
            </a>
          </>
        ) : (
          <>
            {!pinSent ? (
              <button
                onClick={sendPin}
                disabled={busy}
                className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition bg-[var(--accent)] text-[var(--accentText)] hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Send 6-digit PIN'}
              </button>
            ) : (
              <>
                <div className="mt-4">
                  <label className="text-[11px] text-white/60">Enter PIN</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/10 tracking-widest"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                  />
                </div>

                <button
                  onClick={verifyPin}
                  disabled={busy}
                  className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition bg-[var(--accent)] text-[var(--accentText)] hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Verify & Log in'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPinSent(false)
                    setPin('')
                  }}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Resend PIN
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
