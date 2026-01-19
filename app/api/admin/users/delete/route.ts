// ✅ NEW FILE: /app/api/admin/users/delete/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const user_id = String(body.user_id || '').trim()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    // delete profile first (optional)
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)

    // delete auth user (this is what frees the email)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}
