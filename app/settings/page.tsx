// /app/settings/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  theme?: string | null
  role?: string | null
  is_agency_owner?: boolean | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const [me, setMe] = useState<Profile | null>(null)

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)

      const { data: u } = await supabase.auth.getUser()
      const user = u.user
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,first_name,last_name,avatar_url,theme,role,is_agency_owner')
        .eq('id', user.id)
        .single()

      if (!alive) return

      if (error || !data) {
        // fallback minimal info from auth
        const fallback: Profile = {
          id: user.id,
          email: user.email || null,
          first_name: null,
          last_name: null,
          avatar_url: null,
        }
        setMe(fallback)
        setFirst('')
        setLast('')
        setEmail(user.email || '')
        setAvatar('')
        setLoading(false)
        return
      }

      const p = data as Profile
      setMe(p)
      setFirst(p.first_name || '')
      setLast(p.last_name || '')
      setEmail(p.email || user.email || '')
      setAvatar(p.avatar_url || '')
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [])

  const displayName = useMemo(() => {
    const nm = `${first.trim()} ${last.trim()}`.trim()
    return nm || email.trim() || 'Agent'
  }, [first, last, email])

  async function save() {
    if (!me) return
    try {
      setToast(null)
      const payload = {
        first_name: first.trim() || null,
        last_name: last.trim() || null,
        email: email.trim() || null,
        avatar_url: avatar.trim() || null,
      }
      const { error } = await supabase.from('profiles').update(payload).eq('id', me.id)
      if (error) throw error
      setToast('Saved ✅')
    } catch (e: any) {
      setToast(e?.message || 'Save failed')
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className="glass px-5 py-4 rounded-2xl border border-white/10 shadow-2xl max-w-[360px]">
            <div className="text-sm font-semibold">{toast}</div>
            <div className="mt-3">
              <button className={btnSoft} onClick={() => setToast(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ml-64 px-10 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-white/60 mt-1">Keep it simple. Profile + logout.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={logout} className={dangerBtn}>
              Log out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="glass rounded-2xl border border-white/10 p-6 lg:col-span-2">
            <div className="text-sm font-semibold mb-4">Profile</div>

            {loading ? (
              <div className="text-sm text-white/60">Loading…</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} />
                  </Field>

                  <Field label="Last Name">
                    <input className={inputCls} value={last} onChange={(e) => setLast(e.target.value)} />
                  </Field>

                  <Field label="Email">
                    <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>

                  <Field label="Profile Picture URL">
                    <input
                      className={inputCls}
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                </div>

                <button onClick={save} className={saveWide}>
                  Save
                </button>
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="text-sm font-semibold mb-4">Preview</div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-white/70">👤</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-base font-semibold truncate">{displayName}</div>
                <div className="text-xs text-white/55 truncate">{email || '—'}</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-1 rounded-xl border bg-white/5 border-white/10 text-white/70">
                    {me?.role || 'agent'}
                  </span>
                  {me?.is_agency_owner ? (
                    <span className="text-[10px] px-2 py-1 rounded-xl border bg-white/5 border-white/10 text-white/70">
                      owner
                    </span>
                  ) : null}
                  {me?.theme ? (
                    <span className="text-[10px] px-2 py-1 rounded-xl border bg-white/5 border-white/10 text-white/70">
                      theme: {me.theme}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/50">
              Next we’ll add: Agents, Positions, Themes (owner only), and internal admin tools.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-white/55 mb-2">{label}</div>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/7'

const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'

const saveWide =
  'mt-5 w-full rounded-2xl bg-green-600 hover:bg-green-500 transition px-4 py-3 text-sm font-semibold'

const dangerBtn =
  'rounded-2xl border border-red-400/25 bg-red-500/10 hover:bg-red-500/15 transition px-4 py-3 text-sm font-semibold text-red-100'
