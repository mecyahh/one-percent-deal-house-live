'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type TeamDeal = {
  id: string
  agent_id: string
  full_name: string
  premium: number
  created_at: string
}

type AgentSummary = {
  agent_id: string
  full_name: string
  totalPremium: number
  deals: number
}

export default function TeamViewPage() {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<TeamDeal[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const { data, error } = await supabase
      .from('deals')
      .select('id, agent_id, full_name, premium, created_at')

    if (!error && data) setDeals(data as TeamDeal[])
    setLoading(false)
  }

  const summaries = useMemo(() => {
    const map = new Map<string, AgentSummary>()

    for (const d of deals) {
      if (!map.has(d.agent_id)) {
        map.set(d.agent_id, {
          agent_id: d.agent_id,
          full_name: d.full_name,
          totalPremium: 0,
          deals: 0,
        })
      }

      const s = map.get(d.agent_id)!
      s.totalPremium += d.premium || 0
      s.deals += 1
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalPremium - a.totalPremium
    )
  }, [deals])

  const totals = useMemo(() => {
    return {
      totalPremium: summaries.reduce((a, b) => a + b.totalPremium, 0),
      totalDeals: summaries.reduce((a, b) => a + b.deals, 0),
      agents: summaries.length,
    }
  }, [summaries])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Team View</h1>
          <p className="text-sm text-white/60 mt-1">
            Real-time production across the entire organization.
          </p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat label="Team Premium" value={`$${money(totals.totalPremium)}`} />
          <Stat label="Total Deals" value={totals.totalDeals.toString()} />
          <Stat label="Active Agents" value={totals.agents.toString()} />
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 bg-white/5 text-sm font-semibold">
            Leaderboard
          </div>

          <div className="grid grid-cols-5 px-6 py-3 text-xs text-white/60 bg-white/5">
            <div>#</div>
            <div className="col-span-2">Agent</div>
            <div>Deals</div>
            <div>Total Premium</div>
          </div>

          {loading && (
            <div className="px-6 py-10 text-center text-white/60">
              Loading team data…
            </div>
          )}

          {!loading &&
            summaries.map((a, i) => (
              <div
                key={a.agent_id}
                className="grid grid-cols-5 px-6 py-4 border-t border-white/10 hover:bg-white/5 transition"
              >
                <div className="font-semibold">
                  {i + 1}
                </div>

                <div className="col-span-2 font-medium">
                  {a.full_name}
                </div>

                <div>{a.deals}</div>

                <div className="font-semibold">
                  ${money(a.totalPremium)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-6 rounded-2xl border border-white/10">
      <div className="text-xs text-white/60 mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function money(n: number) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
