// ✅ REPLACE ENTIRE FILE: /app/layout.tsx

import './globals.css'
import Sidebar from './components/Sidebar'

export const metadata = {
  title: 'Flow',
  description: 'Deal tracking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* ✅ Forced dark (light mode removed completely) */}
      <body className="min-h-screen bg-[#0b0f1a] text-white overflow-x-hidden">
        {/* ✅ Sidebar is global + fixed overlay (dock-style hover reveal is handled inside Sidebar.tsx) */}
        <Sidebar />

        {/* ✅ IMPORTANT:
            - NO ml-64 / ml-72 here
            - Pages must NOT hardcode left margins either
            - Content stays full width so it expands when sidebar is hidden */}
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
