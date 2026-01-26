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
        {/* Desktop shell: real flex layout (no fake padding offset) */}
        <div className="min-h-screen md:flex">
          <Sidebar />

          {/* Main content */}
          <main className="min-h-screen flex-1 min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
