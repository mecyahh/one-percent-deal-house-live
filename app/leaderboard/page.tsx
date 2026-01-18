// /app/leaderboard/page.tsx  (REPLACE ENTIRE FILE)
'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type DealRow = {
  id: string
  user_id: string
  created_at: string
  premium: any
}

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type DayCell = { label: string; iso: string; isSunday: boolean }

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const [deals, setDeals] = useState<DealRow[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)

      const { data: sessRes } = await supabase.auth.getSession()
      if (!sessRes.session?.user) {
        window.location.href = '/login'
        return
      }

      // GLOBAL: everyone sees entire agency leaderboard (all deals)
      const { data: d, error: dErr } = await supabase
        .from('deals')
        .select('id,user_id,created_at,premium')
        .order('created_at', { ascending: false })
        .limit(6000)

      if (!alive) return

      if (dErr) {
        setToast('Could not load deals (RLS)')
        setDeals([])
        setLoading(false)
        return
      }

      // load profiles for name mapping
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,email')
        .limit(5000)

      if (!alive) return

      if (pErr) {
        setToast('Could not load profiles')
        setProfiles([])
      } else {
        setProfiles((p || []) as ProfileRow[])
      }

      setDeals((d || []) as DealRow[])
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [])

  const now = new Date()

  const last7Days: DayCell[] = useMemo(() => {
    const out: DayCell[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const iso = toISODate(d)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      const isSunday = d.getDay() === 0
      out.push({ label, iso, isSunday })
    }
    return out
  }, [now])

  const parsedDeals = useMemo(() => {
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
        dayISO: toISODate(dt),
        premiumNum: Number.isFinite(premiumNum) ? premiumNum : 0,
      }
    })
  }, [deals])

  const nameByUserId = useMemo(() => {
    const m = new Map<string, string>()
    profiles.forEach((p) => {
      const n = `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim()
      if (n) m.set(p.id, n)
      else if (p.email) m.set(p.id, p.email.split('@')[0])
      else m.set(p.id, p.id.slice(0, 6))
    })
    return m
  }, [profiles])

  const tableRows = useMemo(() => {
    // user_id -> dayISO -> premiumSum
    const perUser = new Map<string, Map<string, number>>()

    for (const d of parsedDeals) {
      if (!perUser.has(d.user_id)) perUser.set(d.user_id, new Map())
      const m = perUser.get(d.user_id)!
      m.set(d.dayISO, (m.get(d.dayISO) || 0) + d.premiumNum)
    }

    const rows = Array.from(perUser.entries()).map(([user_id, dayMap]) => {
      const total = Array.from(dayMap.values()).reduce((s, v) => s + v, 0)
      const cells = last7Days.map((day) => {
        if (day.isSunday) return { type: 'sunday' as const, value: null }
        const v = dayMap.get(day.iso) || 0
        return { type: 'value' as const, value: v }
      })
      return {
        user_id,
        name: nameByUserId.get(user_id) || user_id.slice(0, 6),
        total,
        cells,
      }
    })

    rows.sort((a, b) => b.total - a.total)
    return rows
  }, [parsedDeals, last7Days, nameByUserId])

  const podium = useMemo(() => {
    const top3 = tableRows.slice(0, 3)
    // order: 2 left, 1 middle, 3 right
    return {
      one: top3[0] || null,
      two: top3[1] || null,
      three: top3[2] || null,
    }
  }, [tableRows])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className="glass px-5 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="text-sm font-semibold">{toast}</div>
            <div className="mt-3 flex gap-2">
              <button className={btnSoft} onClick={() => setToast(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ml-64 px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-white/60 mt-1">
            Global agency view — last 7 days by premium, plus totals.
          </p>
        </div>

        {/* PODIUM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <PodiumCard place={2} spot="left" row={podium.two} loading={loading} />
          <PodiumCard place={1} spot="middle" row={podium.one} loading={loading} spotlight />
          <PodiumCard place={3} spot="right" row={podium.three} loading={loading} />
        </div>

        {/* TABLE */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          {/* HEADER */}
          <div className="px-6 py-4 bg-white/5">
            <div className="grid items-center gap-3" style={{ gridTemplateColumns: `70px 240px repeat(7, 90px) 140px` }}>
              <div className="text-xs text-white/60 font-semibold">Rank</div>
              <div className="text-xs text-white/60 font-semibold">Agent</div>

              {last7Days.map((d) => (
                <div key={d.iso} className="text-xs text-white/60 font-semibold text-center">
                  {d.label}
                </div>
              ))}

              <div className="text-xs text-white/60 font-semibold text-right">Total</div>
            </div>
          </div>

          {/* BODY */}
          {loading && <div className="px-6 py-10 text-center text-white/60">Loading…</div>}

          {!loading && tableRows.length === 0 && (
            <div className="px-6 py-10 text-center text-white/60">No data.</div>
          )}

          {!loading && tableRows.length > 0 && (
            <div className="max-h-[640px] overflow-auto">
              {tableRows.map((r, idx) => (
                <div
                  key={r.user_id}
                  className="px-6 py-4 border-t border-white/10 hover:bg-white/5 transition"
                >
                  <div
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: `70px 240px repeat(7, 90px) 140px` }}
                  >
                    <div className="text-sm font-semibold">{idx + 1}</div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{r.name}</div>
                      <div className="text-[11px] text-white/50">Agent</div>
                    </div>

                    {r.cells.map((c, i) => (
                      <div key={i} className="text-center">
                        {c.type === 'sunday' ? (
                          <span className="text-white/35 font-semibold">--</span>
                        ) : c.value === 0 ? (
                          <span className="text-red-400 font-bold">0</span>
                        ) : (
                          <span className="font-semibold">${fmtMoney(c.value || 0)}</span>
                        )}
                      </div>
                    ))}

                    <div className="text-right font-semibold">${fmtMoney(r.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* keep blank (removed total premium last 7 days per your ask) */}
        <div className="mt-4 text-xs text-white/40">{' '}</div>
      </div>
    </div>
  )
}

function PodiumCard({
  place,
  row,
  loading,
  spotlight,
  spot,
}: {
  place: 1 | 2 | 3
  row: { name: string; total: number } | null
  loading: boolean
  spotlight?: boolean
  spot: 'left' | 'middle' | 'right'
}) {
  const isOne = place === 1
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border border-white/10 glass p-6',
        spot === 'middle' ? 'md:-mt-2 md:scale-[1.02]' : '',
      ].join(' ')}
    >
      {/* GOLD spotlight for #1 */}
      {spotlight && (
        <>
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[260px] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.28), rgba(255,215,0,0.10), transparent 70%)',
              filter: 'blur(2px)',
            }}
          />
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[220px] h-[220px] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 25%, rgba(255,215,0,0.40), rgba(255,215,0,0.12), transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55 font-semibold">#{place}</div>
        <div className="text-[11px] text-white/45">Podium</div>
      </div>

      <div className="mt-4">
        <div className={isOne ? 'text-xl font-semibold tracking-tight' : 'text-lg font-semibold tracking-tight'}>
          {loading ? '—' : row?.name || '—'}
        </div>

        <div className="mt-3">
          <div className="text-[11px] text-white/55">PREMIUM</div>
          <div className={isOne ? 'mt-1 text-3xl font-extrabold text-green-300' : 'mt-1 text-2xl font-bold text-green-300'}>
            {loading ? '—' : row ? `$${fmtMoney(row.total)}` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtMoney(n: number) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'
