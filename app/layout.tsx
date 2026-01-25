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

// ✅ Makes iPhone Safari behave correctly + supports notch safe areas
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
          // ✅ iOS safe areas (top + bottom). Harmless on desktop.
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        ].join(' ')}
      >
        {/* ✅ Sidebar is global + fixed overlay */}
        <Sidebar />

        {/* ✅ Content stays full width */}
        <main className="min-h-screen w-full">{children}</main>
      </body>
    </html>
  )
}
