'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [toast, setToast] = useState<string | null>(null)

  const chimeRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    load(false)

    const id = setInterval(() => {
      load(true)
    }, 15000)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(announceIfChanged: boolean) {
    const { data, error } = await supabase
      .from('deals')
      .select('id, agent_id, full_name, premium, company, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error || !data) {
      setLoading(false)
      return
    }

    const nextRows = data as DealRow[]
    const nextTop = computeAgents(nextRows)[0]

    if (announceIfChanged && nextTop?.agent_id) {
      const key = 'flow_leader_top1'
      const prev = localStorage.getItem(key)

      if (!prev) {
        localStorage.setItem(key, nextTop.agent_id)
      } else if (prev !== nextTop.agent_id) {
        localStorage.setItem(key, nextTop.agent_id)
        const msg = `🏆 New #1: ${nextTop.name}`
        setToast(msg)
        playChime()
        notify(msg)
      }
    }

    setRows(nextRows)
    setLoading(false)
  }

  function playChime() {
    try {
      if (!chimeRef.current) chimeRef.current = new Audio('/chime.mp3')
      chimeRef.current.currentTime = 0
      chimeRef.current.play().catch(() => {})
    } catch {}
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return
    await Notification.requestPermission()
  }

  function notify(message: string) {
    try {
      if (!('Notification' in window)) return
      if (Notification.permission !== 'granted') return
      new Notification('Flow', { body: message })
    } catch {}
  }

  const agents = useMemo(() => computeAgents(rows), [rows])
  const topCarrier = useMemo(() => computeTopCarrier(rows), [rows])

  const todayCount = useMemo(() => countSince(rows, startOfToday()), [rows])
  const weekCount = useMemo(() => countSince(rows, startOfWeek()), [rows])
  const monthCount = useMemo(() => countSince(rows, startOfMonth()), [rows])

  const teamTotalPremium = useMemo(() => sumPremium(rows), [rows])
  const writingAgents = agents.length

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      {/* Dashboard toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className="glass px-5 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="text-sm font-semibold">{toast}</div>
            <div className="text-xs text-white/60 mt-1">Leaderboard shift detected.</div>

            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs"
                onClick={() => setToast(null)}
              >
                Dismiss
              </button>
              <button
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 transition px-3 py-2 text-xs font-semibold"
                onClick={() => {
                  setToast(null)
                  window.location.href = '/leaderboard'
                }}
              >
                View Board
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ml-64 px-10 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-white/60 mt-1">
              Live signal on production.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={enableNotifications}
              className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
              title="Enable browser notifications"
            >
              Enable Alerts
            </button>
            <button
              onClick={() => load(true)}
              className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat label="Team Total Premium" value={`$${money(teamTotalPremium)}`} />
          <Stat label="Writing Agents" value={`${writingAgents}`} />
          <Stat label="Top Carrier" value={topCarrier || 'No data'} />
        </div>

        {/* FLOW TREND + KPI SWAP (deals today/week/month) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">Flow Trend</div>
                <div className="text-xs text-white/60 mt-1">Deals per day (last 14 days)</div>
              </div>
              <div className="text-xs text-white/50">{loading ? 'Loading…' : 'Live'}</div>
            </div>

            <FlowMiniChart rows={rows} />
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 gap-6">
            <Stat label="Deals Submitted Today" value={loading ? '—' : `${todayCount}`} />
            <Stat label="Deals This Week" value={loading ? '—' : `${weekCount}`} />
            <Stat label="Deals This Month" value={loading ? '—' : `${monthCount}`} />
          </div>
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

/** simple “stocks-like” mini line */
function FlowMiniChart({ rows }: { rows: DealRow[] }) {
  const points = useMemo(() => {
    const days = 14
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (days - 1))

    const bucket = new Array(days).fill(0)

    for (const r of rows) {
      const d = new Date(r.created_at)
      d.setHours(0, 0, 0, 0)
      const idx = Math.floor((d.getTime() - start.getTime()) / 86400000)
      if (idx >= 0 && idx < days) bucket[idx] += 1
    }

    const max = Math.max(1, ...bucket)
    return bucket.map((v) => Math.round((v / max) * 60) + 6) // 6..66
  }, [rows])

  const trend = useMemo(() => {
    if (points.length < 2) return 'flat'
    const a = points[points.length - 2]
    const b = points[points.length - 1]
    if (b > a) return 'up'
    if (b < a) return 'down'
    return 'flat'
  }, [points])

  const stroke =
    trend === 'up' ? 'stroke-green-400' : trend === 'down' ? 'stroke-red-400' : 'stroke-blue-400'

  const d = useMemo(() => {
    const w = 700
    const h = 90
    const step = w / (points.length - 1 || 1)
    return points
      .map((y, i) => {
        const x = i * step
        const yy = h - y
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${yy.toFixed(2)}`
      })
      .join(' ')
  }, [points])

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <svg viewBox="0 0 700 90" className="w-full h-[120px]">
        <path d={d} fill="none" className={`${stroke}`} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="mt-3 text-xs text-white/60">
        Trend: <span className="text-white/80 font-semibold">{trend.toUpperCase()}</span>
      </div>
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
  const day = d.getDay() // 0 Sun
  const diff = (day + 6) % 7 // Mon as start
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
