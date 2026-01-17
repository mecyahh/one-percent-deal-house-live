'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type DealRow = {
  id: string
  agent_id: string
  full_name: string | null
  premium: number | null
  company: string | null
  created_at: string
}

type Agent = {
  agent_id: string
  name: string
  deals: number
  premium: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<DealRow[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('deals')
      .select('id, agent_id, full_name, premium, company, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (data) setRows(data as DealRow[])
    setLoading(false)
  }

  const agents = useMemo(() => computeAgents(rows), [rows])
  const teamTotalPremium = useMemo(() => sumPremium(rows), [rows])
  const writingAgents = agents.length
  const topCarrier = useMemo(() => computeTopCarrier(rows), [rows])

  const todayCount = useMemo(() => countSince(rows, startOfToday()), [rows])
  const weekCount = useMemo(() => countSince(rows, startOfWeek()), [rows])
  const monthCount = useMemo(() => countSince(rows, startOfMonth()), [rows])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/60 mt-1">
            Live overview of team production.
          </p>
        </div>

        {/* TOP KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat label="Team Total Premium" value={`$${money(teamTotalPremium)}`} />
          <Stat label="Writing Agents" value={`${writingAgents}`} />
          <Stat label="Top Carrier" value={topCarrier || '—'} />
        </div>

        {/* DEAL COUNTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat label="Deals Submitted Today" value={loading ? '—' : `${todayCount}`} />
          <Stat label="Deals This Week" value={loading ? '—' : `${weekCount}`} />
          <Stat label="Deals This Month" value={loading ? '—' : `${monthCount}`} />
        </div>

        {/* LEADERBOARD PREVIEW */}
        <div className="glass rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Top Producers</div>
            <a
              href="/leaderboard"
              className="text-xs text-blue-400 hover:underline"
            >
              View full leaderboard →
            </a>
          </div>

          {agents.slice(0, 5).map((a, idx) => (
            <div
              key={a.agent_id}
              className="flex items-center justify-between py-3 border-t border-white/10 first:border-t-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-6 text-sm font-semibold">{idx + 1}</div>
                <div className="font-medium">{a.name}</div>
              </div>
              <div className="font-semibold">${money(a.premium)}</div>
            </div>
          ))}

          {!loading && agents.length === 0 && (
            <div className="text-sm text-white/60 py-6 text-center">
              No production yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-6 rounded-2xl border border-white/10">
      <div className="text-xs text-white/60 mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function computeAgents(rows: DealRow[]) {
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
}

function computeTopCarrier(rows: DealRow[]) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const c = (r.company || '').trim()
    if (!c) continue
    map.set(c, (map.get(c) || 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [k, v] of map.entries()) {
    if (v > bestCount) {
      best = k
      bestCount = v
    }
  }
  return best
}

function sumPremium(rows: DealRow[]) {
  return rows.reduce((a, r) => a + Number(r.premium || 0), 0)
}

function countSince(rows: DealRow[], since: Date) {
  const t = since.getTime()
  return rows.filter((r) => new Date(r.created_at).getTime() >= t).length
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function money(n: number) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
