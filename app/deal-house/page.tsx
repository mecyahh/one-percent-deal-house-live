'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

type Deal = {
  id: string
  created_at: string
  full_name: string | null
  company: string | null
  policy_number: string | null
  coverage: number | null
  dob: string | null
  status: string
}

export default function DealHousePage() {
  const [rows, setRows] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Deal | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('deals')
      .select('id, created_at, full_name, company, policy_number, coverage, dob, status')
      .order('created_at', { ascending: false })

    setRows((data || []) as Deal[])
    setLoading(false)
  }

  async function saveEdit() {
    if (!editing) return
    await supabase
      .from('deals')
      .update({
        full_name: editing.full_name,
        company: editing.company,
        policy_number: editing.policy_number,
        coverage: editing.coverage,
        dob: editing.dob,
        status: editing.status,
      })
      .eq('id', editing.id)

    setEditing(null)
    load()
  }

  const filtered = useMemo(() => {
    if (!search) return rows
    return rows.filter((r) =>
      `${r.full_name} ${r.company} ${r.policy_number}`.toLowerCase().includes(search.toLowerCase())
    )
  }, [rows, search])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Deal House</h1>
            <p className="text-sm text-white/60 mt-1">Clean. Editable. Real-time.</p>
          </div>

          <input
            placeholder="Search deals…"
            className="glass px-4 py-2 rounded-xl text-sm outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-white/50">
              <tr className="border-b border-white/10">
                <th className={th}>Name</th>
                <th className={th}>Company</th>
                <th className={th}>Policy #</th>
                <th className={th}>Coverage</th>
                <th className={th}>DOB</th>
                <th className={th}>Status</th>
                <th className={thRight}></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className={tdStrong}>{d.full_name}</td>
                  <td className={td}>{d.company}</td>
                  <td className={td}>{d.policy_number}</td>
                  <td className={td}>{d.coverage ? `$${d.coverage.toLocaleString()}` : '—'}</td>
                  <td className={td}>{d.dob || '—'}</td>
                  <td className={td}>{d.status}</td>
                  <td className={tdRight}>
                    <button onClick={() => setEditing(d)} className="opacity-60 hover:opacity-100">
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="p-10 text-center text-white/50">No deals yet</div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-xl">
            <h2 className="text-lg font-semibold mb-4">Edit Deal</h2>

            <div className="grid grid-cols-2 gap-4">
              <input className={input} value={editing.full_name || ''} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} placeholder="Full Name" />
              <input className={input} value={editing.company || ''} onChange={(e) => setEditing({ ...editing, company: e.target.value })} placeholder="Company" />
              <input className={input} value={editing.policy_number || ''} onChange={(e) => setEditing({ ...editing, policy_number: e.target.value })} placeholder="Policy #" />
              <input className={input} type="number" value={editing.coverage || ''} onChange={(e) => setEditing({ ...editing, coverage: Number(e.target.value) })} placeholder="Coverage" />
              <input className={input} type="date" value={editing.dob || ''} onChange={(e) => setEditing({ ...editing, dob: e.target.value })} />
              <select className={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="chargeback">Chargeback</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-white/10">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-xl bg-green-600">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = 'px-6 py-3 text-left'
const thRight = 'px-6 py-3 text-right'
const td = 'px-6 py-4 text-white/80'
const tdStrong = 'px-6 py-4 font-semibold'
const tdRight = 'px-6 py-4 text-right'
const input = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none'
