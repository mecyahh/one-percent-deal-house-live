// ✅ FILE: /app/post-deal/page.tsx  (REPLACE ENTIRE FILE)
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import FlowDatePicker from '@/app/components/FlowDatePicker'

const CARRIERS = [
  'Aetna',
  'Aflac',
  'AIG',
  'American Amicable',
  'Mutual Of Omaha',
  'Royal Neighbors',
  'Transamerica',
] as const

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type CarrierOutlineRow = {
  id: string
  user_id: string
  carrier: string
  producer_number: string | null
}

export default function PostDealPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const [me, setMe] = useState<Profile | null>(null)
  const [carrierOutline, setCarrierOutline] = useState<Map<string, string>>(new Map())

  // form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [company, setCompany] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [coverage, setCoverage] = useState('')
  const [premium, setPremium] = useState('')
  const [notes, setNotes] = useState('')

  // submit
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function boot() {
    setLoading(true)

    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (!uid) {
      window.location.href = '/login'
      return
    }

    // profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', uid)
      .single()

    setMe((prof as Profile) || null)

    // carrier outline (producer # validation)
    // expects table: carrier_outline with columns: user_id, carrier, producer_number
    const { data: outlines } = await supabase
      .from('carrier_outline')
      .select('id,user_id,carrier,producer_number')
      .eq('user_id', uid)
      .limit(5000)

    const map = new Map<string, string>()
    ;((outlines as CarrierOutlineRow[]) || []).forEach((r) => {
      const key = (r.carrier || '').trim().toLowerCase()
      const pn = (r.producer_number || '').trim()
      if (key && pn) map.set(key, pn)
    })
    setCarrierOutline(map)

    setLoading(false)
  }

  const canSubmit = useMemo(() => {
    return !!(fullName.trim() && company.trim() && premium.trim())
  }, [fullName, company, premium])

  async function fireDiscordWebhook(dealId: string) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    await fetch('/api/webhooks/deal-posted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ deal_id: dealId }),
    }).catch(() => {})
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)

    try {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid) {
        window.location.href = '/login'
        return
      }

      const carrierKey = company.trim().toLowerCase()

      // ✅ BLOCK if no producer number on carrier outline
      const producerNumber = carrierOutline.get(carrierKey)
      if (!producerNumber) {
        setToast('Agent does not have an active license for this carrier, please submit your producer number in your deal house')
        setSubmitting(false)
        return
      }

      const payload = {
        agent_id: uid, // your project uses agent_id on deals
        full_name: fullName.trim() || null,
        phone: cleanPhone(phone) || null,
        dob: dob || null,
        company: company.trim() || null,
        policy_number: policyNumber.trim() || null,
        coverage: toNum(coverage),
        premium: toNum(premium),
        status: 'pending',
        note: notes.trim() || null,
        notes: notes.trim() || null,
        // optional: store producer number snapshot if you want (only if column exists)
        // producer_number: producerNumber,
      }

      const { data: inserted, error } = await supabase
        .from('deals')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        setToast('Deal submit failed')
        setSubmitting(false)
        return
      }

      // ✅ send discord webhook (best-effort)
      if (inserted?.id) await fireDiscordWebhook(inserted.id)

      // ✅ route back to dashboard + refresh
      router.push('/dashboard?refresh=1')
      router.refresh()
    } finally {
      setSubmitting(false)
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
            <h1 className="text-3xl font-semibold tracking-tight">Post a Deal</h1>
            <p className="text-sm text-white/60 mt-1">Fast. Clean. Glass. No duplicates, no friction.</p>
          </div>

          <button onClick={() => router.push('/dashboard')} className={btnGlass}>
            Back to Dashboard
          </button>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          {loading ? (
            <div className="px-6 py-10 text-center text-white/60">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name">
                  <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </Field>

                <Field label="Phone">
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(888) 888-8888" />
                </Field>

                <Field label="Client DOB">
                  <FlowDatePicker value={dob} onChange={setDob} placeholder="Select DOB" />
                </Field>

                <Field label="Company">
                  <select className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)}>
                    <option value="">Select…</option>
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Coverage">
                  <input className={inputCls} value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder="100000" />
                </Field>

                <Field label="Premium">
                  <input className={inputCls} value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="100" />
                </Field>

                <Field label="Policy #">
                  <input className={inputCls} value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
                </Field>

                <Field label="Notes">
                  <textarea
                    className={`${inputCls} min-h-[110px]`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Quick notes…"
                  />
                </Field>
              </div>

              <button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className={[
                  'mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition',
                  !canSubmit || submitting ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500',
                ].join(' ')}
              >
                {submitting ? 'Submitting…' : 'Submit Deal'}
              </button>

              <div className="mt-3 text-[11px] text-white/45">
                You must have a producer number saved for the selected carrier in Carrier Outline.
              </div>
            </>
          )}
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

function toNum(v: any) {
  if (v === null || v === undefined || v === '') return null
  const num = Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(num) ? num : null
}

function cleanPhone(raw: string) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10)
  if (digits.length !== 10) return raw?.trim() || null
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/7'
const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'
const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'
