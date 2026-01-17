'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id: string
  agent_id: string
  full_name: string | null
  premium: number | null
  created_at: string
}

type Agent = {
  agent_id: string
  name: string
  deals: number
  premium: number
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('deals')
      .select('id, agent_id, full_name, premium, created_at')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (!error && data) setRows(data as Row[])
    setLoading(false)
  }

  const agents = useMemo(() => {
    const map = new Map<string, Agent>()
    for (const r of rows) {
      const id = r.agent_id
      if (!id) continue
      if (!map.has(id)) {
        map.set(id, {
          agent_id: id,
          name: (r.full_name || 'Agent').trim(),
          deals: 0,
          premium: 0,
        })
      }
      const a = map.get(id)!
      a.deals += 1
      a.premium += Number(r.premium || 0)
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium)
  }, [rows])

  const top3 = agents.slice(0, 3)
  const rest = agents.slice(3)

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-white/60 mt-1">Top producers — updated live.</p>
        </div>

        {/* Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[0, 1, 2].map((i) => (
            <TopCard key={i} rank={i + 1} agent={top3[i]} loading={loading} />
          ))}
        </div>

        {/* List */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-5 px-6 py-3 text-xs text-white/60 bg-white/5">
            <div>#</div>
            <div className="col-span-2">Agent</div>
            <div>Deals</div>
            <div>Total Premium</div>
          </div>

          {loading && (
            <div className="px-6 py-10 text-center text-white/60">Loading…</div>
          )}

          {!loading && agents.length === 0 && (
            <div className="px-6 py-10 text-center text-white/60">No data yet.</div>
          )}

          {!loading &&
            rest.map((a, idx) => (
              <div
                key={a.agent_id}
                className="grid grid-cols-5 px-6 py-4 border-t border-white/10 hover:bg-white/5 transition"
              >
                <div className="font-semibold">{idx + 4}</div>
                <div className="col-span-2 font-medium">{a.name}</div>
                <div>{a.deals}</div>
                <div className="font-semibold">${money(a.premium)}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function TopCard({
  rank,
  agent,
  loading,
}: {
  rank: number
  agent?: { name: string; premium: number; deals: number }
  loading: boolean
}) {
  const label =
    rank === 1 ? '🏆 #1' : rank === 2 ? '🥈 #2' : '🥉 #3'

  return (
    <div className="glass p-6 rounded-2xl border border-white/10">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-3 text-2xl font-semibold">
        {loading ? 'Loading…' : agent?.name || '—'}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-white/70">
        <span>Deals: {loading ? '—' : agent?.deals ?? 0}</span>
        <span className="font-semibold">
          {loading ? '—' : `$${money(agent?.premium ?? 0)}`}
        </span>
      </div>
    </div>
  )
}

function money(n: number) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
