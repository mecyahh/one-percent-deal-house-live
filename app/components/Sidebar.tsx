'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Carrier Outline', href: '/carrier-outline' },
  { label: 'Post a Deal', href: '/post-deal' },
  { label: 'Deal House', href: '/deal-house' },
  { label: 'Follow Ups', href: '/follow-ups' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Settings', href: '/settings' },
] as const

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 p-6 bg-[#070a12]/90 border-r border-white/10 backdrop-blur-xl">
      {/* Brand */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <span className="text-sm font-semibold">F</span>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight leading-tight">Flow</div>
            <div className="text-xs text-white/50 mt-0.5">Deal tracking</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-2">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'group rounded-2xl px-4 py-3 text-sm transition border flex items-center justify-between',
                active
                  ? 'bg-white/10 border-white/15'
                  : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10',
              ].join(' ')}
            >
              <span className="text-white/90 group-hover:text-white transition">{item.label}</span>
              <span
                className={[
                  'text-xs transition',
                  active ? 'text-white/60' : 'text-white/25 group-hover:text-white/45',
                ].join(' ')}
              >
                →
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs text-white/60 font-semibold">Flow</div>
          <div className="text-[11px] text-white/40 mt-0.5">v1</div>
        </div>
      </div>
    </aside>
  )
}
