'use client'

import { useEffect, useState } from 'react'
import type { LocationData } from './Step1Location'
import { getAvailableBookingDates } from '@/lib/utils'

interface Props {
  location: LocationData
  onSelect: (date: string, slot: string) => void
}

interface DayData {
  date: string
  slots: string[]
  loading: boolean
}

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DAY_NAMES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`
}

export default function Step2DaySlot({ location, onSelect }: Props) {
  const [days,     setDays]     = useState<DayData[]>([])
  const [initDone, setInitDone] = useState(false)
  const [selected, setSelected] = useState<{ date: string; slot: string } | null>(null)

  // 1. Load settings + blocked dates, build date list
  useEffect(() => {
    async function init() {
      const [settingsRes, blockedRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/blocked-dates',  { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      ])
      const windowDays: number    = settingsRes.booking_window_days ?? 5
      const blockedDates: string[] = Array.isArray(blockedRes) ? blockedRes : []
      const dates = getAvailableBookingDates(windowDays, blockedDates)
      setDays(dates.map((date) => ({ date, slots: [], loading: true })))
      setInitDone(true)

      // 2. Fetch availability for all dates in parallel
      const results = await Promise.all(
        dates.map(async (date) => {
          try {
            const res  = await fetch(
              `/api/availability?date=${date}&lat=${location.lat}&lon=${location.lon}`,
              { cache: 'no-store' }
            )
            const data = await res.json()
            return { date, slots: (data.slots ?? []).map((s: { slot: string }) => s.slot) as string[] }
          } catch {
            return { date, slots: [] as string[] }
          }
        })
      )
      setDays(results.map(({ date, slots }) => ({ date, slots, loading: false })))
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSlotClick(date: string, slot: string) {
    setSelected({ date, slot })
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="text-center mb-2">
        <h2 className="font-syne text-xl font-bold text-white mb-1">Elegí tu turno</h2>
        <p className="text-[#666] text-sm font-inter">Seleccioná día y horario</p>
      </div>

      {!initDone && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {initDone && days.filter(({ slots, loading }) => loading || slots.length > 0).map(({ date, slots, loading }) => {
        const isSelected = selected?.date === date
        return (
          <div
            key={date}
            style={{
              background: '#111',
              border: `1px solid ${isSelected ? '#c8a97e' : '#1e1e1e'}`,
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '0.75rem',
              transition: 'border-color 0.15s',
            }}
          >
            <p
              className="font-syne"
              style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem' }}
            >
              {formatDayLabel(date)}
            </p>

            {loading ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 w-16 bg-[#1a1a1a] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p style={{ color: '#444', fontSize: '0.8rem', fontStyle: 'italic' }} className="font-inter">
                Sin disponibilidad en tu zona
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => {
                  const isSlotSelected = isSelected && selected?.slot === slot
                  return (
                    <button
                      key={slot}
                      onClick={() => handleSlotClick(date, slot)}
                      className="font-inter transition-all"
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        background: isSlotSelected ? 'rgba(200,169,126,0.25)' : 'rgba(200,169,126,0.08)',
                        border: isSlotSelected ? '2px solid #c8a97e' : '1.5px solid #c8a97e',
                        color: '#c8a97e',
                        fontWeight: isSlotSelected ? 700 : 400,
                        boxShadow: isSlotSelected ? '0 0 8px rgba(200,169,126,0.3)' : 'none',
                      }}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Fixed continue button */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#0a0a0a] to-transparent z-40">
          <button
            onClick={() => onSelect(selected.date, selected.slot)}
            className="w-full max-w-lg mx-auto block bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-bold font-syne rounded-xl py-3.5 text-base transition-all"
          >
            Continuar — {selected.slot}
          </button>
        </div>
      )}
    </div>
  )
}
