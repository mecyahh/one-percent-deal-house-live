'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export default function FlowDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement | null>(null)

  const initial = useMemo(() => (value ? parseISO(value) : new Date()), [value])
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth()) // 0-11

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node
      if (anchorRef.current && !anchorRef.current.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    const d = value ? parseISO(value) : new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }, [open, value])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const grid = buildMonthGrid(viewYear, viewMonth)

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none hover:bg-white/7 transition flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-white/50'}>
          {value ? pretty(value) : placeholder}
        </span>
        <span className="text-white/50">📅</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[320px] rounded-2xl border border-white/10 bg-[#0b0f1a]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                const d = new Date(viewYear, viewMonth, 1)
                d.setMonth(d.getMonth() - 1)
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
              }}
              className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              ‹
            </button>

            <div className="text-sm font-semibold">{monthLabel}</div>

            <button
              type="button"
              onClick={() => {
                const d = new Date(viewYear, viewMonth, 1)
                d.setMonth(d.getMonth() + 1)
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
              }}
              className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              ›
            </button>
          </div>

          <div className="px-4 py-3">
            <div className="grid grid-cols-7 gap-1 text-[11px] text-white/50 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.flat().map((cell, i) => {
                const iso = toISO(cell.date)
                const isSelected = value === iso
                const isThisMonth = cell.inMonth
                const isToday = iso === toISO(new Date())

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(iso)
                      setOpen(false)
                    }}
                    className={[
                      'h-10 rounded-xl text-sm transition border',
                      isSelected
                        ? 'bg-blue-600 border-blue-500/60 text-white'
                        : 'bg-white/5 border-white/10 hover:bg-white/10',
                      !isThisMonth ? 'text-white/30' : 'text-white',
                      isToday && !isSelected ? 'ring-1 ring-white/15' : '',
                    ].join(' ')}
                  >
                    {cell.date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(toISO(new Date()))
                  setOpen(false)
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-xs"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDowMon0 = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startDowMon0)

  const grid: { date: Date; inMonth: boolean }[][] = []
  let cur = new Date(start)
  for (let r = 0; r < 6; r++) {
    const row: { date: Date; inMonth: boolean }[] = []
    for (let c = 0; c < 7; c++) {
      row.push({ date: new Date(cur), inMonth: cur.getMonth() === month })
      cur.setDate(cur.getDate() + 1)
    }
    grid.push(row)
  }
  return grid
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map((x) => Number(x))
  return new Date(y, (m || 1) - 1, d || 1)
}

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pretty(iso: string) {
  const d = parseISO(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
}
