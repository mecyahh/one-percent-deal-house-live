'use client'

import React, { useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip)

export default function CarrierDonut() {
  // Mock for now (we’ll wire Supabase later)
  const labels = ['AIG', 'Mutual', 'Foresters', 'Other']
  const values = [38, 26, 22, 14]

  const top = useMemo(() => {
    let max = -Infinity
    let idx = 0
    values.forEach((v, i) => {
      if (v > max) {
        max = v
        idx = i
      }
    })
    const total = values.reduce((a, b) => a + b, 0) || 1
    const pct = Math.round((values[idx] / total) * 100)
    return { name: labels[idx], pct }
  }, [])

  const data = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            'rgba(59,130,246,0.85)',  // blue
            'rgba(34,197,94,0.85)',   // green
            'rgba(245,158,11,0.85)',  // amber
            'rgba(255,255,255,0.22)', // neutral
          ],
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          hoverOffset: 8,
          cutout: '72%',
        },
      ],
    }
  }, [])

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
            label: (item: any) => `Share: ${item?.formattedValue ?? ''}%`,
          },
        },
      },
    }
  }, [])

  return (
    <div className="h-56 w-full relative">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xs text-white/60">Top Carrier</div>
        <div className="text-lg font-semibold">{top.name}</div>
        <div className="text-xs font-semibold text-blue-300 mt-1">{top.pct}%</div>
      </div>
    </div>
  )
}
