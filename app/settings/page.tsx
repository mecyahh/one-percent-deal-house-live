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
  role: string | null
  is_agency_owner: boolean | null
  theme?: string | null
  comp?: number | null
  avatar_url?: string | null
}

const THEMES = [
  { key: 'blue', label: 'Blue' },
  { key: 'gold', label: 'Gold' },
  { key: 'green', label: 'Green' },
  { key: 'red', label: 'Red' },
  { key: 'mono', label: 'Mono' },
] as const

const COMP_VALUES = Array.from({ length: 21 }, (_, i) => i * 5) // 0..100

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'profile' | 'agents'>('profile')

  const [me, setMe] = useState<Profile | null>(null)

  // profile fields
  const [pFirst, setPFirst] = useState('')
  const [pLast, setPLast] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pAvatarUrl, setPAvatarUrl] = useState<string>('')

  // agents
  const [agents, setAgents] = useState<Profile[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [search, setSearch] = useState('')

  const [invite, setInvite] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'agent' as 'agent' | 'admin',
    is_agency_owner: false,
    upline_id: '',
    comp: 70,
    theme: 'blue',
  })

  useEffect(() => {
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function boot() {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (!uid) {
      window.location.href = '/login'
      return
    }

    const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (error || !prof) {
      setToast('Profile missing (profiles table)')
      return
    }

    const p = prof as Profile
    setMe(p)
    setPFirst(p.first_name || '')
    setPLast(p.last_name || '')
    setPEmail(p.email || '')
    setPAvatarUrl(p.avatar_url || '')

    if (isOwnerOrAdmin(p)) {
      setTab('agents')
      loadAgents()
    } else {
      setTab('profile')
    }
  }

  function isOwnerOrAdmin(p: Profile | null) {
    if (!p) return false
    return p.role === 'admin' || p.is_agency_owner === true
  }

  async function loadAgents() {
    setLoadingAgents(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,first_name,last_name,role,is_agency_owner,theme,comp,avatar_url')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) setToast('Could not load agents')
    setAgents((data || []) as Profile[])
    setLoadingAgents(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agents
    return agents.filter((a) => {
      const b = [a.first_name, a.last_name, a.email].filter(Boolean).join(' ').toLowerCase()
      return b.includes(q)
    })
  }, [agents, search])

  const uplineOptions = useMemo(() => {
    return agents
      .slice()
      .sort((a, b) => {
        const an = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
        const bn = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
        return an.localeCompare(bn)
      })
      .map((a) => ({
        id: a.id,
        label: `${(a.first_name || '').trim()} ${(a.last_name || '').trim()}${a.email ? ` • ${a.email}` : ''}`.trim(),
      }))
  }, [agents])

  async function saveProfile() {
    if (!me) return
    const payload = {
      first_name: pFirst.trim() || null,
      last_name: pLast.trim() || null,
      email: pEmail.trim() || null,
      avatar_url: pAvatarUrl || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', me.id)
    if (error) return setToast('Save failed')
    setToast('Saved ✅')
    boot()
  }

  async function uploadAvatar(file: File) {
    if (!me) return
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `avatars/${me.id}.${ext}`

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) throw new Error(upErr.message)

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl

      setPAvatarUrl(publicUrl)

      const { error: profErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', me.id)
      if (profErr) throw new Error(profErr.message)

      setToast('Profile picture updated ✅')
      boot()
    } catch (e: any) {
      setToast(e?.message || 'Upload failed (create Storage bucket: avatars)')
    }
  }

  async function authHeader() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? `Bearer ${token}` : ''
  }

  async function inviteAgent() {
    const token = await authHeader()
    if (!token) return setToast('Not logged in')

    const body = {
      email: invite.email,
      first_name: invite.first_name,
      last_name: invite.last_name,
      role: invite.role,
      is_agency_owner: invite.is_agency_owner,
      upline_id: invite.upline_id || null,
      comp: invite.comp,
      theme: invite.theme,
    }

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok) return setToast(json.error || 'Invite failed')

    setToast('Invite sent ✅')
    setInvite({
      first_name: '',
      last_name: '',
      email: '',
      role: 'agent',
      is_agency_owner: false,
      upline_id: '',
      comp: 70,
      theme: 'blue',
    })
    loadAgents()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
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
            <p className="text-sm text-white/60 mt-1">Profile + Internal agent invites.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('profile')}
              className={[tabBtn, tab === 'profile' ? tabOn : tabOff].join(' ')}
            >
              Profile
            </button>

            {isOwnerOrAdmin(me) && (
              <button
                onClick={() => setTab('agents')}
                className={[tabBtn, tab === 'agents' ? tabOn : tabOff].join(' ')}
              >
                Agents
              </button>
            )}

            <button onClick={logout} className={logoutBtn}>
              Log Out
            </button>
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

             {/* Profile Picture Upload */}
<Field label="Profile Picture">
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setToast('Upload failed')
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)

      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', me.id)

      setToast('Profile picture updated ✅')
      boot()
    }}
  />
