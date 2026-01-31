import './globals.css'
import type { Metadata, Viewport } from 'next'
import AppShell from './components/AppShell'

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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f1a] text-white overflow-x-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
