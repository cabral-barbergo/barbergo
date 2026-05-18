'use client'

import { useEffect, useState } from 'react'
import type { LocationData } from './Step1Location'

interface Props {
  location: LocationData
  onSelect: (date: string) => void
}

interface DayStatus {
  loading: boolean
  available: number
  isBlocked: boolean
  reason?: string
}

const DAY_NAMES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getNext14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })
}

function parseDateLabel(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  const jsDate = new Date(iso + 'T12:00:00')
  return { day: d, month: MONTH_NAMES[m - 1], weekday: DAY_NAMES[jsDate.getDay()] }
}

export default function Step2Day({ location, onSelect }: Props) {
  const days = getNext14Days()
  const [statuses, setStatuses] = useState<Record<string, DayStatus>>(() =>
    Object.fromEntries(days.map((d) => [d, { loading: true, available: 0, isBlocked: false }]))
  )

  useEffect(() => {
    days.forEach(async (date) => {
      try {
        const res = await fetch(
          `/api/availability?date=${date}&lat=${location.lat}&lon=${location.lon}`,
          { cache: 'no-store' }
        )
        const data = await res.json()
        setStatuses((prev) => ({
          ...prev,
          [date]: {
            loading: false,
            isBlocked: data.isBlocked ?? true,
            available: data.slots?.filter((s: { status: string }) => s.status === 'available').length ?? 0,
            reason: data.reason,
          },
        }))
      } catch {
        setStatuses((prev) => ({
          ...prev,
          [date]: { loading: false, available: 0, isBlocked: true },
        }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lon])

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-syne text-xl font-bold text-white mb-1">¿Qué día te viene bien?</h2>
        <p className="text-[#666] text-sm font-inter">Próximas 2 semanas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {days.map((date) => {
          const st = statuses[date]
          const { day, month, weekday } = parseDateLabel(date)

          const isClickable = !st.loading && !st.isBlocked && st.available > 0

          return (
            <button
              key={date}
              onClick={() => isClickable && onSelect(date)}
              disabled={!isClickable}
              className={[
                'flex flex-col items-center rounded-xl border px-3 py-4 transition-all',
                isClickable
                  ? 'border-[#3a3a3a] bg-[#1a1a1a] hover:border-[#c8a97e]/60 hover:bg-[#c8a97e]/5 cursor-pointer'
                  : 'border-[#222] bg-[#111] cursor-not-allowed',
              ].join(' ')}
            >
              <span className={`text-xs font-inter uppercase tracking-wider mb-1 ${isClickable ? 'text-[#888]' : 'text-[#333]'}`}>
                {weekday}
              </span>
              <span className={`font-syne text-2xl font-bold leading-none ${isClickable ? 'text-white' : 'text-[#333]'}`}>
                {day}
              </span>
              <span className={`text-xs font-inter mt-0.5 ${isClickable ? 'text-[#666]' : 'text-[#2a2a2a]'}`}>
                {month}
              </span>

              <div className="mt-3 h-5 flex items-center">
                {st.loading ? (
                  <div className="w-12 h-2 bg-[#2a2a2a] rounded animate-pulse" />
                ) : st.isBlocked ? (
                  <span className="text-[10px] font-inter text-[#444]">
                    {st.reason === 'Día no disponible' ? 'No disponible' : 'Bloqueado'}
                  </span>
                ) : st.available === 0 ? (
                  <span className="text-[10px] font-inter text-red-500/70">Tu zona no disponible</span>
                ) : (
                  <span className="text-[10px] font-inter text-emerald-400">
                    {st.available} {st.available === 1 ? 'horario' : 'horarios'}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
