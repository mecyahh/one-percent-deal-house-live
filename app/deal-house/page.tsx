'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Deal = {
  id: string
  client_name: string
  carrier: string
  premium: number
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-500',
  Pending: 'bg-yellow-500',
  Chargeback: 'bg-red-500',
  Submitted: 'bg-blue-500',
}

const FILTERS = [
  'All',
  'Active',
  'Pending',
  'Submitted',
  'Chargeback',
] as const

export default function DealHousePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    setLoading(true)

    const { data, error } = await supabase
      .from('deals')
      .select('id, client_name, carrier, premium, status, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) setDeals(data as Deal[])
    setLoading(false)
  }

  const visibleDeals =
    filter === 'All'
      ? deals
      : deals.filter((d) => d.status === filter)

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Deal House</h1>
            <p className="text-sm text-white/60 mt-1">
              Your book. Clean signal. No noise.
            </p>
          </div>

          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm transition ${
                  filter === f
                    ? 'bg-blue-600'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-white/10">
          <div className="grid grid-cols-5 px-6 py-4 text-xs text-white/60 bg-white/5">
            <div>Client</div>
            <div>Carrier</div>
            <div>Status</div>
            <div>Premium</div>
            <div>Date</div>
          </div>

          {loading && (
            <div className="px-6 py-10 text-center text-white/60">
              Loading deals…
            </div>
          )}

          {!loading && visibleDeals.length === 0 && (
            <div className="px-6 py-10 text-center text-white/60">
              No deals found.
            </div>
          )}

          {visibleDeals.map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-5 px-6 py-4 border-t border-white/10 hover:bg-white/5 transition"
            >
              <div className="font-medium">{d.client_name}</div>
              <div className="text-white/70">{d.carrier}</div>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    STATUS_COLORS[d.status] || 'bg-gray-400'
                  }`}
                />
                <span className="text-sm">{d.status}</span>
              </div>

              <div className="font-semibold">
                ${d.premium.toLocaleString()}
              </div>

              <div className="text-sm text-white/50">
                {new Date(d.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
