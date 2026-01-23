// ✅ REPLACE ENTIRE FILE: /app/components/CarrierDonut.tsx
'use client'

import React, { useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip)

export default function CarrierDonut({
  labels,
  values,
  glow = false,
  colors,
}: {
  labels: string[]
  values: number[]
  glow?: boolean
  colors?: string[]
}) {
  const safeLabels = labels.length ? labels : ['No Data']
  const safeValues = values.length ? values : [100]

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
    return { name: safeLabels[idx], pct }
  }, [safeLabels, safeValues])

  // ✅ Default palette = your requested colors (in order)
// Kelly green, Fuchsia, Red, Orange, Blue, Teal
const defaultPalette = ['#4CBB17', '#FF00FF', '#EF4444', '#F97316', '#3B82F6', '#14B8A6']

// allow override from parent
const palette = (colors && colors.length ? colors : defaultPalette).slice()

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
            label: (item: any) => `Count: ${item?.formattedValue ?? ''}`,
          },
        },
      },
    }
  }, [])

  return (
    <div className="h-56 w-full relative">
      <Doughnut data={data} options={options} plugins={glow ? [glowPlugin] : undefined} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xs text-white/60">Top Carrier</div>
        <div className="text-lg font-semibold">{top.name}</div>
        <div className="text-xs font-semibold text-blue-300 mt-1">{top.pct}%</div>
      </div>
    </div>
  )
}
