// /app/dashboard/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import FlowLineChart from '../components/FlowLineChart'
import CarrierDonut from '../components/CarrierDonut'
import GoalDonuts from '../components/GoalDonuts'
import FlowDatePicker from '@/app/components/FlowDatePicker'
import { supabase } from '@/lib/supabaseClient'

type DealRow = {
  id: string
  user_id: string
  created_at: string
  premium: any
  company: string | null
}

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  role: string | null
  is_agency_owner: boolean | null
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<DealRow[]>([])
  const [me, setMe] = useState<Profile | null>(null)

  // glass date picker (filter just the KPI production cards)
  const [dayPick, setDayPick] = useState<string>('')

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)

      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,role,is_agency_owner')
        .eq('id', user.id)
        .single()

      const p = (prof || {
        id: user.id,
        first_name: null,
        last_name: null,
        role: 'agent',
        is_agency_owner: false,
      }) as Profile

      if (!alive) return
      setMe(p)

      const isOwner = !!p.is_agency_owner || (p.role || '').toLowerCase() === 'admin'

      // OWNER/ADMIN: all deals (team)
      // AGENT: only their own deals
      let q = supabase
        .from('deals')
        .select('id,user_id,created_at,premium,company')
        .order('created_at', { ascending: false })
        .limit(2000)

      if (!isOwner) q = q.eq('user_id', user.id)

      const { data, error } = await q

      if (!alive) return

      if (error) {
        setDeals([])
        setLoading(false)
        return
      }

      setDeals((data as DealRow[]) || [])
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [])

  const now = new Date()

  const parsed = useMemo(() => {
    return deals.map((d) => {
      const dt = d.created_at ? new Date(d.created_at) : new Date()
      const premiumNum =
        typeof d.premium === 'number'
          ? d.premium
          : typeof d.premium === 'string'
            ? Number(d.premium.replace(/[^0-9.]/g, ''))
            : Number(d.premium || 0)

      return {
        ...d,
        dt,
        premiumNum: isNaN(premiumNum) ? 0 : premiumNum,
        companySafe: (d.company || 'Other').trim() || 'Other',
      }
    })
  }, [deals])

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const startOfWeek = (d: Date) => {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const base = new Date(d)
    base.setDate(d.getDate() + diff)
    return startOfDay(base)
  }
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  const todayDeals = useMemo(() => parsed.filter((d) => d.dt >= todayStart), [parsed, todayStart])
  const weekDeals = useMemo(() => parsed.filter((d) => d.dt >= weekStart), [parsed, weekStart])
  const monthDeals = useMemo(() => parsed.filter((d) => d.dt >= monthStart), [parsed, monthStart])

  // Production (month) for the top 3 mini stats
  const monthProduction = useMemo(
    () => monthDeals.reduce((s, d) => s + d.premiumNum, 0),
    [monthDeals]
  )

  // Writing Agents (unique writers in month)
  const writingAgents = useMemo(() => {
    const uniq = new Set(monthDeals.map((d) => d.user_id))
    return uniq.size
  }, [monthDeals])

  // Deals submitted (month) — replaces "Top Carrier" at top
  const monthDealCount = useMemo(() => monthDeals.length, [monthDeals])

  // last 7 days count line
  const last7 = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dStart = startOfDay(d)
      const next = new Date(dStart)
      next.setDate(dStart.getDate() + 1)

      const count = parsed.filter((x) => x.dt >= dStart && x.dt < next).length
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      days.push({ label, count })
    }
    return days
  }, [parsed])

  const lineLabels = useMemo(() => last7.map((x) => x.label), [last7])
  const lineValues = useMemo(() => last7.map((x) => x.count), [last7])

  // carrier dist donut
  const carrierDist = useMemo(() => {
    const map = new Map<string, number>()
    monthDeals.forEach((d) => map.set(d.companySafe, (map.get(d.companySafe) || 0) + 1))
    const entries = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    const labels = entries.length ? entries.map((e) => e[0]) : ['No Data']
    const values = entries.length ? entries.map((e) => e[1]) : [100]
    return { labels, values }
  }, [monthDeals])

  // KPI production cards — filtered by optional dayPick
  const kpiWindow = useMemo(() => {
    if (!dayPick) return null
    const d = parseISO(dayPick)
    const start = startOfDay(d)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    return { start, end }
  }, [dayPick])

  const kpiTodayProduction = useMemo(() => {
    if (kpiWindow) {
      return parsed
        .filter((d) => d.dt >= kpiWindow.start && d.dt < kpiWindow.end)
        .reduce((s, d) => s + d.premiumNum, 0)
    }
    return todayDeals.reduce((s, d) => s + d.premiumNum, 0)
  }, [kpiWindow, parsed, todayDeals])

  const kpiWeekProduction = useMemo(() => {
    if (kpiWindow) {
      // for a picked day, "This Week" = that week containing the picked day
      const base = kpiWindow.start
      const ws = startOfWeek(base)
      return parsed.filter((d) => d.dt >= ws && d.dt < kpiWindow.end).reduce((s, d) => s + d.premiumNum, 0)
    }
    return weekDeals.reduce((s, d) => s + d.premiumNum, 0)
  }, [kpiWindow, parsed, weekDeals])

  const kpiMonthProduction = useMemo(() => {
    if (kpiWindow) {
      const ms = startOfMonth(kpiWindow.start)
      return parsed.filter((d) => d.dt >= ms && d.dt < kpiWindow.end).reduce((s, d) => s + d.premiumNum, 0)
    }
    return monthDeals.reduce((s, d) => s + d.premiumNum, 0)
  }, [kpiWindow, parsed, monthDeals])

  const weeklyGoal = 20
  const monthlyGoal = 90

  const name = useMemo(() => {
    const n = `${me?.first_name || ''} ${me?.last_name || ''}`.trim()
    return n || 'Agent'
  }, [me])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64">
        <header className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-white/60 mt-1">Welcome back {name}.</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition">
              Notifications
            </button>
            <a
              href="/post-deal"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition"
            >
              Post a Deal
            </a>
          </div>
        </header>

        <main className="px-10 pb-12">
          {/* Mini stats (smaller) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MiniStat label="Production" value={loading ? '—' : `$${formatMoney(monthProduction)}`} />
            <MiniStat label="Writing Agents" value={loading ? '—' : String(writingAgents)} />
            <MiniStat label="Deals Submitted" value={loading ? '—' : String(monthDealCount)} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass p-6 overflow-visible">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Flow Trend</h2>
                <span className="text-xs text-white/60">Last 7 days</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <FlowLineChart labels={lineLabels} values={lineValues} />
              </div>

              <div className="mt-6">
                <GoalDonuts
                  weeklyCurrent={weekDeals.length}
                  weeklyGoal={weeklyGoal}
                  monthlyCurrent={monthDeals.length}
                  monthlyGoal={monthlyGoal}
                />
              </div>

              {/* Date picker as its own entity above KPI cards */}
              <div className="mt-6">
                <div className="text-xs text-white/55 mb-2">Filter KPI production by day (optional)</div>
                <div className="max-w-[220px] relative z-50">
                  <FlowDatePicker value={dayPick} onChange={setDayPick} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <KPI title="Today" value={loading ? '—' : `$${formatMoney(kpiTodayProduction)}`} sub="Today’s production" />
                <KPI title="This Week" value={loading ? '—' : `$${formatMoney(kpiWeekProduction)}`} sub="This weeks production" />
                <KPI title="This Month" value={loading ? '—' : `$${formatMoney(kpiMonthProduction)}`} sub="This months production" />
              </div>
            </div>

            <div className="glass p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Leaderboard</h2>
                <a
                  href="/leaderboard"
                  className="text-xs text-white/70 hover:text-white transition underline underline-offset-4"
                >
                  All results →
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5">
                <CarrierDonut labels={carrierDist.labels} values={carrierDist.values} />
              </div>

              {/* keep "you" at top, but prevent overflow */}
              <div className="space-y-3">
                <Leader
                  rank={1}
                  name={name}
                  amount={loading ? '—' : `$${formatMoney(monthProduction)}`}
                  highlight
                />
              </div>

              <div className="mt-4 text-xs text-white/50">
                Full agency leaderboard is in Leaderboard.
              </div>
            </div>
          </section>

          <section className="mt-6 glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent Activity</h2>
              <span className="text-xs text-white/60">Latest submissions</span>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Requested: Carrier -> Agent Name (best available is user_id unless you joined profiles elsewhere) */}
              <Row head left="Agent" mid="Premium" right="Time" />
              {(loading ? [] : parsed.slice(0, 6)).map((d) => (
                <Row
                  key={d.id}
                  left={d.user_id}
                  mid={`$${formatMoney(d.premiumNum)}`}
                  right={timeHour(d.dt)}
                />
              ))}
              {!loading && parsed.length === 0 && <Row left="—" mid="No deals yet" right="—" />}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function KPI({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/60">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <div className="text-xs text-white/50 mt-1">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  )
}

function Leader({
  rank,
  name,
  amount,
  highlight,
}: {
  rank: number
  name: string
  amount: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 ${
        highlight ? 'bg-white/10' : 'bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
            highlight ? 'bg-blue-600' : 'bg-white/10'
          }`}
        >
          {rank}
        </div>
        <div className="min-w-0">
          <div className={`${highlight ? 'text-base font-semibold' : 'text-sm font-medium'} truncate`}>
            {name}
          </div>
          <div className="text-xs text-white/50">Monthly production</div>
        </div>
      </div>

      <div className={`${highlight ? 'text-lg font-semibold' : 'text-sm font-semibold'} text-green-400 whitespace-nowrap`}>
        {amount}
      </div>
    </div>
  )
}

function Row({
  head,
  left,
  mid,
  right,
}: {
  head?: boolean
  left: string
  mid: string
  right: string
}) {
  return (
    <div
      className={`grid grid-cols-3 px-4 py-3 border-b border-white/10 ${
        head ? 'text-xs text-white/60 bg-white/5' : 'text-sm'
      }`}
    >
      <div className="truncate">{left}</div>
      <div className="text-center">{mid}</div>
      <div className="text-right">{right}</div>
    </div>
  )
}

function formatMoney(n: number) {
  return Math.round(n).toLocaleString()
}

function timeHour(d: Date) {
  // show by hour like "1:45 AM"
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map((x) => Number(x))
  return new Date(y, (m || 1) - 1, d || 1)
}
