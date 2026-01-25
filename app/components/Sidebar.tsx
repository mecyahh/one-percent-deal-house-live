import './globals.css'
import Sidebar from './components/Sidebar'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Flow',
  description: 'Deal tracking',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={[
          'min-h-screen bg-[#0b0f1a] text-white overflow-x-hidden',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        ].join(' ')}
      >
        <Sidebar />

        {/* ✅ key change: content uses a CSS variable (0 on mobile, 288px on desktop when sidebar is present) */}
        <main className="min-h-screen w-full transition-[padding] duration-200 pl-[var(--sidebar-offset)]">
          {children}
        </main>
      </body>
    </html>
  )
}
