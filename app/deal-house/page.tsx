'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Deal = {
  id: string
  full_name: string | null
  company: string | null
  policy_number: string | null
  coverage: number | null
  premium: number | null
  client_dob: string | null
  beneficiary: string | null
  notes: string | null
  personal_contact_sent: boolean | null
  policy_received: boolean | null
  day30_follow_up: boolean | null
  created_at: string
}

const FILTERS = ['All', 'Active', 'Pending', 'Submitted', 'Chargeback'] as const

export default function DealHousePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    setLoading(true)

    const { data, error } = await supabase
      .from('deals')
      .select(
        'id, full_name, company, policy_number, coverage, premium, client_dob, beneficiary, notes, personal_contact_sent, policy_received, day30_follow_up, created_at, status'
      )
      .order('created_at', { ascending: false })

    if (!error && data) setDeals(data as Deal[])
    setLoading(false)
  }

  const visibleDeals = useMemo(() => {
    if (filter === 'All') return deals
    // status might exist but not in Deal type; keep it flexible
    // @ts-ignore
    return deals.filter((d) => (d as any).status === filter)
  }, [deals, filter])

  async function toggleFlag(dealId: string, field: 'personal_contact_sent' | 'policy_received' | 'day30_follow_up', current: boolean | null) {
    setSavingId(dealId)

    const next = !Boolean(current)

    const { error } = await supabase
      .from('deals')
      .update({ [field]: next })
      .eq('id', dealId)

    if (!error) {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, [field]: next } : d))
      )
    }

    setSavingId(null)
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Deal House</h1>
            <p className="text-sm text-white/60 mt-1">Clean book of business.</p>
          </div>

          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm transition ${
                  filter === f ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-white/10">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-4 text-[11px] text-white/60 bg-white/5">
            <div className="col-span-2">Full Name</div>
            <div className="col-span-2">Company</div>
            <div className="col-span-1">Policy #</div>
            <div className="col-span-1 text-right">Coverage</div>
            <div className="col-span-1 text-right">Premium</div>
            <div className="col-span-1">DOB</div>
            <div className="col-span-2">Beneficiary</div>
            <div className="col-span-1 text-center">Contact</div>
            <div className="col-span-1 text-center">Policy</div>
            <div className="col-span-1 text-center">30D</div>
          </div>

          {loading && (
            <div className="px-6 py-10 text-center text-white/60">Loading deals…</div>
          )}

          {!loading && visibleDeals.length === 0 && (
            <div className="px-6 py-10 text-center text-white/60">No deals found.</div>
          )}

          {!loading &&
            visibleDeals.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 border-t border-white/10 hover:bg-white/5 transition"
              >
                <div className="col-span-2 font-medium truncate">{d.full_name || '—'}</div>
                <div className="col-span-2 text-white/70 truncate">{d.company || '—'}</div>
                <div className="col-span-1 text-white/70 truncate">{d.policy_number || '—'}</div>

                <div className="col-span-1 text-right font-semibold">
                  {d.coverage ? `$${formatMoney(d.coverage)}` : '—'}
                </div>

                <div className="col-span-1 text-right font-semibold">
                  {d.premium ? `$${formatMoney(d.premium)}` : '—'}
                </div>

                <div className="col-span-1 text-white/70">
                  {d.client_dob ? prettyDate(d.client_dob) : '—'}
                </div>

                <div className="col-span-2 text-white/70 truncate">{d.beneficiary || '—'}</div>

                {/* Toggles */}
                <div className="col-span-1 flex items-center justify-center">
                  <DotToggle
                    disabled={savingId === d.id}
                    value={Boolean(d.personal_contact_sent)}
                    onClick={() => toggleFlag(d.id, 'personal_contact_sent', d.personal_contact_sent)}
                    title="Personal Contact Sent?"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <DotToggle
                    disabled={savingId === d.id}
                    value={Boolean(d.policy_received)}
                    onClick={() => toggleFlag(d.id, 'policy_received', d.policy_received)}
                    title="Policy Received?"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <DotToggle
                    disabled={savingId === d.id}
                    value={Boolean(d.day30_follow_up)}
                    onClick={() => toggleFlag(d.id, 'day30_follow_up', d.day30_follow_up)}
                    title="30 Day Follow Up?"
                  />
                </div>

                {/* Notes row */}
                <div className="col-span-12 mt-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
                    <span className="text-white/50 mr-2">Note:</span>
                    {d.notes?.trim() ? d.notes : '—'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function DotToggle({
  value,
  onClick,
  title,
  disabled,
}: {
  value: boolean
  onClick: () => void
  title: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 rounded-xl border border-white/10 transition flex items-center justify-center ${
        disabled ? 'opacity-60' : 'hover:bg-white/10'
      }`}
    >
      <span
        className={`h-3 w-3 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`}
      />
    </button>
  )
}

function formatMoney(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function prettyDate(isoOrDate: string) {
  const d = new Date(isoOrDate)
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
}
