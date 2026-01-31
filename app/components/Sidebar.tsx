// ✅ REPLACE ENTIRE FILE: /app/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-[#070a12] border border-white/10 px-4 py-2 rounded-xl"
      >
        Menu
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-40 ${open ? 'bg-black/60' : 'hidden'}`}
      />

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-72 bg-[#070a12] border-r border-white/10 p-6
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <div className="mb-6 text-xl font-semibold">Flow</div>

        <nav className="flex flex-col gap-2">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl border text-sm transition
                  ${
                    active
                      ? 'bg-white/10 border-white/20'
                      : 'border-transparent hover:bg-white/5'
                  }
                `}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
