// ✅ FILE: /app/dashboard/page.tsx  (REPLACE ENTIRE FILE)
// Fixes: client-side crash guard + auth handling + safer parsing + datepicker dropdown z-index + smaller KPI cards

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  email: string | null
  role: string
  is_agency_owner: boolean
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [me, setMe] = useState<Profile | null>(null)
  const [deals, setDeals] = useState<DealRow[]>([])

  // date picker (filters the top KPI cards only)
  const [dayPick, setDayPick] = useState<string>('') // YYYY-MM-DD

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setErr(null)
        setLoading(true)

        const { data: userRes, error: userErr } = await supabase.auth.getUser()
        if (userErr) throw new Error(`auth.getUser: ${userErr.message}`)

        const user = userRes.user
        if (!user) {
          window.location.href = '/login'
          return
        }

        // load my profile (for role logic + welcome name)
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id,first_name,last_name,email,role,is_agency_owner')
          .eq('id', user.id)
          .single()

        if (profErr) throw new Error(`profiles: ${profErr.message}`)
        if (!alive) return

        const profile = prof as Profile
        setMe(profile)

        // role logic:
        // - agent: only their deals
        // - admin/agency owner: all deals (team)
        let q = supabase.from('deals').select('id,user_id,created_at,premium,company').order('created_at', { ascending: false }).limit(800)

        const isTeam = profile.is_agency_owner || profile.role === 'admin'
        if (!isTeam) q = q.eq('user_id', user.id)

        const { data, error } = await q
        if (error) throw new Error(`deals: ${error.message}`)
        if (!alive) return

        setDeals(((data as DealRow[]) || []) as DealRow[])
        setLoading(false)
      } catch (e: any) {
        if (!alive) return
        setDeals([])
        setLoading(false)
        setErr(e?.message || 'Dashboard error')
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const now = useMemo(() => new Date(), [])

  const parsed = useMemo(() => {
    return (deals || []).map((d) => {
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
        premiumNum: Number.isFinite(premiumNum) ? premiumNum : 0,
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

  const todayStart = useMemo(() => startOfDay(new Date()), [])
  const weekStart = useMemo(() => startOfWeek(new Date()), [])
  const monthStart = useMemo(() => startOfMonth(new Date()), [])

  // KPI filter date (only affects KPI cards)
  const pickedStart = useMemo(() => {
    if (!dayPick) return null
    const [y, m, day] = dayPick.split('-').map((x) => Number(x))
    if (!y || !m || !day) return null
    return new Date(y, (m || 1) - 1, day || 1)
  }, [dayPick])

  const pickedEnd = useMemo(() => {
    if (!pickedStart) return null
    const next = new Date(pickedStart)
    next.setDate(pickedStart.getDate() + 1)
    return next
  }, [pickedStart])

  const todayDeals = useMemo(() => parsed.filter((d) => d.dt >= todayStart), [parsed, todayStart])
  const weekDeals = useMemo(() => parsed.filter((d) => d.dt >= weekStart), [parsed, weekStart])
  const monthDeals = useMemo(() => parsed.filter((d) => d.dt >= monthStart), [parsed, monthStart])

  const todaysProduction = useMemo(() => todayDeals.reduce((s, d) => s + d.premiumNum, 0), [todayDeals])
  const weeksProduction = useMemo(() => weekDeals.reduce((s, d) => s + d.premiumNum, 0), [weekDeals])
  const monthsProduction = useMemo(() => monthDeals.reduce((s, d) => s + d.premiumNum, 0), [monthDeals])

  const kpiDeals = useMemo(() => {
    if (!pickedStart || !pickedEnd) {
      return { today: todaysProduction, week: weeksProduction, month: monthsProduction }
    }
    const dayDeals = parsed.filter((d) => d.dt >= pickedStart && d.dt < pickedEnd)
    const dayProd = dayDeals.reduce((s, d) => s + d.premiumNum, 0)
    return { today: dayProd, week: weeksProduction, month: monthsProduction }
  }, [pickedStart, pickedEnd, parsed, todaysProduction, weeksProduction, monthsProduction])

  const writingAgents = useMemo(() => {
    const uniq = new Set(monthDeals.map((d) => d.user_id))
    return uniq.size
  }, [monthDeals])

  const dealsSubmitted = useMemo(() => monthDeals.length, [monthDeals])

  const last7 = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(new Date().getDate() - i)
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

  const weeklyGoal = 20
  const monthlyGoal = 90

  const welcomeName = useMemo(() => {
    const n = `${me?.first_name || ''} ${me?.last_name || ''}`.trim()
    return n || me?.email || 'Agent'
  }, [me])

  if (err) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white">
        <Sidebar />
        <div className="ml-64 px-10 py-10">
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="text-2xl font-semibold">Dashboard</div>
            <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm">
              <div className="font-semibold text-red-200">Application error</div>
              <div className="mt-1 text-red-100/80">{err}</div>
              <div className="mt-3 text-xs text-white/60">
                If this keeps happening: log out / log in, then refresh.
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-xl border border-white/10"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
              <a
                href="/login"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition"
              >
                Go to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64">
        <header className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-white/60 mt-1">Welcome Back {welcomeName}</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-xl border border-white/10">
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
          {/* ✅ DATE PICKER (own row) */}
          <div className="mb-4 relative z-[60] overflow-visible">
            <div className="glass p-4 max-w-[280px] rounded-2xl border border-white/10">
              <div className="text-[11px] text-white/55 mb-2">Pick day (for Today KPI)</div>
              <FlowDatePicker value={dayPick} onChange={setDayPick} />
            </div>
          </div>

          {/* ✅ TOP KPI CARDS (smaller) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MiniStat label="Production" value={loading ? '—' : `$${formatMoney(monthsProduction)}`} small />
            <MiniStat label="Writing Agents" value={loading ? '—' : String(writingAgents)} small />
            <MiniStat label="Deals Submitted" value={loading ? '—' : String(dealsSubmitted)} small />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/10">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <KPI title="Today’s production" value={loading ? '—' : `$${formatMoney(kpiDeals.today)}`} />
                <KPI title="This weeks production" value={loading ? '—' : `$${formatMoney(kpiDeals.week)}`} />
                <KPI title="This months production" value={loading ? '—' : `$${formatMoney(kpiDeals.month)}`} />
              </div>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Leaderboard</h2>

                {/* ✅ link to full leaderboard */}
                <Link href="/leaderboard" className="text-xs text-white/60 hover:text-white">
                  All results →
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5">
                <CarrierDonut labels={carrierDist.labels} values={carrierDist.values} />
              </div>

              {/* ✅ keep you visible at top */}
              <div className="space-y-3">
                <Leader rank={0} name={welcomeName} amount={loading ? '—' : `$${formatMoney(monthsProduction)}`} highlight />
              </div>

              <div className="mt-4 text-xs text-white/50">Top 5 leaderboard loads on /leaderboard.</div>
            </div>
          </section>

          <section className="mt-6 glass p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent Activity</h2>
              <span className="text-xs text-white/60">Latest submissions</span>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <Row head left="Agent" mid="Premium" right="Time" />
              {(loading ? [] : parsed.slice(0, 8)).map((d) => (
                <Row key={d.id} left="—" mid={`$${formatMoney(d.premiumNum)}`} right={timeHour(d.dt)} />
              ))}
              {!loading && parsed.length === 0 && <Row left="—" mid="No deals yet" right="—" />}
            </div>

            <div className="mt-2 text-[11px] text-white/45">
              (Agent names display in the leaderboard page; this table stays lightweight.)
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

/* ---------- components ---------- */

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/60">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{value}</span>
      </div>
    </div>
  )
}

function MiniStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={`glass rounded-2xl border border-white/10 ${small ? 'p-4' : 'p-6'}`}>
      <p className="text-sm text-white/60">{label}</p>
      <p className={`font-semibold mt-1 ${small ? 'text-xl' : 'text-2xl'}`}>{value}</p>
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
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
            highlight ? 'bg-blue-600' : 'bg-white/10'
          }`}
        >
          {rank === 0 ? 'ME' : rank}
        </div>
        <div className="min-w-0">
          <div className={`${highlight ? 'text-base font-semibold' : 'text-sm font-medium'} truncate`}>{name}</div>
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
      <div className="text-center truncate">{mid}</div>
      <div className="text-right whitespace-nowrap">{right}</div>
    </div>
  )
}

/* ---------- helpers ---------- */

function formatMoney(n: number) {
  const num = Number(n || 0)
  return Math.round(num).toLocaleString()
}

function timeHour(d: Date) {
  try {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return '—'
  }
}
