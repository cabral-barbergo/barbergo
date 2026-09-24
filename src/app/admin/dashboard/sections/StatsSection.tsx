'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Users } from 'lucide-react'

type StatsPeriod = 'week' | 'month'

interface PeriodStats {
  revenue: number
  turnos: number
  persons: number
  cancelled: number
  cancellationRate: number
}

interface StatsData {
  period: StatsPeriod
  range: { start: string; end: string }
  current: PeriodStats & { revenueChange: number | null }
  previous: PeriodStats
}

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTH_FULL  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function toLocalISO(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
}

function formatPeriodLabel(period: StatsPeriod, date: string): string {
  const d = new Date(date + 'T12:00:00')
  if (period === 'week') {
    const js = d.getDay()
    const daysFromMon = js === 0 ? 6 : js - 1
    const monday = new Date(d)
    monday.setDate(d.getDate() - daysFromMon)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getDate()} – ${sunday.getDate()} ${MONTH_SHORT[monday.getMonth()]}`
    }
    return `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_SHORT[sunday.getMonth()]}`
  }
  return `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`
}

function navigateDate(period: StatsPeriod, date: string, dir: 1 | -1): string {
  const d = new Date(date + 'T12:00:00')
  if (period === 'week') {
    d.setDate(d.getDate() + dir * 7)
  } else {
    d.setMonth(d.getMonth() + dir)
  }
  return toLocalISO(d)
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toLocaleString('es-AR')}`
}

export default function StatsSection() {
  const [period,  setPeriod]  = useState<StatsPeriod>('week')
  const [date,    setDate]    = useState(() => toLocalISO(new Date()))
  const [data,    setData]    = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchStats = useCallback(async (p: StatsPeriod, d: string) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/stats?period=${p}&date=${d}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats(period, date) }, [period, date, fetchStats])

  function navigate(dir: 1 | -1) {
    setDate((prev) => navigateDate(period, prev, dir))
  }

  const c = data?.current

  return (
    <div className="space-y-5">
      {/* Period selector + navigation */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex justify-center gap-4">
          {(['week', 'month'] as StatsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={[
                'rounded-lg font-inter font-medium transition-colors',
                period === p ? 'bg-[#c8a97e] text-black' : 'bg-[#1a1a1a] text-[#555] hover:text-white',
              ].join(' ')}
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
            >
              {p === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2" style={{ minWidth: 240 }}>
          <button onClick={() => navigate(-1)} className="text-[#555] hover:text-white p-1 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-inter text-center capitalize" style={{ minWidth: 160 }}>
            {formatPeriodLabel(period, date)}
          </span>
          <button onClick={() => navigate(1)} className="text-[#555] hover:text-white p-1 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center font-inter">{error}</p>}

      {/* Cards */}
      <div className={`grid grid-cols-1 gap-4 transition-opacity duration-150 ${loading ? 'opacity-40' : 'opacity-100'}`}>

        {/* Facturación */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
          <p className="text-[#555] text-xs font-inter uppercase tracking-wide mb-3">Facturación</p>
          <div className="flex items-end justify-between">
            <p className="text-white text-3xl font-syne font-bold">
              {c ? formatMoney(c.revenue) : '—'}
            </p>
            {c?.revenueChange != null && (
              <div className={`flex items-center gap-1 text-sm font-inter font-medium mb-0.5 ${c.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {c.revenueChange >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {Math.abs(c.revenueChange).toFixed(1)}%
              </div>
            )}
          </div>
          {data && (
            <p className="text-[#444] text-xs font-inter mt-2">
              período anterior: {formatMoney(data.previous.revenue)}
            </p>
          )}
        </div>

        {/* Turnos y personas */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
          <p className="text-[#555] text-xs font-inter uppercase tracking-wide mb-3">Turnos y personas</p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-white text-3xl font-syne font-bold">{c?.turnos ?? '—'}</p>
              <p className="text-[#555] text-xs font-inter mt-1">turnos confirmados</p>
            </div>
            <div className="w-px h-10 bg-[#222]" />
            <div>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-[#c8a97e]" />
                <p className="text-white text-3xl font-syne font-bold">{c?.persons ?? '—'}</p>
              </div>
              <p className="text-[#555] text-xs font-inter mt-1">personas atendidas</p>
            </div>
          </div>
        </div>

        {/* Tasa de cancelación */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
          <p className="text-[#555] text-xs font-inter uppercase tracking-wide mb-3">Tasa de cancelación</p>
          <p className="text-white text-3xl font-syne font-bold">
            {c ? `${c.cancellationRate.toFixed(1)}%` : '—'}
          </p>
          {c != null && (
            <p className="text-[#444] text-xs font-inter mt-2">
              {c.turnos} confirmados · {c.cancelled} cancelados
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
