'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '@/lib/supabaseClient'

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Friend', 'Sibling', 'Estate', 'Other'] as const

const CARRIERS = [
  'Aetna',
  'Aflac',
  'AIG',
  'American Amicable',
  'Mutual Of Omaha',
  'Royal Neighbors',
  'Transamerica',
] as const

export default function PostDealPage() {
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('') // YYYY-MM-DD
  const [effectiveDate, setEffectiveDate] = useState('') // YYYY-MM-DD

  const [company, setCompany] = useState<(typeof CARRIERS)[number]>('Aetna')
  const [premium, setPremium] = useState('')
  const [coverage, setCoverage] = useState('')

  const [policyNumber, setPolicyNumber] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [beneficiaryRelationship, setBeneficiaryRelationship] =
    useState<(typeof RELATIONSHIPS)[number]>('Spouse')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        window.location.href = '/login'
        return
      }
      setReady(true)
    })()
  }, [])

  async function submitDeal() {
    setMsg(null)

    const premiumNum = parseMoneyToNumber(premium)
    const coverageNum = parseMoneyToNumber(coverage)

    if (!fullName.trim() || !String(company).trim() || premiumNum <= 0) {
      setMsg('Full name, company, and premium are required.')
      return
    }

    setLoading(true)

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) {
      setLoading(false)
      window.location.href = '/login'
      return
    }

    const payload: any = {
      user_id: user.id,
      full_name: fullName.trim(),
      phone: normalizePhone(phone) || null,
      client_dob: dob || null,
      effective_date: effectiveDate || null,
      company: String(company).trim(),
      premium: premiumNum,
      coverage: coverageNum > 0 ? coverageNum : null,
      policy_number: policyNumber.trim() || null,
      beneficiary: beneficiary.trim() || null,
      beneficiary_relationship: beneficiaryRelationship,
      notes: notes.trim() || null,
      status: 'Submitted',
    }

    const { error } = await supabase.from('deals').insert(payload)

    setLoading(false)

    if (error) {
      setMsg(error.message)
      return
    }

    setMsg('Deal submitted ✅')
    clearForm()
  }

  function clearForm() {
    setFullName('')
    setPhone('')
    setDob('')
    setEffectiveDate('')
    setCompany('Aetna')
    setPremium('')
    setCoverage('')
    setPolicyNumber('')
    setBeneficiary('')
    setBeneficiaryRelationship('Spouse')
    setNotes('')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="glass px-6 py-4">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Sidebar />

      <div className="ml-64 px-10 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Post a Deal</h1>
            <p className="text-sm text-white/60 mt-1">Clean submission. Everything flows.</p>
          </div>

          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="glass p-7 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <Input value={fullName} onChange={setFullName} placeholder="John Doe" />
            </Field>

            <Field label="Phone">
              <Input
                value={phone}
                onChange={(v) => setPhone(formatPhoneLive(v))}
                placeholder="(888)888-8888"
                inputMode="tel"
              />
            </Field>

            <Field label="Client DOB">
              <FlowDatePicker value={dob} onChange={setDob} />
            </Field>

            <Field label="Company *">
              <Select value={company} onChange={(v) => setCompany(v as any)} options={CARRIERS as any} />
            </Field>

            <Field label="Premium (monthly) *">
              <Input
                value={premium}
                onChange={setPremium}
                onBlurFormat="money"
                placeholder="1,000.00"
                inputMode="decimal"
              />
            </Field>

            <Field label="Coverage">
              <Input
                value={coverage}
                onChange={setCoverage}
                onBlurFormat="money"
                placeholder="250,000.00"
                inputMode="decimal"
              />
            </Field>

            <Field label="Effective Date">
              <FlowDatePicker value={effectiveDate} onChange={setEffectiveDate} />
            </Field>

            <Field label="Policy Number">
              <Input value={policyNumber} onChange={setPolicyNumber} placeholder="Policy #" />
            </Field>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Beneficiary">
                <Input value={beneficiary} onChange={setBeneficiary} placeholder="Jane Doe" />
              </Field>

              <Field label="Relationship">
                <Select
                  value={beneficiaryRelationship}
                  onChange={(v) => setBeneficiaryRelationship(v as any)}
                  options={RELATIONSHIPS as any}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Notes">
                <Textarea value={notes} onChange={setNotes} placeholder="Anything important…" />
              </Field>
            </div>
          </div>

          {msg && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              {msg}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setMsg(null)
                clearForm()
              }}
              className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
              disabled={loading}
            >
              Clear
            </button>

            <button
              onClick={submitDeal}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Submit Deal'}
            </button>
          </div>

          <div className="mt-4 text-xs text-white/40">
            Phone auto-formats. Premium/Coverage auto-format on blur.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- UI ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-white/60 mb-2">{label}</div>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  onBlurFormat,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  onBlurFormat?: 'money'
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (onBlurFormat === 'money') onChange(formatMoneyLive(value))
      }}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500/60"
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500/60 resize-none"
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500/60"
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-[#0b0f1a]">
          {opt}
        </option>
      ))}
    </select>
  )
}

/* ---------------- Calendar Upgrade ---------------- */

function FlowDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

  const grid = buildMonthGrid(viewYear, viewMonth) // 6 rows x 7 cols

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none hover:bg-white/7 transition flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-white/50'}>
          {value ? pretty(value) : 'Select date'}
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
  const startDowMon0 = (first.getDay() + 6) % 7 // convert Sun(0) -> 6, Mon(1)->0
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

/* ---------------- formatting helpers ---------------- */

function digitsOnly(s: string) {
  return (s || '').replace(/\D/g, '')
}

function formatPhoneLive(input: string) {
  const d = digitsOnly(input).slice(0, 10)
  const a = d.slice(0, 3)
  const b = d.slice(3, 6)
  const c = d.slice(6, 10)
  if (d.length <= 3) return a ? `(${a}` : ''
  if (d.length <= 6) return `(${a})${b}`
  return `(${a})${b}-${c}`
}

function normalizePhone(input: string) {
  const d = digitsOnly(input)
  if (d.length !== 10) return ''
  return `(${d.slice(0, 3)})${d.slice(3, 6)}-${d.slice(6, 10)}`
}

function parseMoneyToNumber(input: string) {
  const cleaned = (input || '').replace(/[^0-9.]/g, '')
  const n = Number(cleaned)
  return isNaN(n) ? 0 : n
}

function formatMoneyLive(input: string) {
  const n = parseMoneyToNumber(input)
  if (!isFinite(n)) return ''
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
