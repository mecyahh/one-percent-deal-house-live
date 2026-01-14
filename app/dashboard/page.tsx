'use client'

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold">Flow Dashboard</h1>
          <p className="text-sm text-gray-400">Everything is flowing.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            Dark
          </button>
          <button className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500">
            Log Out
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Stat title="Today" value="0 Deals" />
        <Stat title="This Week" value="0 Deals" />
        <Stat title="This Month" value="0 Deals" />
      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity */}
        <div className="lg:col-span-2 glass p-6">
          <h2 className="text-lg mb-4">Weekly Flow</h2>
          <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center text-gray-400">
            Chart Placeholder
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass p-6">
          <h2 className="text-lg mb-4">Leaderboard</h2>
          <LeaderboardItem name="Lisa Meyers" amount="$13,200" />
          <LeaderboardItem name="Steven Jones" amount="$11,700" />
          <LeaderboardItem name="Brian Davis" amount="$9,700" />
        </div>
      </section>

      {/* Actions */}
      <div className="mt-10 flex gap-4">
        <a
          href="/post
