// ✅ FILE: /app/api/admin/users/delete/route.ts
// Deletes a user from Supabase Auth + profiles
// Admin / Agency Owner only (via service role)

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user_id } = await req.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // 1️⃣ Delete from Auth
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    // 2️⃣ Delete profile row
    const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', user_id)
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}
