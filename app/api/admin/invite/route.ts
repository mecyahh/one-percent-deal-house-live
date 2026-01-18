// /app/api/admin/invite/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type InviteBody = {
  email: string
  first_name?: string
  last_name?: string
  role?: 'agent' | 'admin'
  is_agency_owner?: boolean
  upline_id?: string | null
  comp?: number
  theme?: string
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || ''
    if (!auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 })
    }

    // Verify caller session (anon client with caller token)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUserClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: userRes, error: userErr } = await supabaseUserClient.auth.getUser()
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const callerId = userRes.user.id

    // Check caller permissions (service role bypasses RLS)
    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role,is_agency_owner')
      .eq('id', callerId)
      .single()

    if (profErr || !callerProfile) {
      return NextResponse.json({ error: 'Caller profile missing' }, { status: 403 })
    }

    const isAllowed = callerProfile.role === 'admin' || callerProfile.is_agency_owner === true
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as InviteBody

    const email = (body.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const first_name = (body.first_name || '').trim() || null
    const last_name = (body.last_name || '').trim() || null
    const role = body.role === 'admin' ? 'admin' : 'agent'
    const is_agency_owner = !!body.is_agency_owner
    const upline_id = body.upline_id ? String(body.upline_id) : null
    const comp = Number.isFinite(Number(body.comp)) ? Number(body.comp) : 70
    const theme = (body.theme || 'blue').trim() || 'blue'

    // Invite via Supabase Auth (sends email)
    const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name },
    })

    if (inviteErr || !inviteRes?.user) {
      return NextResponse.json({ error: inviteErr?.message || 'Invite failed' }, { status: 400 })
    }

    const newUserId = inviteRes.user.id

    // Upsert profile row so data “sticks”
    const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: newUserId,
        email,
        first_name,
        last_name,
        role,
        is_agency_owner,
        upline_id,
        comp,
        theme,
      },
      { onConflict: 'id' }
    )

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
