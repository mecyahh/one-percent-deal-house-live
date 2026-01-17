// FILE: /app/settings/page.tsx
// ACTION: REPLACE ENTIRE FILE WITH THIS

'use client'

import Sidebar from '../components/Sidebar'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-white/60 mt-2">Baseline Settings page (fresh reset).</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm font-semibold mb-2">Status</div>
          <div className="text-sm text-green-400">✅ Settings route is working</div>

          <div className="mt-4 text-xs text-white/50">
            If you see this box, /settings is LIVE and we can build tabs next.
          </div>
        </div>
      </div>
    </div>
  )
}
