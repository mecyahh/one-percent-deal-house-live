'use client'

import Sidebar from '../components/Sidebar'

export default function DashboardPage() {
  return (
    <div className="flex bg-[#0b0f1a] text-white">
      <Sidebar />

      <main className="ml-64 p-8 w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-400">Everything is flowing.</p>
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
      </main>
    </div>
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
