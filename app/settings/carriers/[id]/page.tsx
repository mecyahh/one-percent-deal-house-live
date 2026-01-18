// ✅ CREATE FILE: /app/settings/carriers/[id]/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  role: string
}

type Carrier = {
  id: string
  custom_name: string
  supported_name: string
  advance_rate: number
}

type Product = {
  id: string
  carrier_id: string
  product_name: string
  sort_order: number
  is_active: boolean
}

type CompRate = {
  id: string
  product_id: string
  comp_percent: number
  rate: number | null
}

const DEFAULT_COMPS = [125, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70] // you can edit per product

export default function CarrierDetailPage() {
  const params = useParams()
  const carrierId = String((params as any)?.id || '')

  const [me, setMe] = useState<Profile | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [carrier, setCarrier] = useState<Carrier | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<CompRate[]>([])

  const [createProductOpen, setCreateProductOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({ product_name: '', compPercents: DEFAULT_COMPS.join(',') })

  useEffect(() => {
    if (!carrierId) return
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierId])

  async function boot() {
    setLoading(true)

    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (!uid) {
      window.location.href = '/login'
      return
    }

    const { data: prof } = await supabase.from('profiles').select('id,role').eq('id', uid).single()
    if (!prof) {
      setToast('Profile missing')
      setLoading(false)
      return
    }
    const p = prof as Profile
    setMe(p)

    if (p.role !== 'admin') {
      setToast('Admins only')
      setLoading(false)
      return
    }

    const { data: car, error: carErr } = await supabase
      .from('carriers')
      .select('id,custom_name,supported_name,advance_rate')
      .eq('id', carrierId)
      .single()

    if (carErr || !car) {
      setToast('Carrier not found')
      setLoading(false)
      return
    }
    setCarrier(car as Carrier)

    const { data: prods } = await supabase
      .from('carrier_products')
      .select('id,carrier_id,product_name,sort_order,is_active')
      .eq('carrier_id', carrierId)
      .order('sort_order', { ascending: true })
      .limit(5000)

    setProducts((prods || []) as Product[])

    const prodIds = (prods || []).map((x: any) => x.id)
    if (prodIds.length) {
      const { data: r } = await supabase
        .from('carrier_comp_rates')
        .select('id,product_id,comp_percent,rate')
        .in('product_id', prodIds)
        .limit(50000)
      setRates((r || []) as CompRate[])
    } else {
      setRates([])
    }

    setLoading(false)
  }

  const rateMap = useMemo(() => {
    const m = new Map<string, CompRate>()
    rates.forEach((r) => m.set(`${r.product_id}:${r.comp_percent}`, r))
    return m
  }, [rates])

  async function createProduct() {
    if (!carrier) return
    const name = newProduct.product_name.trim()
    if (!name) return setToast('Product name required')

    // create product
    const { data: inserted, error } = await supabase
      .from('carrier_products')
      .insert({
        carrier_id: carrier.id,
        product_name: name,
        sort_order: products.length,
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !inserted?.id) return setToast('Create product failed (RLS?)')

    // seed comp percents
    const comps = newProduct.compPercents
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)

    const uniq = Array.from(new Set(comps))
    if (uniq.length) {
      await supabase.from('carrier_comp_rates').insert(
        uniq.map((cp) => ({
          product_id: inserted.id,
          comp_percent: cp,
          rate: null,
        }))
      )
    }

    setToast('Product added ✅')
    setCreateProductOpen(false)
    setNewProduct({ product_name: '', compPercents: DEFAULT_COMPS.join(',') })
    boot()
  }

  async function updateRate(productId: string, compPercent: number, value: string) {
    const key = `${productId}:${compPercent}`
    const existing = rateMap.get(key)
    const rateNum = value.trim() === '' ? null : Number(value)

    if (value.trim() !== '' && !Number.isFinite(rateNum)) return

    if (existing) {
      const { error } = await supabase
        .from('carrier_comp_rates')
        .update({ rate: rateNum })
        .eq('id', existing.id)
      if (error) return setToast('Save failed')
    } else {
      const { error } = await supabase.from('carrier_comp_rates').insert({
        product_id: productId,
        comp_percent: compPercent,
        rate: rateNum,
      })
      if (error) return setToast('Save failed')
    }

    // refresh local
    boot()
  }

  const compsByProduct = useMemo(() => {
    const out = new Map<string, number[]>()
    products.forEach((p) => {
      const cps = rates
        .filter((r) => r.product_id === p.id)
        .map((r) => r.comp_percent)
        .sort((a, b) => b - a)
      out.set(p.id, cps.length ? cps : DEFAULT_COMPS)
    })
    return out
  }, [products, rates])

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
            <h1 className="text-3xl font-semibold tracking-tight">{carrier?.custom_name || 'Carrier'}</h1>
            <p className="text-sm text-white/60 mt-1">
              Comp Sheet + Products (Admin only)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => (window.location.href = '/settings')} className={btnGlass}>
              Back to Settings
            </button>
            <button onClick={() => setCreateProductOpen(true)} className={saveBtn}>
              Create Product
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          {loading ? (
            <div className="py-12 text-center text-white/60">Loading…</div>
          ) : me?.role !== 'admin' ? (
            <div className="py-12 text-center text-white/60">Admins only.</div>
          ) : (
            <div className="space-y-6">
              {products.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
                  No products yet. Click <b>Create Product</b>.
                </div>
              )}

              {products.map((p) => {
                const cols = compsByProduct.get(p.id) || DEFAULT_COMPS
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
                      <div className="text-sm font-semibold">{p.product_name}</div>
                      <div className="text-xs text-white/60">Comp Sheet</div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-[11px] text-white/60">
                          <tr className="border-b border-white/10">
                            <th className="text-left px-5 py-3 whitespace-nowrap">Comp %</th>
                            <th className="text-left px-5 py-3 whitespace-nowrap">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cols.map((cp) => {
                            const existing = rateMap.get(`${p.id}:${cp}`)
                            return (
                              <tr key={cp} className="border-b border-white/10">
                                <td className="px-5 py-3 font-semibold whitespace-nowrap">{cp.toFixed(2)}%</td>
                                <td className="px-5 py-3">
                                  <input
                                    className={inputCls}
                                    defaultValue={existing?.rate ?? ''}
                                    placeholder="(optional)"
                                    onBlur={(e) => updateRate(p.id, cp, e.target.value)}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-3 text-[11px] text-white/50">
                      Tip: click into the Rate field, edit, then click outside to auto-save.
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {createProductOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-lg font-semibold">Add Product</div>
                <div className="text-xs text-white/55 mt-1">Creates comp rows for this product.</div>
              </div>
              <button onClick={() => setCreateProductOpen(false)} className={closeBtn}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Product name">
                <input
                  className={inputCls}
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, product_name: e.target.value }))}
                  placeholder="Final Expense (Preferred/Standard)"
                />
              </Field>

              <Field label="Comp percents (comma-separated)">
                <input
                  className={inputCls}
                  value={newProduct.compPercents}
                  onChange={(e) => setNewProduct((p) => ({ ...p, compPercents: e.target.value }))}
                  placeholder="125,115,110,105,100,95,90,85,80,75,70"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCreateProductOpen(false)} className={closeBtn}>
                Cancel
              </button>
              <button onClick={createProduct} className={saveBtn}>
                Add Product
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
  'w-full rounded-2xl border border-white/10 bg-[#0b0f1a]/30 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/7'

const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'

const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'

const closeBtn =
  'rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-3 text-sm font-semibold'

const saveBtn =
  'rounded-2xl bg-green-600 hover:bg-green-500 transition px-5 py-3 text-sm font-semibold'
