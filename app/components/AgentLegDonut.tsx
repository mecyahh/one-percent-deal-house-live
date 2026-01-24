'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip)

export default function AgentLegDonut({
  labels,
  values,
  glow = false,
}: {
  labels: string[]
  values: number[]
  glow?: boolean
}) {
  const safeLabels = (labels && labels.length ? labels : ['No Data']).slice(0, 6)
  const safeValues = (values && values.length ? values : [100]).slice(0, 6)

  // ✅ Your exact palette (in order)
  const palette = useMemo(
    () => [
      '#4CBB17', // Kelly green
      '#FF00FF', // Fucsia
      '#EF4444', // Red
      '#F97316', // Orange
      '#3B82F6', // Blue
      '#14B8A6', // Teal
    ],
    []
  )

  const top = useMemo(() => {
    let max = -Infinity
    let idx = 0
    safeValues.forEach((v, i) => {
      if (v > max) {
        max = v
        idx = i
      }
    })
    const total = safeValues.reduce((a, b) => a + b, 0) || 1
    const pct = Math.round((safeValues[idx] / total) * 100)
    return { idx, name: safeLabels[idx] ?? '—', pct }
  }, [safeLabels, safeValues])

  // ✅ small “pop” when top leg changes
  const [pop, setPop] = useState(false)
  const prevTopNameRef = useRef<string>('')

  useEffect(() => {
    const prev = prevTopNameRef.current
    if (prev && prev !== top.name) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 360)
      return () => clearTimeout(t)
    }
    prevTopNameRef.current = top.name
  }, [top.name])

  const data = useMemo(() => {
    return {
      labels: safeLabels,
      datasets: [
        {
          data: safeValues,
          backgroundColor: safeValues.map((_, i) => palette[i % palette.length]),
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          hoverOffset: 8,
          cutout: '72%',
        },
      ],
    }
  }, [safeLabels, safeValues, palette])

  const glowPlugin = useMemo(() => {
    return {
      id: 'flowGlow',
      beforeDatasetDraw(chart: any) {
        if (!glow) return
        const ctx = chart.ctx
        ctx.save()
        ctx.shadowBlur = 18
        ctx.shadowColor = 'rgba(255,255,255,0.12)'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      },
      afterDatasetDraw(chart: any) {
        if (!glow) return
        chart.ctx.restore()
      },
    }
  }, [glow])

  const options: any = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          backgroundColor: 'rgba(17,24,39,0.92)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.10)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items: any) => `${items?.[0]?.label ?? ''}`,
            label: (item: any) => `AP: ${item?.formattedValue ?? ''}`,
          },
        },
      },
    }
  }, [])

  return (
    <div className="h-56 w-full relative">
      <Doughnut data={data} options={options} plugins={glow ? [glowPlugin] : undefined} />

      {/* center overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
        <div className="text-[11px] text-white/60">Top Leg</div>
        <div className="text-lg font-semibold truncate max-w-[240px]">{top.name}</div>

        <div
          className="text-xs font-semibold mt-1"
          style={{
            color: 'rgba(255,255,255,0.9)',
            transform: pop ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform 360ms ease-out',
          }}
        >
          {top.pct}%
        </div>
      </div>
    </div>
  )
}
