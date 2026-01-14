'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Deal House', href: '/deal-house' },
  { name: 'Post a Deal', href: '/post-deal' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Settings', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen glass p-6 fixed left-0 top-0">
      <h1 className="text-2xl font-semibold mb-10">Flow</h1>

      <nav className="flex flex-col gap-3">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-3 rounded-lg transition ${
              pathname === item.href
                ? 'bg-white/20'
                : 'hover:bg-white/10'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
