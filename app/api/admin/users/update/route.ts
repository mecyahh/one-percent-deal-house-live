import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const user_id = String(body.user_id || '').trim()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const first_name = body.first_name === undefined ? undefined : String(body.first_name || '').trim()
    const last_name = body.last_name === undefined ? undefined : String(body.last_name || '').trim()
    const role = body.role === undefined ? undefined : String(body.role || 'agent').trim()
    const is_agency_owner = body.is_agency_owner === undefined ? undefined : Boolean(body.is_agency_owner)
    const comp = body.comp === undefined ? undefined : Number(body.comp)
    const upline_id = body.upline_id === undefined ? undefined : (body.upline_id ? String(body.upline_id) : null)
    const theme = body.theme === undefined ? undefined : String(body.theme || 'blue').trim()

    if (comp !== undefined && (!Number.isFinite(comp) || comp < 0 || comp > 200)) {
      return NextResponse.json({ error: 'Invalid comp (0-200)' }, { status: 400 })
    }

    // Update profiles (single source of truth for settings UI)
    const payload: any = {}
    if (first_name !== undefined) payload.first_name = first_name || null
    if (last_name !== undefined) payload.last_name = last_name || null
    if (role !== undefined) payload.role = role
    if (is_agency_owner !== undefined) payload.is_agency_owner = is_agency_owner
    if (comp !== undefined) payload.comp = comp
    if (upline_id !== undefined) payload.upline_id = upline_id
    if (theme !== undefined) payload.theme = theme

    const { error: upErr } = await supabaseAdmin.from('profiles').update(payload).eq('id', user_id)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    // Keep auth metadata in sync (optional but nice)
    // NOTE: email updates are NOT handled here; do those via admin user management if needed.
    const meta: any = {}
    if (first_name !== undefined) meta.first_name = first_name || ''
    if (last_name !== undefined) meta.last_name = last_name || ''

    if (Object.keys(meta).length) {
      await supabaseAdmin.auth.admin.updateUserById(user_id, { user_metadata: meta }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 })
  }
}
