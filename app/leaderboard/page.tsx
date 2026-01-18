'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  agent_id: string
  total_deals: number
  total_premium: number
  total_coverage: number
}

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  theme?: string | null
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    // 1) Aggregate leaderboard by agent_id (NOT client name)
    const { data: dealsAgg, error: dealsErr } = await supabase
      .from('deals')
      .select('agent_id, premium, coverage')
      .not('agent_id', 'is', null)
      .limit(5000)

    if (dealsErr) {
      setToast('Could not load deals')
      setLoading(false)
      return
    }

    const agg = new Map<string, Row>()

    for (const d of dealsAgg || []) {
      const agent_id = (d as any).agent_id as string
      if (!agent_id) continue

      const premium = Number((d as any).premium || 0)
      const coverage = Number((d as any).coverage || 0)

      const cur = agg.get(agent_id) || {
        agent_id,
        total_deals: 0,
        total_premium: 0,
        total_coverage: 0,
      }

      cur.total_deals += 1
      cur.total_premium += Number.isFinite(premium) ? premium : 0
      cur.total_coverage += Number.isFinite(coverage) ? coverage : 0

      agg.set(agent_id, cur)
    }

    const leaderboard = Array.from(agg.values()).sort((a, b) => b.total_deals - a.total_deals)
    setRows(leaderboard)

    // 2) Fetch matching profiles for display names
    const agentIds = leaderboard.map((r) => r.agent_id)
    if (agentIds.length === 0) {
      setProfiles({})
      setLoading(false)
      return
    }

    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, theme')
      .in('id', agentIds)

    if (profErr) {
      setToast('Could not load agent profiles')
      setLoading(false)
      return
    }

    const map: Record<string, Profile> = {}
    for (const p of profs || []) map[(p as any).id] = p as any
    setProfiles(map)

    setLoading(false)
  }

  const display = useMemo(() => {
    return rows.map((r, idx) => {
      const p = profiles[r.agent_id]
      const name = p
        ? `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email || 'Agent'
        : 'Agent'
      return { ...r, rank: idx + 1, name }
    })
  }, [rows, profiles])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className="glass px-5 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="text-sm font-semibold">{toast}</div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs" onClick={() => setToast(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ml-64 px-10 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-white/60 mt-1">Ranks are based on agent performance (never client names).</p>
          </div>
          <button onClick={load} className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10">
            Refresh
          </button>
        </div>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 bg-white/5 flex items-center justify-between">
            <div className="text-sm font-semibold">Top Agents</div>
            <div className="text-xs text-white/60">{display.length} agents</div>
          </div>

          {loading && <div className="px-6 py-10 text-center text-white/60">Loading…</div>}

          {!loading && display.length === 0 && (
            <div className="px-6 py-10 text-center text-white/60">No agent deals yet.</div>
          )}

          {!loading && display.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] text-white/55">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-3">Rank</th>
                    <th className="text-left px-6 py-3">Agent</th>
                    <th className="text-left px-6 py-3">Deals</th>
                    <th className="text-left px-6 py-3">Total Premium</th>
                    <th className="text-left px-6 py-3">Total Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {display.map((r) => (
                    <tr key={r.agent_id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="px-6 py-4 font-semibold">{r.rank}</td>
                      <td className="px-6 py-4 font-semibold">{r.name}</td>
                      <td className="px-6 py-4 text-white/80">{r.total_deals}</td>
                      <td className="px-6 py-4 text-white/80">${r.total_premium.toLocaleString()}</td>
                      <td className="px-6 py-4 text-white/80">${r.total_coverage.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
