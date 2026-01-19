'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Carrier = {
  id: string
  name: string
  sort_order: number | null
  active: boolean | null
  eapp_url: string | null
  portal_url: string | null
  support_phone: string | null
  created_at?: string
}

type Account = {
  id: string
  agent_id: string
  carrier_id: string
  producer_number: string | null
  username: string | null
  password: string | null
  status: 'active' | 'pending' | 'inactive' | string
  updated_at: string
}

type Licenses = {
  agent_id: string
  npn: string | null
  resident_license: string | null
  florida_license: string | null
}

export default function CarrierOutlinePage() {
  const [loading, setLoading] = useState(true)
  const [savingCarrier, setSavingCarrier] = useState<string | null>(null)
  const [savingLicenses, setSavingLicenses] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [accounts, setAccounts] = useState<Record<string, Account>>({})
  const [search, setSearch] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // licenses
  const [npn, setNpn] = useState('')
  const [residentLicense, setResidentLicense] = useState('')
  const [floridaLicense, setFloridaLicense] = useState('')

  // per-carrier drafts
  const [draft, setDraft] = useState<
    Record<
      string,
      {
        producer_number: string
        username: string
        password: string
        status: 'active' | 'pending' | 'inactive'
      }
    >
  >({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      await load(alive)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(alive = true) {
    try {
      setLoading(true)
      setToast(null)

      const userRes = await supabase.auth.getUser()
      const uid = userRes.data.user?.id

      // ✅ IMPORTANT: don't hang the page if auth missing
      if (!uid) {
        window.location.href = '/login'
        return
      }

      const cRes = await supabase
        .from('carriers')
        .select('id, name, sort_order, active, eapp_url, portal_url, support_phone, created_at')
        .eq('active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })
        .limit(5000)

      if (cRes.error) throw new Error(`Could not load carriers: ${cRes.error.message}`)

      const aRes = await supabase
        .from('agent_carrier_accounts')
        .select('id, agent_id, carrier_id, producer_number, username, password, status, updated_at')
        .eq('agent_id', uid)
        .limit(5000)

      if (aRes.error) throw new Error(`Could not load your carrier accounts (RLS): ${aRes.error.message}`)

      const lRes = await supabase
        .from('agent_licenses')
        .select('agent_id, npn, resident_license, florida_license')
        .eq('agent_id', uid)
        .maybeSingle()

      // licenses are optional; don't fail page on license read
      const lic = !lRes.error ? (lRes.data as Licenses | null) : null

      const carrierList = (cRes.data || []) as Carrier[]
      const accList = (aRes.data || []) as Account[]

      const accMap: Record<string, Account> = {}
      for (const a of accList) accMap[a.carrier_id] = a

      const d: typeof draft = {}
      for (const c of carrierList) {
        const existing = accMap[c.id]
        d[c.id] = {
          producer_number: existing?.producer_number || '',
          username: existing?.username || '',
          password: existing?.password || '',
          status: ((existing?.status as any) || 'active') as any,
        }
      }

      if (!alive) return

      if (lic) {
        setNpn(lic.npn || '')
        setResidentLicense(lic.resident_license || '')
        setFloridaLicense(lic.florida_license || '')
      } else {
        // keep whatever is currently typed
      }

      setCarriers(carrierList)
      setAccounts(accMap)
      setDraft(d)
      setLoading(false)
    } catch (e: any) {
      setLoading(false)
      setToast(e?.message || 'Carrier Outline failed to load')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return carriers
    return carriers.filter((c) => (c.name || '').toLowerCase().includes(q))
  }, [carriers, search])

  function setField(carrierId: string, field: keyof (typeof draft)[string], value: any) {
    setDraft((prev) => ({
      ...prev,
      [carrierId]: { ...prev[carrierId], [field]: value },
    }))
  }

  async function saveLicenses() {
    setSavingLicenses(true)
    try {
      const userRes = await supabase.auth.getUser()
      const uid = userRes.data.user?.id
      if (!uid) {
        window.location.href = '/login'
        return
      }

      const payload = {
        agent_id: uid,
        npn: npn.trim() || null,
        resident_license: residentLicense.trim() || null,
        florida_license: floridaLicense.trim() || null,
      }

      const res = await supabase.from('agent_licenses').upsert(payload, { onConflict: 'agent_id' })
      if (res.error) throw new Error(res.error.message)

      setToast('Saved ✅')
    } catch (e: any) {
      setToast(e?.message || 'Could not save licenses')
    } finally {
      setSavingLicenses(false)
    }
  }

  async function saveCarrier(carrierId: string) {
    setSavingCarrier(carrierId)
    try {
      const userRes = await supabase.auth.getUser()
      const uid = userRes.data.user?.id
      if (!uid) {
        window.location.href = '/login'
        return
      }

      const d = draft[carrierId]
      const payload = {
        agent_id: uid,
        carrier_id: carrierId,
        producer_number: d.producer_number.trim() || null,
        username: d.username.trim() || null,
        password: d.password.trim() || null,
        status: d.status,
      }

      const existing = accounts[carrierId]
      const res = existing?.id
        ? await supabase.from('agent_carrier_accounts').update(payload).eq('id', existing.id)
        : await supabase.from('agent_carrier_accounts').insert(payload)

      if (res.error) throw new Error(res.error.message)

      setToast('Saved ✅')
      await load(true)
    } catch (e: any) {
      setToast(e?.message || 'Save failed')
    } finally {
      setSavingCarrier(null)
    }
  }

  async function clearCarrier(carrierId: string) {
    try {
      const existing = accounts[carrierId]
      if (!existing?.id) {
        setField(carrierId, 'producer_number', '')
        setField(carrierId, 'username', '')
        setField(carrierId, 'password', '')
        setField(carrierId, 'status', 'active')
        return
      }

      const res = await supabase.from('agent_carrier_accounts').delete().eq('id', existing.id)
      if (res.error) throw new Error(res.error.message)

      setToast('Cleared ✅')
      await load(true)
    } catch (e: any) {
      setToast(e?.message || 'Clear failed')
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
            <h1 className="text-3xl font-semibold tracking-tight">Carrier Outline</h1>
            <p className="text-sm text-white/60 mt-1">Producer numbers + logins + quick links.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass rounded-2xl border border-white/10 px-3 py-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm6.5 1 4-4"
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                className="bg-transparent outline-none text-sm w-56 placeholder:text-white/40"
                placeholder="Search carriers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button onClick={() => setShowPasswords((s) => !s)} className={btnGlass}>
              {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
            </button>

            <button onClick={() => load(true)} className={btnGlass}>
              Refresh
            </button>
          </div>
        </div>

        {/* LICENSES TOP */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
          <div className="text-sm font-semibold mb-4">Licenses</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="National Producer Number">
              <input className={inputCls} value={npn} onChange={(e) => setNpn(e.target.value)} placeholder="NPN" />
            </Field>
            <Field label="Resident License Number">
              <input
                className={inputCls}
                value={residentLicense}
                onChange={(e) => setResidentLicense(e.target.value)}
                placeholder="Resident License"
              />
            </Field>
            <Field label="Florida License Number">
              <input
                className={inputCls}
                value={floridaLicense}
                onChange={(e) => setFloridaLicense(e.target.value)}
                placeholder="FL License"
              />
            </Field>
          </div>

          <button
            onClick={saveLicenses}
            disabled={savingLicenses}
            className="mt-5 rounded-2xl bg-blue-600 hover:bg-blue-500 transition px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {savingLicenses ? 'Saving…' : 'Save Licenses'}
          </button>
        </div>

        {loading && <div className="text-white/60">Loading…</div>}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((c) => {
              const d = draft[c.id]
              const has = !!accounts[c.id]
              const isSaving = savingCarrier === c.id

              return (
                <div key={c.id} className="glass rounded-2xl border border-white/10 p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold truncate">{c.name}</div>
                        <StatusPill status={d?.status || 'active'} />
                        {has && <span className="text-xs text-white/50">Saved</span>}
                      </div>
                      <div className="text-xs text-white/55 mt-1">
                        Last updated: {has ? new Date(accounts[c.id].updated_at).toLocaleString() : '—'}
                      </div>
                    </div>

                    <button onClick={() => clearCarrier(c.id)} className={btnDanger}>
                      Clear
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Producer Number">
                      <input
                        className={inputCls}
                        value={d?.producer_number || ''}
                        onChange={(e) => setField(c.id, 'producer_number', e.target.value)}
                        placeholder="Producer #"
                      />
                    </Field>

                    <Field label="Status">
                      <select className={inputCls} value={d?.status || 'active'} onChange={(e) => setField(c.id, 'status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </Field>

                    <Field label="Username">
                      <input
                        className={inputCls}
                        value={d?.username || ''}
                        onChange={(e) => setField(c.id, 'username', e.target.value)}
                        placeholder="Username"
                      />
                    </Field>

                    <Field label="Password">
                      <input
                        className={inputCls}
                        value={d?.password || ''}
                        onChange={(e) => setField(c.id, 'password', e.target.value)}
                        placeholder="Password"
                        type={showPasswords ? 'text' : 'password'}
                      />
                    </Field>
                  </div>

                  {/* E-App | Agent Portal, Phone below */}
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <LinkCard label="E-App" href={c.eapp_url} />
                      <LinkCard label="Agent Portal" href={c.portal_url} />
                    </div>
                    <div className="mt-3 text-center text-sm text-white/80">{c.support_phone ? c.support_phone : '—'}</div>
                  </div>

                  <button
                    onClick={() => saveCarrier(c.id)}
                    disabled={isSaving}
                    className="mt-5 w-full rounded-2xl bg-blue-600 hover:bg-blue-500 transition px-4 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="text-sm text-white/60">
                No carriers match “{search.trim()}”.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className || ''}>
      <div className="text-[11px] text-white/55 mb-2">{label}</div>
      {children}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-green-500/12 border-green-400/25 text-green-200'
      : status === 'pending'
      ? 'bg-yellow-500/12 border-yellow-400/25 text-yellow-200'
      : 'bg-white/6 border-white/12 text-white/70'
  return <span className={`text-[11px] px-2 py-1 rounded-xl border ${cls}`}>{status}</span>
}

function LinkCard({ label, href }: { label: string; href: string | null }) {
  const cleaned = (href || '').trim()
  const disabled = !cleaned

  return (
    <a
      href={disabled ? '#' : cleaned}
      target="_blank"
      rel="noreferrer"
      className={[
        'rounded-2xl border px-4 py-3 text-sm font-semibold transition flex items-center justify-between',
        disabled
          ? 'border-white/10 bg-white/5 text-white/40 pointer-events-none'
          : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/90',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="text-xs opacity-60">↗</span>
    </a>
  )
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/7'
const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'
const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'
const btnDanger =
  'rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs hover:bg-red-500/15 transition'