</Field>
                  <div className="text-[11px] text-white/55 mt-2">Uploads to Supabase Storage bucket: <b>avatars</b></div>
                </div>
              </Field>
            </div>

            <button onClick={saveProfile} className={saveWide}>
              Save Profile
            </button>
          </div>
        )}

        {/* AGENTS */}
        {tab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="text-sm font-semibold mb-4">Add Agent (Invite Email)</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First Name">
                  <input className={inputCls} value={invite.first_name} onChange={(e) => setInvite((p) => ({ ...p, first_name: e.target.value }))} />
                </Field>

                <Field label="Last Name">
                  <input className={inputCls} value={invite.last_name} onChange={(e) => setInvite((p) => ({ ...p, last_name: e.target.value }))} />
                </Field>

                <Field label="Email">
                  <input className={inputCls} value={invite.email} onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))} />
                </Field>

                <Field label="Upline (optional)">
                  <select className={inputCls} value={invite.upline_id} onChange={(e) => setInvite((p) => ({ ...p, upline_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {uplineOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Comp %">
                  <select className={inputCls} value={invite.comp} onChange={(e) => setInvite((p) => ({ ...p, comp: Number(e.target.value) }))}>
                    {COMP_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Theme">
                  <select className={inputCls} value={invite.theme} onChange={(e) => setInvite((p) => ({ ...p, theme: e.target.value }))}>
                    {THEMES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Role">
                  <select className={inputCls} value={invite.role} onChange={(e) => setInvite((p) => ({ ...p, role: e.target.value as any }))}>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>

                <Field label="Agency Owner">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={invite.is_agency_owner}
                      onChange={(e) => setInvite((p) => ({ ...p, is_agency_owner: e.target.checked }))}
                      className="h-5 w-5"
                    />
                    <div className="text-sm">Mark as Owner</div>
                  </div>
                </Field>
              </div>

              <button onClick={inviteAgent} className={saveWide}>
                Send Invite
              </button>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold">Agents</div>
                  <div className="text-xs text-white/55 mt-1">Everyone in your agency.</div>
                </div>
                <button onClick={loadAgents} className={btnSoft}>
                  Refresh
                </button>
              </div>

              <div className="glass rounded-2xl border border-white/10 px-3 py-2 flex items-center gap-2 mb-4">
                <input
                  className="bg-transparent outline-none text-sm w-full placeholder:text-white/40"
                  placeholder="Search agents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loadingAgents && <div className="text-sm text-white/60">Loading…</div>}

              {!loadingAgents && (
                <div className="rounded-2xl border border-white/10 overflow-hidden max-h-[520px] overflow-auto">
                  {filtered.map((a) => (
                    <div key={a.id} className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          {(a.first_name || '—')} {(a.last_name || '')}
                          {a.is_agency_owner ? (
                            <span className="ml-2 text-[10px] px-2 py-1 rounded-xl border bg-white/5 border-white/10 text-white/70">
                              Owner
                            </span>
                          ) : null}
                          {a.role === 'admin' ? (
                            <span className="ml-2 text-[10px] px-2 py-1 rounded-xl border bg-white/5 border-white/10 text-white/70">
                              Admin
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-white/55 mt-1">{a.email || '—'}</div>
                      </div>

                      <div className="text-xs text-white/65">
                        <span className="px-2 py-1 rounded-xl border border-white/10 bg-white/5">
                          Comp {Number(a.comp || 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && <div className="px-4 py-6 text-sm text-white/60">No agents.</div>}
                </div>
              )}
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

const saveWide =
  'mt-5 w-full rounded-2xl bg-green-600 hover:bg-green-500 transition px-4 py-3 text-sm font-semibold'

const tabBtn = 'rounded-2xl border px-4 py-2 text-sm font-semibold transition'
const tabOn = 'bg-white/10 border-white/15'
const tabOff = 'bg-white/5 border-white/10 hover:bg-white/10'

const logoutBtn =
  'rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-2 text-sm font-semibold'
