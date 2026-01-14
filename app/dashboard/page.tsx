'use client'

import React from 'react'

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold">Flow Dashboard</h1>
          <p className="text-sm text-gray-400">Everything is flowing.</p>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Stat title="Today" value="0 Deals" />
        <Stat title="This Week" value="0 Deals" />
        <Stat title="This Month" value="0 Deals" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6">
          <h2 className="text-lg mb-4">Weekly Flow</h2>
          <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center text-gray-400">
            Chart Placeholder
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-lg mb-4">Leaderboard</h2>
          <LeaderboardItem name="Lisa Meyers" amount="$13,200" />
          <LeaderboardItem name="Steven Jones" amount="$11,700" />
          <LeaderboardItem name="Brian Davis" amount="$9,700" />
        </div>
      </section>

      <div className="mt-10">
        <a
          href="/post-deal"
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500"
        >
          Post a Deal
        </a>
      </div>
    </main>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass p-6">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function LeaderboardItem({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/10">
      <span>{name}</span>
      <span className="text-green-400">{amount}</span>
    </div>
  )
}
