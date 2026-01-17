'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Carrier = {
  id: string
  name: string
  sort_order: number
  active: boolean
}

type Account = {
  id: string
  agent_id: string
  carrier_id: string
  producer_number: string | null
  username: string | null
  password: string | null
  notes: string | null
  status: 'active' | 'pending' | 'inactive' | string
  updated_at: string
}

export default function CarrierOutlinePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [accounts, setAccounts] = useState<Record<string, Account>>({})
  const [search, setSearch] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const [draft, setDraft] = useState<
    Record<
      string,
      {
        producer_number: string
        username: string
        password: string
        notes: string
        status: 'active' | 'pending' | 'inactive'
      }
    >
  >({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const userRes = await supabase.auth.getUser()
    const uid = userRes.data.user?.id
    if (!uid) {
      setLoading(false)
      return
    }

    const cRes = await supabase
      .from('carriers')
      .select('id, name, sort_order, active')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (cRes.error) {
      setToast('Could not load carriers')
      setLoading(false)
      return
    }

    const aRes = await supabase
      .from('agent_carrier_accounts')
      .select('id, agent_id, carrier_id, producer_number, username, password, notes, status, updated_at')
      .eq('agent_id', uid)

    if (aRes.error) {
      setToast('Could not load your carrier accounts (RLS)')
      setLoading(false)
      return
    }

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
        notes: existing?.notes || '',
        status: (existing?.status as any) || 'active',
      }
    }

    setCarriers(carrierList)
    setAccounts(accMap)
    setDraft(d)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return carriers
    return carriers.filter((c) => c.name.toLowerCase().includes(q))
  }, [carriers, search])

  function setField(carrierId: string, field: keyof (typeof draft)[string], value: any) {
    setDraft((prev) => ({
      ...prev,
      [carrierId]: {
        ...prev[carrierId],
        [field]: value,
      },
    }))
  }

  async function save(carrierId: string) {
    setSaving(carrierId)

    const userRes = await supabase.auth.getUser()
    const uid = userRes.data.user?.id
    if (!uid) {
      setSaving(null)
      return
    }

    const d = draft[carrierId]
    const payload = {
      agent_id: uid,
      carrier_id: carrierId,
      producer_number: d.producer_number.trim() || null,
      username: d.username.trim() || null,
      password: d.password.trim() || null,
      notes: d.notes.trim() || null,
      status: d.status,
    }

    const existing = accounts[carrierId]
    let err: any = null

    if (existing?.id) {
      const res = await supabase.from('agent_carrier_accounts').update(payload).eq('id', existing.id)
      err = res.error
    } else {
      const res = await supabase.from('agent_carrier_accounts').insert(payload)
      err = res.error
    }

    if (err) {
      setToast('Save failed')
      setSaving(null)
      return
    }

    setToast('Saved ✅')
    await load()
    setSaving(null)
  }

  async function clearCarrier(carrierId: string) {
    const existing = accounts[carrierId]
    if (!existing?.id) {
      setField(carrierId, 'producer_number', '')
      setField(carrierId, 'username', '')
      setField(carrierId, 'password', '')
      setField(carrierId, 'notes', '')
      setField(carrierId, 'status', 'active')
      return
    }

    await supabase.from('agent_carrier_accounts').delete().eq('id', existing.id)
    setToast('Cleared ✅')
    await load()
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
            <p className="text-sm text-white/60 mt-1">Your contracts, logins, and producer numbers.</p>
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

            <button onClick={load} className={btnGlass}>
              Refresh
            </button>
          </div>
        </div>

        {loading && <div className="text-white/60">Loading…</div>}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((c) => {
              const d = draft[c.id]
              const has = !!accounts[c.id]
              const isSaving = saving === c.id

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
                      <select
                        className={inputCls}
                        value={d?.status || 'active'}
                        onChange={(e) => setField(c.id, 'status', e.target.value)}
                      >
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

                  <Field label="Notes" className="mt-4">
                    <textarea
                      className={`${inputCls} min-h-[110px]`}
                      value={d?.notes || ''}
                      onChange={(e) => setField(c.id, 'notes', e.target.value)}
                      placeholder="Anything important…"
                    />
                  </Field>

                  <button
                    onClick={() => save(c.id)}
                    disabled={isSaving}
                    className="mt-5 w-full rounded-2xl bg-blue-600 hover:bg-blue-500 transition px-4 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )
            })}
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

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/7'
const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'
const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'
const btnDanger = 'rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs hover:bg-red-500/15 transition'
