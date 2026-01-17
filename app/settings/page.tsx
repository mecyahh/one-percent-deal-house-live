// /app/settings/page.tsx  -> REPLACE ENTIRE FILE WITH THIS

'use client'

import Sidebar from '../components/Sidebar'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-white/60 mt-2">Settings baseline loaded successfully.</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm font-semibold mb-2">Status</div>
          <div className="text-sm text-green-400">✅ Settings page is live and compiling correctly</div>
        </div>
      </div>
    </div>
  )
}
