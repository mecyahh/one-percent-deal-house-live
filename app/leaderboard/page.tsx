'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type DealRow = {
  id: string
  user_id: string | null
  created_at: string
  premium: any
  company: string | null
}

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type LeaderRow = {
  user_id: string
  name: string
  ap: number
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [range, setRange] = useState<'week' | 'month'>('week')

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        setToast(null)

        const { data: uRes, error: uErr } = await supabase.auth.getUser()
        if (uErr) throw new Error(uErr.message)
        if (!uRes.user) {
          window.location.href = '/login'
          return
        }

        const rows = await buildLeaders(range)
        if (!alive) return

        setLeaders(rows)
        setLoading(false)
      } catch (e: any) {
        if (!alive) return
        setLoading(false)
        setToast(e?.message || 'Leaderboard failed to load')
      }
    })()

    return () => {
      alive = false
    }
  }, [range])

  async function buildLeaders(mode: 'week' | 'month'): Promise<LeaderRow[]> {
    const now = new Date()

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const startOfWeek = (d: Date) => {
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const base = new Date(d)
      base.setDate(d.getDate() + diff)
      return startOfDay(base)
    }
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

    const start = mode === 'week' ? startOfWeek(now) : startOfMonth(now)

    // Pull deals in range (global / agency)
    const { data: ds, error } = await supabase
      .from('deals')
      .select('id,user_id,created_at,premium,company')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false })
      .limit(100000)

    if (error) throw new Error(error.message)
    const deals = (ds || []) as DealRow[]

    // Sum AP by user_id
    const sums = new Map<string, number>()
    for (const d of deals) {
      const uid = d.user_id
      if (!uid) continue
      const ap = toPremium(d.premium)
      sums.set(uid, (sums.get(uid) || 0) + ap)
    }

    const top = Array.from(sums.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // show more than top5 on full leaderboard

    const ids = top.map((t) => t[0])
    if (!ids.length) return []

    // Load profile names
    const { data: ps, error: pErr } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,email')
      .in('id', ids)
      .limit(5000)

    if (pErr) throw new Error(pErr.message)

    const pmap = new Map<string, ProfileRow>()
    ;((ps || []) as ProfileRow[]).forEach((p) => pmap.set(p.id, p))

    return top.map(([uid, ap]) => {
      const p = pmap.get(uid)
      const name =
        [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() ||
        (p?.email ? String(p.email).split('@')[0] : '—')
      return { user_id: uid, name, ap }
    })
  }

  const podium = useMemo(() => leaders.slice(0, 3), [leaders])
  const rest = useMemo(() => leaders.slice(3, 25), [leaders])

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
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-white/60 mt-1">Agency standings (global).</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRange('week')}
              className={[
                'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                range === 'week' ? 'bg-white/10 border-white/15' : 'bg-white/5 border-white/10 hover:bg-white/10',
              ].join(' ')}
            >
              This Week
            </button>
            <button
              onClick={() => setRange('month')}
              className={[
                'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                range === 'month' ? 'bg-white/10 border-white/15' : 'bg-white/5 border-white/10 hover:bg-white/10',
              ].join(' ')}
            >
              This Month
            </button>

            <Link href="/dashboard" className={btnGlass}>
              Back
            </Link>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          {loading ? (
            <div className="px-6 py-10 text-center text-white/60">Loading…</div>
          ) : leaders.length === 0 ? (
            <div className="px-6 py-10 text-center text-white/60">No results yet.</div>
          ) : (
            <>
              {/* Podium row: 2 left, 1 center (pop), 3 right */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <PodiumCard rank={2} row={podium[1]} />
                <PodiumCard rank={1} row={podium[0]} spotlight />
                <PodiumCard rank={3} row={podium[2]} />
              </div>

              {/* Full list */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-3 border-b border-white/10 text-[11px] text-white/60 bg-white/5">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-7">Agent</div>
                  <div className="col-span-3 text-right">AP</div>
                </div>

                {leaders.slice(0, 25).map((r, idx) => (
                  <div
                    key={r.user_id}
                    className="grid grid-cols-12 px-4 py-3 border-b border-white/10 text-sm"
                  >
                    <div className="col-span-2 font-semibold">{idx + 1}</div>
                    <div className="col-span-7 text-white/85">{r.name}</div>
                    <div className="col-span-3 text-right font-semibold text-green-400">
                      ${formatMoney(r.ap)}
                    </div>
                  </div>
                ))}
              </div>

              {rest.length > 0 && <div className="mt-4 text-xs text-white/50">Showing top 25.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PodiumCard({
  rank,
  row,
  spotlight,
}: {
  rank: number
  row?: { name: string; ap: number }
  spotlight?: boolean
}) {
  const name = row?.name || '—'
  const ap = row?.ap ?? 0

  return (
    <div
      className={[
        'rounded-2xl border border-white/10 p-5',
        spotlight ? 'bg-white/10 scale-[1.03] shadow-2xl' : 'bg-white/5',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/60">#{rank}</div>
        {spotlight ? <div className="text-[11px] text-yellow-300/90">GOLD SPOTLIGHT</div> : null}
      </div>

      <div className="mt-2 text-lg font-semibold">{name}</div>
      <div className={spotlight ? 'mt-2 text-3xl font-semibold text-green-400' : 'mt-2 text-2xl font-semibold text-green-400'}>
        ${formatMoney(ap)}
      </div>
    </div>
  )
}

function formatMoney(n: number) {
  return Math.round(n).toLocaleString()
}

function toPremium(p: any) {
  const n =
    typeof p === 'number'
      ? p
      : typeof p === 'string'
      ? Number(p.replace(/[^0-9.]/g, ''))
      : Number(p || 0)
  return Number.isFinite(n) ? n : 0
}

const btnSoft = 'rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-xs'
const btnGlass = 'glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition rounded-2xl border border-white/10'
