// ✅ FILE: /app/api/admin/propagate-theme/route.ts  (CREATE THIS FILE)
// Owner/Admin only: pushes selected theme to ALL downlines (recursive)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'

function supabaseFromAuth(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  return {
    token,
    sb: createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }),
  }
}

function buildDownlineIds(all: any[], rootId: string) {
  const childrenByUpline = new Map<string, string[]>()
  for (const p of all) {
    if (!p.upline_id) continue
    if (!childrenByUpline.has(p.upline_id)) childrenByUpline.set(p.upline_id, [])
    childrenByUpline.get(p.upline_id)!.push(p.id)
  }

  const out: string[] = []
  const q: string[] = [rootId]
  const seen = new Set<string>([rootId])

  while (q.length) {
    const cur = q.shift()!
    const kids = childrenByUpline.get(cur) || []
    for (const kid of kids) {
      if (seen.has(kid)) continue
      seen.add(kid)
      out.push(kid)
      q.push(kid)
    }
  }
  return out
}

export async function POST(req: Request) {
  try {
    const { token, sb } = supabaseFromAuth(req)
    if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const { data: userRes, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 })
    const uid = userRes.user?.id
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const theme = String(body?.theme || '').trim()
    if (!theme) return NextResponse.json({ error: 'Missing theme' }, { status: 400 })

    const { data: me } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_agency_owner')
      .eq('id', uid)
      .single()

    const role = String(me?.role || '').toLowerCase()
    const isOwnerOrAdmin = !!me?.is_agency_owner || role === 'admin'
    if (!isOwnerOrAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: all, error: allErr } = await supabaseAdmin
      .from('profiles')
      .select('id,upline_id')
      .limit(10000)

    if (allErr) return NextResponse.json({ error: 'Could not load profiles' }, { status: 500 })

    const downlines = buildDownlineIds(all || [], uid)

    if (downlines.length === 0) {
      // still update self theme
      await supabaseAdmin.from('profiles').update({ theme }).eq('id', uid)
      return NextResponse.json({ ok: true, updated: 1 })
    }

    // update self + downlines
    const ids = [uid, ...downlines]
    const { error: upErr } = await supabaseAdmin.from('profiles').update({ theme }).in('id', ids)
    if (upErr) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({ ok: true, updated: ids.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
