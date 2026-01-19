// ✅ REPLACE ENTIRE FILE: /app/post-deal/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import FlowDatePicker from '@/app/components/FlowDatePicker'

type CarrierRow = {
  id: string
  custom_name: string
  supported_name: string
  is_active: boolean
}

type ProductRow = {
  id: string
  carrier_id: string
  product_name: string
  sort_order: number | null
  is_active: boolean
}

export default function PostDealPage() {
  const router = useRouter()

  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // dropdown data
  const [carriers, setCarriers] = useState<CarrierRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // form
  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [carrierId, setCarrierId] = useState('')
  const [company, setCompany] = useState('') // supported_name
  const [product, setProduct] = useState('')
  const [policy_number, setPolicyNumber] = useState('')
  const [coverage, setCoverage] = useState('')
  const [premium, setPremium] = useState('')

  useEffect(() => {
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function boot() {
    setLoading(true)

    const { data: u, error: uErr } = await supabase.auth.getUser()
    if (uErr || !u.user) {
      window.location.href = '/login'
      return
    }

    await loadCarriers()
    setLoading(false)
  }

  async function loadCarriers() {
    const { data, error } = await supabase
      .from('carriers')
      .select('id,custom_name,supported_name,is_active')
      .eq('is_active', true)
      .order('custom_name', { ascending: true })
      .limit(5000)

    if (error) {
      setToast('Could not load carriers')
      setCarriers([])
      return
    }
    setCarriers((data || []) as CarrierRow[])
  }

  async function loadProductsForCarrier(cid: string) {
    setLoadingProducts(true)
    setProducts([])
    setProduct('')

    const { data, error } = await supabase
      .from('carrier_products')
      .select('id,carrier_id,product_name,sort_order,is_active')
      .eq('carrier_id', cid)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(5000)

    setLoadingProducts(false)

    if (error) {
      setToast('Could not load products')
      setProducts([])
      return
    }

    setProducts((data || []) as ProductRow[])
  }

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

  const carrierOptions = useMemo(() => carriers.filter((c) => c.is_active), [carriers])

  async function submit() {
    try {
      setToast(null)

      const { data: uRes } = await supabase.auth.getUser()
      const uid = uRes.user?.id
      if (!uid) {
        setToast('Not logged in')
        return
      }

      // basic validation
      if (!carrierId || !company) return setToast('Select a carrier')
      if (!product) return setToast('Select a product')
      if (!toNum(premium)) return setToast('Premium required')

      const payload = {
        // ✅ RLS-safe owner fields (your DB shows agent_id + user_id)
        agent_id: uid,
        user_id: uid,

        // deal fields
        full_name: full_name.trim() || null,
        phone: cleanPhone(phone) || null,
        dob: dob || null,
        company: company.trim() || null,
        product: product.trim() || null,
        policy_number: policy_number.trim() || null,
        coverage: toNum(coverage),
        premium: toNum(premium), // assume this is AP (annual premium) like you want
        status: 'submitted',
        note: null,
      }

      const { data: inserted, error } = await supabase.from('deals').insert(payload).select('id').single()

      if (error) {
        setToast(error.message || 'Submit failed')
        return
      }

      if (inserted?.id) fireDiscordWebhook(inserted.id)

      // ✅ auto-route back to dashboard with refreshed data
      router.push('/dashboard')
      router.refresh?.()
    } catch (e: any) {
      setToast(e?.message || 'Submit failed')
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
            <p className="text-sm text-white/60 mt-1">Glass flow. Clean submission. Instant leaderboard sync.</p>
          </div>

          <button onClick={() => router.push('/dashboard')} className={btnGlass}>
            Back
          </button>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          {loading ? (
            <div className="px-6 py-10 text-center text-white/60">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Client Full Name">
                  <input className={inputCls} value={full_name} onChange={(e) => setFullName(e.target.value)} />
                </Field>

                <Field label="Phone">
                  <input
                    className={inputCls}
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneLive(e.target.value))}
                    placeholder="(888) 888-8888"
                    inputMode="tel"
                  />
                </Field>

                <Field label="Client DOB">
                  <FlowDatePicker value={dob} onChange={setDob} placeholder="Select DOB" />
                </Field>

                <Field label="Carrier">
                  <select
                    className={inputCls}
                    value={carrierId}
                    onChange={(e) => {
                      const cid = e.target.value
                      setCarrierId(cid)
                      const c = carrierOptions.find((x) => x.id === cid)
                      setCompany(c?.supported_name || '')
                      if (cid) loadProductsForCarrier(cid)
                      else {
                        setProducts([])
                        setProduct('')
                      }
                    }}
                  >
                    <option value="">Select…</option>
                    {carrierOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.custom_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Product">
                  <select
                    className={[
                      inputCls,
                      !carrierId ? 'opacity-60 cursor-not-allowed' : '',
                    ].join(' ')}
                    value={product}
                    disabled={!carrierId || loadingProducts}
                    onChange={(e) => setProduct(e.target.value)}
                  >
                    <option value="">{!carrierId ? 'Select carrier first…' : loadingProducts ? 'Loading…' : 'Select…'}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.product_name}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Coverage">
                  <input
                    className={inputCls}
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                    placeholder="100000"
                    inputMode="numeric"
                  />
                </Field>

                <Field label="Annual Premium (AP)">
                  <input
                    className={inputCls}
                    value={premium}
                    onChange={(e) => setPremium(e.target.value)}
                    placeholder="13306.06"
                    inputMode="decimal"
                  />
                </Field>

                <Field label="Policy #">
                  <input className={inputCls} value={policy_number} onChange={(e) => setPolicyNumber(e.target.value)} />
                </Field>

                <Field label="Status">
                  <input className={inputCls} value="SUBMITTED" disabled />
                </Field>
              </div>

              <button
                onClick={submit}
                className="mt-6 w-full rounded-2xl bg-green-600 hover:bg-green-500 transition px-4 py-3 text-sm font-semibold"
              >
                Submit Deal
              </button>

              <div className="mt-3 text-xs text-white/50">
                Submitting routes you back to Dashboard + fires the Discord webhook.
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

function formatPhoneLive(raw: string) {
  const d = (raw || '').replace(/\D/g, '').slice(0, 10)
  const a = d.slice(0, 3)
  const b = d.slice(3, 6)
  const c = d.slice(6, 10)
  if (d.length <= 3) return a ? `(${a}` : ''
  if (d.length <= 6) return `(${a}) ${b}`
  return `(${a}) ${b}-${c}`
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/7'
const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'
const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'
