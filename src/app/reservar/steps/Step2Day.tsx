'use client'

import { useEffect, useState } from 'react'
import type { LocationData } from './Step1Location'
import { getAvailableBookingDates } from '@/lib/utils'

interface Props {
  location: LocationData
  onSelect: (date: string) => void
}

interface DayStatus {
  loading: boolean
  available: number
}

const DAY_NAMES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function parseDateLabel(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  const jsDate = new Date(iso + 'T12:00:00')
  return { day: d, month: MONTH_NAMES[m - 1], weekday: DAY_NAMES[jsDate.getDay()] }
}

export default function Step2Day({ location, onSelect }: Props) {
  const [days,       setDays]       = useState<string[]>([])
  const [statuses,   setStatuses]   = useState<Record<string, DayStatus>>({})
  const [initDone,   setInitDone]   = useState(false)

  // Load settings + blocked dates, then compute the date list
  useEffect(() => {
    async function init() {
      const [settingsRes, blockedRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/blocked-dates',  { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      ])

      const windowDays: number  = settingsRes.booking_window_days ?? 5
      const blockedDates: string[] = Array.isArray(blockedRes) ? blockedRes : []

      const computed = getAvailableBookingDates(windowDays, blockedDates)
      setDays(computed)
      setStatuses(Object.fromEntries(computed.map((d) => [d, { loading: true, available: 0 }])))
      setInitDone(true)
    }
    init()
  }, [])

  // Fetch availability for each date once the list is ready
  useEffect(() => {
    if (!initDone || days.length === 0) return
    days.forEach(async (date) => {
      try {
        const res = await fetch(
          `/api/availability?date=${date}&lat=${location.lat}&lon=${location.lon}`,
          { cache: 'no-store' }
        )
        const data = await res.json()
        setStatuses((prev) => ({
          ...prev,
          [date]: { loading: false, available: data.slots?.length ?? 0 },
        }))
      } catch {
        setStatuses((prev) => ({
          ...prev,
          [date]: { loading: false, available: 0 },
        }))
      }
    })
  }, [initDone, days, location.lat, location.lon])

  const visibleDays = days.filter((date) => {
    const st = statuses[date]
    return !st || st.loading || st.available > 0
  })

  const allLoaded = initDone && days.every((d) => statuses[d] && !statuses[d].loading)

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-syne text-xl font-bold text-white mb-1">¿Qué día te viene bien?</h2>
        <p className="text-[#666] text-sm font-inter">Próximos días disponibles</p>
      </div>

      {!initDone && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {initDone && allLoaded && visibleDays.length === 0 && (
        <p className="text-center text-[#555] text-sm font-inter py-4">
          No hay días disponibles para tu zona en este período.
        </p>
      )}

      {initDone && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visibleDays.map((date) => {
            const st = statuses[date] ?? { loading: true, available: 0 }
            const { day, month, weekday } = parseDateLabel(date)
            const isClickable = !st.loading && st.available > 0

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
      )}
    </div>
  )
}
