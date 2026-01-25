'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'My Agency', href: '/my-agency' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Carrier Outline', href: '/carrier-outline' },
  { label: 'Post a Deal', href: '/post-deal' },
  { label: 'Deal House', href: '/deal-house' },
  { label: 'Follow Ups', href: '/follow-ups' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Settings', href: '/settings' },
] as const

type Me = {
  id: string
  name: string
  email: string
  avatarUrl: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // ✅ Hide sidebar on auth + marketing/legal screens (add-only; does not affect app routes)
  const hideOnRoutes = useMemo(() => {
    const HIDE = [
      '/',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/terms',
      '/privacy',
    ]
    return HIDE.some((r) => pathname === r || pathname.startsWith(r + '/'))
  }, [pathname])

  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  // ✅ Mobile drawer state (desktop stays always-visible)
  const [openMobile, setOpenMobile] = useState(false)

  useEffect(() => {
    let alive = true

    async function hydrateFromUser(u: any | null) {
      if (!alive) return

      if (!u) {
        setAuthed(false)
        setMe(null)
        setReady(true)
        return
      }

      setAuthed(true)

      let avatarUrl = ''
      let fullName = ''
      let email = u.email || ''

      try {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('first_name,last_name,email,avatar_url')
          .eq('id', u.id)
          .single()

        if (!error && prof) {
          fullName = `${(prof as any).first_name || ''} ${(prof as any).last_name || ''}`.trim()
          email = String((prof as any).email || email || '')
          avatarUrl = String((prof as any).avatar_url || '')
        }
      } catch {
        // ignore
      }

      const meta: any = u.user_metadata || {}
      if (!avatarUrl) avatarUrl = String(meta.avatar_url || meta.picture || meta.photoURL || '')
      if (!fullName) fullName = String(meta.full_name || meta.name || '').trim()

      const name = fullName || (email ? email.split('@')[0] : 'Agent')

      if (!alive) return
      setMe({
        id: u.id,
        name,
        email: email || '',
        avatarUrl,
      })
      setReady(true)
    }

    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        await hydrateFromUser(data.user || null)
      } catch {
        if (!alive) return
        setAuthed(false)
        setMe(null)
        setReady(true)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateFromUser(session?.user || null)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // ✅ Close mobile drawer when route changes
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname])

  const initials = useMemo(() => {
    const n = (me?.name || '').trim()
    if (!n) return 'A'
    const parts = n.split(' ').filter(Boolean)
    const a = parts[0]?.[0] || 'A'
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
    return (a + b).toUpperCase()
  }, [me?.name])

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch {}
    router.push('/login')
    router.refresh()
  }

  if (hideOnRoutes) return null
  if (!ready) return null
  if (!authed) return null

  return (
    <>
      {/* ✅ Mobile: floating open button */}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className={[
          'md:hidden fixed left-4 top-4 z-[60]',
          'rounded-2xl border border-white/10 bg-[#070a12]/80 backdrop-blur-xl',
          'px-3 py-2 text-[12px] font-semibold text-white/85',
        ].join(' ')}
        aria-label="Open menu"
      >
        ☰ Menu
      </button>

      {/* ✅ Mobile backdrop */}
      <div
        className={[
          'md:hidden fixed inset-0 z-[55] transition',
          openMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setOpenMobile(false)}
        style={{ background: 'rgba(0,0,0,0.55)' }}
      />

      <aside
        className={[
          // base
          'fixed left-0 top-0 z-[70] h-screen w-72 p-6 border-r border-white/10 bg-[#070a12]/92 backdrop-blur-xl',
          // desktop unchanged
          'md:translate-x-0 md:opacity-100 md:pointer-events-auto',
          // mobile drawer
          openMobile ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-100 pointer-events-auto',
          'transition-transform duration-200',
        ].join(' ')}
      >
        {/* Mobile close */}
        <div className="md:hidden flex justify-end -mt-1 mb-2">
          <button
            type="button"
            onClick={() => setOpenMobile(false)}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-[12px] font-semibold text-white/85"
          >
            Close
          </button>
        </div>

        {/* Header */}
        <div className="mb-7 flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-full overflow-hidden border border-white/10 bg-white/5">
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xl font-extrabold text-white/80">
                {initials}
              </div>
            )}

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -inset-10 rounded-full bg-white/5 blur-2xl" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight leading-tight">
              {me?.name ? me.name : 'Deal tracking'}
            </div>
            <div className="text-lg font-semibold tracking-tight leading-tight">Flow</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'rounded-xl px-4 py-3 transition border flex items-center justify-between',
                  'text-[12.5px] font-medium',
                  active
                    ? 'bg-white/10 border-white/15'
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10',
                ].join(' ')}
              >
                <span className="text-white/90">{item.label}</span>
                {active ? (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 0 18px var(--glow)',
                    }}
                  />
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="h-px bg-white/10 mb-4" />

          <button
            onClick={logout}
            className={[
              'w-full rounded-2xl border border-white/10 bg-white/5 transition px-4 py-3 text-[13px] font-semibold text-white/85',
              'hover:bg-red-500/15 hover:border-red-400/25 hover:text-red-200',
            ].join(' ')}
          >
            Logout
          </button>

          <div className="mt-3 h-2" />
        </div>
      </aside>
    </>
  )
}
