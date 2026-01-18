'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  is_agency_owner: boolean | null
  avatar_url: string | null
}

export default function SettingsPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [toast, setToast] = useState<string | null>(null)

  const [me, setMe] = useState<Profile | null>(null)

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function boot() {
    try {
      setStatus('loading')

      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw new Error(userErr.message)
      const user = userRes.user
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: prof, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (pErr) throw new Error(pErr.message)

      const p = prof as Profile
      setMe(p)

      setFirst(p.first_name || '')
      setLast(p.last_name || '')
      setEmail(p.email || user.email || '')
      setAvatarUrl(p.avatar_url || '')

      setStatus('ready')
    } catch (e: any) {
      setStatus('error')
      setToast(e?.message || 'Settings failed to load')
    }
  }

  async function saveProfile() {
    if (!me) return
    const payload = {
      first_name: first.trim() || null,
      last_name: last.trim() || null,
      email: email.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', me.id)
    if (error) return setToast('Save failed')
    setToast('Saved ✅')
    boot()
  }

  async function uploadAvatar(file: File) {
    setUploading(true)
    try {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        window.location.href = '/login'
        return
      }

      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png',
      })
      if (upErr) throw new Error(upErr.message)

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl

      setAvatarUrl(url)

      const { error: pErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      if (pErr) throw new Error(pErr.message)

      setToast('Profile picture updated ✅')
      boot()
    } catch (e: any) {
      setToast(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const displayName = useMemo(() => {
    const a = `${first || ''} ${last || ''}`.trim()
    return a || 'Account'
  }, [first, last])

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
            <p className="text-sm text-white/60 mt-1">Quick profile edits + logout.</p>
          </div>

          <button onClick={logout} className={dangerBtn}>
            Log out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-2 glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-white/60">Profile</div>
                <div className="text-xl font-semibold mt-1">{displayName}</div>
                <div className="text-xs text-white/45 mt-1">{me?.email || email || '—'}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white/50 text-xs">No pic</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadAvatar(f)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className={btnGlass}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload picture'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name">
                <input className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} />
              </Field>
              <Field label="Last Name">
                <input className={inputCls} value={last} onChange={(e) => setLast(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Role">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  {me?.is_agency_owner ? 'Agency Owner' : (me?.role || 'Agent')}
                </div>
              </Field>
            </div>

            <button onClick={saveProfile} className={saveWide} disabled={status !== 'ready'}>
              Save
            </button>

            <div className="mt-4 text-xs text-white/45">
              <span className="text-white/60">Heads up:</span> profile picture uploads require a Supabase Storage bucket named <b>avatars</b>.
            </div>
          </div>

          {/* Short ops card */}
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="text-sm font-semibold">System</div>
            <div className="text-xs text-white/55 mt-2">
              • All agents see full leaderboard (agency-wide).<br />
              • Dashboard shows agent-only data unless owner.<br />
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

const btnGlass =
  'rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-2 text-sm font-semibold disabled:opacity-60'

const saveWide =
  'mt-5 w-full rounded-2xl bg-green-600 hover:bg-green-500 transition px-4 py-3 text-sm font-semibold disabled:opacity-60'

const dangerBtn =
  'rounded-2xl border border-red-400/25 bg-red-500/10 hover:bg-red-500/15 transition px-4 py-2 text-sm font-semibold'
