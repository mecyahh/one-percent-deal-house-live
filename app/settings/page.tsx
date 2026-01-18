// ✅ REPLACE ENTIRE FILE: /app/settings/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string
  is_agency_owner: boolean
  theme: string | null
  avatar_url: string | null
}

type CarrierRow = {
  id: string
  created_at: string
  custom_name: string
  supported_name: string
  advance_rate: number
  is_active: boolean
}

const SUPPORTED_NAMES = [
  'Aetna',
  'Aflac',
  'Royal Neighbors of America',
  'SBLI',
  'Transamerica',
  'American Amicable',
  'Mutual of Omaha',
] as const

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null)
  const [me, setMe] = useState<Profile | null>(null)

  const [tab, setTab] = useState<'profile' | 'carriers'>('profile')

  // Profile
  const [pFirst, setPFirst] = useState('')
  const [pLast, setPLast] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  // Carriers (admin only)
  const [loadingCarriers, setLoadingCarriers] = useState(false)
  const [carriers, setCarriers] = useState<CarrierRow[]>([])
  const [carrierSearch, setCarrierSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newCarrier, setNewCarrier] = useState({
    custom_name: '',
    supported_name: 'Aetna',
    advance_rate: '0.75',
  })

  // stats
  const [dealCountsBySupported, setDealCountsBySupported] = useState<Map<string, number>>(new Map())
  const [productCountsByCarrier, setProductCountsByCarrier] = useState<Map<string, number>>(new Map())

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

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (!prof) return

    const p = prof as Profile
    setMe(p)

    setPFirst(p.first_name || '')
    setPLast(p.last_name || '')
    setPEmail(p.email || '')
    setAvatarPreview(p.avatar_url || '')

    // default tab
    setTab('profile')

    // admin-only load carriers
    if (p.role === 'admin') {
      await loadCarriers()
      await loadCarrierStats()
    }
  }

  async function saveProfile() {
    if (!me) return
    const payload = {
      first_name: pFirst.trim() || null,
      last_name: pLast.trim() || null,
      email: pEmail.trim() || null,
      avatar_url: avatarPreview?.trim() || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', me.id)
    if (error) return setToast('Save failed')
    setToast('Saved ✅')
    boot()
  }

  async function uploadAvatar(file: File) {
    if (!me) return
    const ext = file.name.split('.').pop() || 'png'
    const path = `${me.id}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      setToast('Upload failed')
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl

    const { error: upErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', me.id)
    if (upErr) {
      setToast('Could not save avatar')
      return
    }

    setAvatarPreview(url)
    setToast('Profile picture updated ✅')
    boot()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function loadCarriers() {
    setLoadingCarriers(true)
    const { data, error } = await supabase
      .from('carriers')
      .select('id,created_at,custom_name,supported_name,advance_rate,is_active')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) setToast('Could not load carriers')
    setCarriers((data || []) as CarrierRow[])
    setLoadingCarriers(false)
  }

  async function loadCarrierStats() {
    // Policies Sold = how many deals exist by company (we match on supported_name)
    // Products = count in carrier_products per carrier
    const { data: deals } = await supabase.from('deals').select('id,company').limit(50000)
    const mapDeals = new Map<string, number>()
    ;(deals || []).forEach((d: any) => {
      const key = (d.company || '').trim()
      if (!key) return
      mapDeals.set(key, (mapDeals.get(key) || 0) + 1)
    })
    setDealCountsBySupported(mapDeals)

    const { data: prod } = await supabase.from('carrier_products').select('id,carrier_id').limit(50000)
    const mapProds = new Map<string, number>()
    ;(prod || []).forEach((p: any) => {
      mapProds.set(p.carrier_id, (mapProds.get(p.carrier_id) || 0) + 1)
    })
    setProductCountsByCarrier(mapProds)
  }

  const filteredCarriers = useMemo(() => {
    const q = carrierSearch.trim().toLowerCase()
    if (!q) return carriers
    return carriers.filter((c) => {
      const b = [c.custom_name, c.supported_name].join(' ').toLowerCase()
      return b.includes(q)
    })
  }, [carriers, carrierSearch])

  async function createCarrier() {
    const custom = newCarrier.custom_name.trim()
    if (!custom) return setToast('Custom name required')
    const supported = newCarrier.supported_name.trim()
    const adv = Number(newCarrier.advance_rate)
    if (!Number.isFinite(adv) || adv <= 0) return setToast('Advance rate invalid')

    const { error } = await supabase.from('carriers').insert({
      custom_name: custom,
      supported_name: supported,
      advance_rate: adv,
      is_active: true,
    })

    if (error) return setToast('Create failed (RLS?)')

    setToast('Carrier created ✅')
    setCreateOpen(false)
    setNewCarrier({ custom_name: '', supported_name: 'Aetna', advance_rate: '0.75' })
    await loadCarriers()
    await loadCarrierStats()
  }

  const isAdmin = me?.role === 'admin'

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
            <p className="text-sm text-white/60 mt-1">Profile + Admin-only carrier config.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('profile')}
              className={[
                'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                tab === 'profile' ? 'bg-white/10 border-white/15' : 'bg-white/5 border-white/10 hover:bg-white/10',
              ].join(' ')}
            >
              Profile
            </button>

            {isAdmin && (
              <button
                onClick={() => setTab('carriers')}
                className={[
                  'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                  tab === 'carriers' ? 'bg-white/10 border-white/15' : 'bg-white/5 border-white/10 hover:bg-white/10',
                ].join(' ')}
              >
                Carriers
              </button>
            )}
          </div>
        </div>

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-sm font-semibold">My Profile</div>
                <div className="text-xs text-white/55 mt-1">Keep it clean + modern.</div>
              </div>
              <button onClick={logout} className={dangerBtn}>
                Log out
              </button>
            </div>

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

              {/* Upload */}
              <Field label="Profile Picture (Upload)">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-white/70
                      file:mr-4 file:rounded-xl file:border-0
                      file:bg-white/10 file:px-4 file:py-2
                      file:text-sm file:font-semibold
                      hover:file:bg-white/20 transition"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadAvatar(f)
                    }}
                  />
                  <div className="text-[11px] text-white/55 mt-2">
                    Uploads to Supabase Storage bucket: <b>avatars</b>
                  </div>
                </div>
              </Field>
            </div>

            {avatarPreview && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
                <div className="text-xs text-white/60">Preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarPreview} alt="avatar" className="h-12 w-12 rounded-2xl border border-white/10 object-cover" />
              </div>
            )}

            <button onClick={saveProfile} className={saveWide}>
              Save Profile
            </button>
          </div>
        )}

        {/* CARRIERS (ADMIN ONLY) */}
        {tab === 'carriers' && isAdmin && (
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-sm font-semibold">Carriers</div>
                <div className="text-xs text-white/55 mt-1">
                  Admin-only. Click a carrier row to open its comp sheet + products.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setCreateOpen(true)} className={saveBtn}>
                  Create Carrier
                </button>
                <button
                  onClick={async () => {
                    await loadCarriers()
                    await loadCarrierStats()
                  }}
                  className={btnGlass}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/10 px-3 py-2 flex items-center gap-2 mb-4">
              <input
                className="bg-transparent outline-none text-sm w-full placeholder:text-white/40"
                placeholder="Search carriers…"
                value={carrierSearch}
                onChange={(e) => setCarrierSearch(e.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-3 border-b border-white/10 text-[11px] text-white/60 bg-white/5">
                <div className="col-span-3">Carrier</div>
                <div className="col-span-3">Supported Name</div>
                <div className="col-span-2 text-center">Policies Sold</div>
                <div className="col-span-2 text-center">Products</div>
                <div className="col-span-2 text-right">Advance Rate</div>
              </div>

              {loadingCarriers && <div className="px-4 py-6 text-sm text-white/60">Loading…</div>}

              {!loadingCarriers &&
                filteredCarriers.map((c) => {
                  const policies = dealCountsBySupported.get((c.supported_name || '').trim()) || 0
                  const products = productCountsByCarrier.get(c.id) || 0
                  return (
                    <button
                      key={c.id}
                      onClick={() => (window.location.href = `/settings/carriers/${c.id}`)}
                      className="w-full text-left grid grid-cols-12 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition text-sm"
                    >
                      <div className="col-span-3 font-semibold">{c.custom_name}</div>
                      <div className="col-span-3 text-white/80">{c.supported_name}</div>
                      <div className="col-span-2 text-center">{policies}</div>
                      <div className="col-span-2 text-center">{products}</div>
                      <div className="col-span-2 text-right text-white/80">{Number(c.advance_rate).toFixed(2)}</div>
                    </button>
                  )
                })}

              {!loadingCarriers && filteredCarriers.length === 0 && (
                <div className="px-4 py-6 text-sm text-white/60">No carriers.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE CARRIER MODAL */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-lg font-semibold">Add a Carrier</div>
                <div className="text-xs text-white/55 mt-1">Admin-only</div>
              </div>
              <button onClick={() => setCreateOpen(false)} className={closeBtn}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Custom name">
                <input
                  className={inputCls}
                  value={newCarrier.custom_name}
                  onChange={(e) => setNewCarrier((p) => ({ ...p, custom_name: e.target.value }))}
                  placeholder="American Amicable"
                />
              </Field>

              <Field label="Supported name">
                <select
                  className={inputCls}
                  value={newCarrier.supported_name}
                  onChange={(e) => setNewCarrier((p) => ({ ...p, supported_name: e.target.value }))}
                >
                  {SUPPORTED_NAMES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Advance rate (ex: .75)">
                <input
                  className={inputCls}
                  value={newCarrier.advance_rate}
                  onChange={(e) => setNewCarrier((p) => ({ ...p, advance_rate: e.target.value }))}
                  placeholder="0.75"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} className={closeBtn}>
                Cancel
              </button>
              <button onClick={createCarrier} className={saveBtn}>
                Create Carrier
              </button>
            </div>
          </div>
        </div>
      )}
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
const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'

const closeBtn =
  'rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-3 text-sm font-semibold'

const saveBtn =
  'rounded-2xl bg-green-600 hover:bg-green-500 transition px-5 py-3 text-sm font-semibold'

const saveWide =
  'mt-5 w-full rounded-2xl bg-green-600 hover:bg-green-500 transition px-4 py-3 text-sm font-semibold'

const dangerBtn =
  'rounded-2xl bg-red-600 hover:bg-red-500 transition px-4 py-3 text-sm font-semibold'
