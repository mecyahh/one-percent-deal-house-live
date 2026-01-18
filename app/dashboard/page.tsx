// /app/dashboard/page.tsx  (REPLACE ENTIRE FILE)
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

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  is_agency_owner: boolean | null
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<ProfileRow | null>(null)
  const [roleMode, setRoleMode] = useState<'agent' | 'team'>('agent')
  const [deals, setDeals] = useState<DealRow[]>([])
  const [dayPick, setDayPick] = useState<string>('') // YYYY-MM-DD

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)

      const { data: sessRes } = await supabase.auth.getSession()
      const session = sessRes.session
      if (!session?.user) {
        window.location.href = '/login'
        return
      }
      const uid = session.user.id

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,email,role,is_agency_owner')
        .eq('id', uid)
        .single()

      if (!alive) return

      const profile = (profErr ? null : (prof as ProfileRow)) || null
      setMe(profile)

      const isTeam =
        (profile?.role || '').toLowerCase() === 'admin' || Boolean(profile?.is_agency_owner)

      setRoleMode(isTeam ? 'team' : 'agent')

      let q = supabase
        .from('deals')
        .select('id,user_id,created_at,premium,company')
        .order('created_at', { ascending: false })
        .limit(3000)

      if (!isTeam) q = q.eq('user_id', uid)

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

  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  const todayDeals = useMemo(() => parsed.filter((d) => d.dt >= todayStart), [parsed, todayStart])
  const weekDeals = useMemo(() => parsed.filter((d) => d.dt >= weekStart), [parsed, weekStart])
  const monthDeals = useMemo(() => parsed.filter((d) => d.dt >= monthStart), [parsed, monthStart])

  // KPI mode (optional day filter)
  const pickedRange = useMemo(() => {
    if (!dayPick) return null
    const [y, m, dd] = dayPick.split('-').map((x) => Number(x))
    const start = new Date(y, (m || 1) - 1, dd || 1)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    return { start, end }
  }, [dayPick])

  const kpiDeals = useMemo(() => {
    if (!pickedRange) return monthDeals
    return parsed.filter((d) => d.dt >= pickedRange.start && d.dt < pickedRange.end)
  }, [pickedRange, parsed, monthDeals])

  const production = useMemo(
    () => kpiDeals.reduce((s, d) => s + d.premiumNum, 0),
    [kpiDeals]
  )

  const writingAgents = useMemo(() => {
    const uniq = new Set(kpiDeals.map((d) => d.user_id))
    return uniq.size
  }, [kpiDeals])

  const dealsSubmitted = useMemo(() => kpiDeals.length, [kpiDeals])

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
  }, [parsed, now])

  const lineLabels = useMemo(() => last7.map((x) => x.label), [last7])
  const lineValues = useMemo(() => last7.map((x) => x.count), [last7])

  const carrierDist = useMemo(() => {
    const map = new Map<string, number>()
    monthDeals.forEach((d) => map.set(d.companySafe, (map.get(d.companySafe) || 0) + 1))
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const labels = entries.length ? entries.map((e) => e[0]) : ['No Data']
    const values = entries.length ? entries.map((e) => e[1]) : [100]
    return { labels, values }
  }, [monthDeals])

  const weeklyGoal = 20
  const monthlyGoal = 90

  const welcomeName = useMemo(() => {
    const full = `${me?.first_name || ''} ${me?.last_name || ''}`.trim()
    return full || (me?.email ? me.email.split('@')[0] : 'Agent')
  }, [me])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 overflow-visible">
        <header className="px-10 pt-10 pb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-white/60 mt-1">Welcome Back {welcomeName}</p>
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

        <main className="px-10 pb-12 overflow-visible">
          {/* DATE PICKER ENTITY (FIX: sits ABOVE cards + high z-index + overflow visible) */}
          <section className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">
                Viewing: {dayPick ? prettyDate(dayPick) : 'This month'} • Mode:{' '}
                {roleMode === 'team' ? 'TEAM' : 'AGENT'}
              </div>

              {/* IMPORTANT: keep this wrapper out of any overflow-hidden cards */}
              <div className="relative z-[9999] w-[220px] overflow-visible">
                <FlowDatePicker value={dayPick} onChange={setDayPick} />
              </div>
            </div>
          </section>

          {/* TOP KPI CARDS (smaller) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MiniStat label="Production" value={loading ? '—' : `$${formatMoney(production)}`} compact />
            <MiniStat label="Writing Agents" value={loading ? '—' : String(writingAgents)} compact />
            <MiniStat label="Deals Submitted" value={loading ? '—' : String(dealsSubmitted)} compact />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <KPI
                  title="Today’s production"
                  value={loading ? '—' : `$${formatMoney(todayDeals.reduce((s, d) => s + d.premiumNum, 0))}`}
                />
                <KPI
                  title="This weeks production"
                  value={loading ? '—' : `$${formatMoney(weekDeals.reduce((s, d) => s + d.premiumNum, 0))}`}
                />
                <KPI
                  title="This months production"
                  value={loading ? '—' : `$${formatMoney(monthDeals.reduce((s, d) => s + d.premiumNum, 0))}`}
                />
              </div>
            </div>

            <div className="glass p-6 overflow-visible">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Leaderboard</h2>

                {/* FIX: link, no overflow */}
                <Link href="/leaderboard" className="text-xs text-white/60 hover:text-white transition">
                  All results →
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5 overflow-visible">
                <CarrierDonut labels={carrierDist.labels} values={carrierDist.values} />
              </div>

              {/* always show me first, then top 5 (placeholder until full leaderboard fetch is plugged in here) */}
              <div className="space-y-3">
                <Leader rank={1} name={welcomeName} amount={loading ? '—' : `$${formatMoney(production)}`} highlight />
              </div>

              <div className="mt-4 text-xs text-white/50">
                Full agency leaderboard is on the Leaderboard page.
              </div>
            </div>
          </section>

          <section className="mt-6 glass p-6 overflow-visible">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent Activity</h2>
              <span className="text-xs text-white/60">Latest submissions</span>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <Row head left="Agent" mid="Premium" right="Time" />
              {(loading ? [] : parsed.slice(0, 6)).map((d) => (
                <Row key={d.id} left={d.user_id.slice(0, 6)} mid={`$${formatMoney(d.premiumNum)}`} right={hourTime(d.dt)} />
              ))}
              {!loading && parsed.length === 0 && <Row left="—" mid="No deals yet" right="—" />}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/60">{title}</p>
      <div className="mt-2">
        <span className="text-3xl font-semibold">{value}</span>
      </div>
    </div>
  )
}

function MiniStat({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`glass ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-sm text-white/60">{label}</p>
      <p className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold mt-1`}>{value}</p>
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

      <div className={`${highlight ? 'text-lg' : 'text-sm'} font-semibold text-green-400 whitespace-nowrap`}>
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

function hourTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function prettyDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
}
