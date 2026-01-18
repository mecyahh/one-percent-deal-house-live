// ✅ FILE: /app/settings/page.tsx  (REPLACE ENTIRE FILE)
// Role-based tabs + Theme propagation + Settings lock + Discord webhook (owner/admin only)

'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  is_agency_owner: boolean | null
  upline_id: string | null
  theme: string | null
  avatar_url: string | null
  discord_webhook_url?: string | null
}

const THEMES = [
  { key: 'blue', label: 'Grey / Blue / White' },
  { key: 'gold', label: 'Grey / Gold / Black & White' },
  { key: 'green', label: 'Grey / Green / White' },
  { key: 'red', label: 'Grey / Red / Black & White' },
  { key: 'mono', label: 'Grey / White' },
  { key: 'fuchsia', label: 'Grey / Fuchsia' },
  { key: 'bw', label: 'White / Black' },
  { key: 'orange', label: 'Grey / Orange' },
] as const

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null)
  const [me, setMe] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'profile' | 'agency' | 'security'>('profile')

  // profile
  const [pFirst, setPFirst] = useState('')
  const [pLast, setPLast] = useState('')
  const [pEmail, setPEmail] = useState('')

  // agency (owner/admin)
  const [themePick, setThemePick] = useState('blue')
  const [propagateBusy, setPropagateBusy] = useState(false)

  // webhook (owner/admin)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookBusy, setWebhookBusy] = useState(false)

  useEffect(() => {
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAdmin = useMemo(() => (me?.role || '').toLowerCase() === 'admin', [me?.role])
  const isOwner = useMemo(() => !!me?.is_agency_owner, [me?.is_agency_owner])
  const isOwnerOrAdmin = useMemo(() => isOwner || isAdmin, [isOwner, isAdmin])

  const tabs = useMemo(() => {
    const base: { key: any; label: string; show: boolean }[] = [
      { key: 'profile', label: 'Profile', show: true },
      { key: 'security', label: 'Security', show: true },
      { key: 'agency', label: 'Agency', show: isOwnerOrAdmin },
    ]
    return base.filter((t) => t.show)
  }, [isOwnerOrAdmin])

  async function boot() {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (!uid) {
      window.location.href = '/login'
      return
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('id,email,first_name,last_name,role,is_agency_owner,upline_id,theme,avatar_url,discord_webhook_url')
      .eq('id', uid)
      .single()

    if (!prof) return

    const p = prof as Profile
    setMe(p)

    setPFirst(p.first_name || '')
    setPLast(p.last_name || '')
    setPEmail(p.email || '')

    setThemePick(p.theme || 'blue')
    setWebhookUrl((p as any).discord_webhook_url || '')

    // if agent, keep them on profile
    setTab((p.is_agency_owner || (p.role || '').toLowerCase() === 'admin') ? 'agency' : 'profile')
  }

  async function authHeader() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? `Bearer ${token}` : ''
  }

  async function saveProfile() {
    if (!me) return
    const payload = {
      first_name: pFirst.trim() || null,
      last_name: pLast.trim() || null,
      email: pEmail.trim() || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', me.id)
    if (error) return setToast('Save failed')
    setToast('Profile saved ✅')
    boot()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Theme: save for me
  async function saveThemeForMe() {
    if (!me) return
    if (!isOwnerOrAdmin) return setToast('Locked: owners/admin only')

    const { error } = await supabase.from('profiles').update({ theme: themePick }).eq('id', me.id)
    if (error) return setToast('Theme save failed')

    setToast('Theme saved ✅')
    boot()
  }

  // Theme: propagate to downlines (server)
  async function propagateThemeToDownlines() {
    if (!isOwnerOrAdmin) return setToast('Locked: owners/admin only')

    setPropagateBusy(true)
    try {
      const token = await authHeader()
      if (!token) return setToast('Not logged in')

      const res = await fetch('/api/admin/propagate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ theme: themePick }),
      })

      const json = await res.json()
      if (!res.ok) return setToast(json.error || 'Propagate failed')

      setToast(`Theme pushed ✅ (${json.updated} users)`)
      boot()
    } finally {
      setPropagateBusy(false)
    }
  }

  async function saveDiscordWebhook() {
    if (!me) return
    if (!isOwnerOrAdmin) return setToast('Locked: owners/admin only')

    setWebhookBusy(true)
    try {
      // store in profiles.discord_webhook_url (text)
      const clean = webhookUrl.trim()
      const { error } = await supabase.from('profiles').update({ discord_webhook_url: clean || null }).eq('id', me.id)
      if (error) return setToast('Webhook save failed')

      setToast('Webhook saved ✅')
      boot()
    } finally {
      setWebhookBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className="glass px-5 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="text-sm font-semibold">{toast}</div>
            <div className="mt-3 flex gap-2">
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
            <p className="text-sm text-white/60 mt-1">
              {isOwnerOrAdmin ? 'Owner/Admin controls unlocked.' : 'Agent mode: locked settings.'}
            </p>
          </div>

          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                  tab === t.key ? 'bg-white/10 border-white/15' : 'bg-white/5 border-white/10 hover:bg-white/10',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="text-sm font-semibold mb-4">My Profile</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name">
                <input className={inputCls} value={pFirst} onChange={(e) => setPFirst(e.target.value)} />
              </Field>

              <Field label="Last Name">
                <input className={inputCls} value={pLast} onChange={(e) => setPLast(e.target.value)} />
              </Field>

              <Field label="Email">
                <input className={inputCls} value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
              </Field>

              <Field label="Profile Picture (Upload)">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-white/70
                    file:mr-4 file:rounded-xl file:border-0
                    file:bg-white/10 file:px-4 file:py-2
                    file:text-sm file:font-semibold
                    hover:file:bg-white/20 transition"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !me) return

                    const ext = file.name.split('.').pop()
                    const path = `${me.id}.${ext}`

                    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
                    if (uploadError) return setToast('Upload failed')

                    const { data } = supabase.storage.from('avatars').getPublicUrl(path)

                    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', me.id)
                    setToast('Profile picture updated ✅')
                    boot()
                  }}
                />
              </Field>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={saveProfile} className={saveBtn}>
                Save Profile
              </button>
              <button onClick={logout} className={dangerBtn}>
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* AGENCY (OWNER/ADMIN ONLY) */}
        {tab === 'agency' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* THEMES */}
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="text-sm font-semibold">Themes</div>
              <div className="text-xs text-white/55 mt-1">
                Set your theme, then optionally push it to all downlines (propagation).
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4">
                <Field label="Select Theme">
                  <select className={inputCls} value={themePick} onChange={(e) => setThemePick(e.target.value)}>
                    {THEMES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex gap-3">
                  <button onClick={saveThemeForMe} className={saveBtn}>
                    Save Theme
                  </button>

                  <button
                    onClick={propagateThemeToDownlines}
                    disabled={propagateBusy}
                    className={[
                      'rounded-2xl border border-white/10 bg-fuchsia-600/70 hover:bg-fuchsia-600 transition px-5 py-3 text-sm font-semibold',
                      propagateBusy ? 'opacity-60 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    Push Theme to Downlines
                  </button>
                </div>
              </div>
            </div>

            {/* DISCORD WEBHOOK */}
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="text-sm font-semibold">Discord Webhook</div>
              <div className="text-xs text-white/55 mt-1">
                When agents post deals, we send a message to this webhook. Downlines inherit webhook from their upline chain.
              </div>

              <div className="mt-5">
                <Field label="Webhook URL">
                  <input
                    className={inputCls}
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </Field>

                <button
                  onClick={saveDiscordWebhook}
                  disabled={webhookBusy}
                  className={[saveBtn, webhookBusy ? 'opacity-60 cursor-not-allowed' : ''].join(' ')}
                >
                  Save Webhook
                </button>

                <div className="text-[11px] text-white/50 mt-3">
                  Tip: agents never see this URL (stored in Supabase only).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY (LOCK EXPLAINER) */}
        {tab === 'security' && (
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="text-sm font-semibold">Locked Settings</div>
            <div className="text-xs text-white/55 mt-1">
              Agents can’t change agency-wide settings (themes/webhooks). Only Owners/Admins can.
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <div className="font-semibold">Your access level</div>
              <div className="mt-2">
                {isOwner ? 'Agency Owner ✅' : isAdmin ? 'Admin ✅' : 'Agent'}
              </div>
            </div>
          </div>
        )}
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

const saveBtn =
  'mt-4 rounded-2xl bg-green-600 hover:bg-green-500 transition px-5 py-3 text-sm font-semibold'

const dangerBtn =
  'mt-4 rounded-2xl bg-red-600 hover:bg-red-500 transition px-5 py-3 text-sm font-semibold'
