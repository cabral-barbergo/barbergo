'use client'

import { useEffect, useState } from 'react'

interface SlotState {
  slot: string
  isActive: boolean
}

interface DayData {
  dayOfWeek: number
  dayName: string
  slots: SlotState[]
}

function deriveFranja(slots: SlotState[]): { start: string; end: string } {
  const active = slots.filter((s) => s.isActive).map((s) => s.slot).sort()
  if (active.length === 0) return { start: '08:30', end: '17:30' }
  const last = active[active.length - 1]
  const [h, m] = last.split(':').map(Number)
  const endMins = h * 60 + m + 30
  return {
    start: active[0],
    end: `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`,
  }
}

export default function AvailabilitySection() {
  const [days,     setDays]     = useState<DayData[]>([])
  const [loading,  setLoading]  = useState(true)
  const [franjas,  setFranjas]  = useState<Record<number, { start: string; end: string }>>({})
  const [applying, setApplying] = useState<number | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function loadSlots() {
    try {
      const res  = await fetch('/api/admin/availability-slots')
      const data = (await res.json()) as DayData[]
      setDays(data)
      setFranjas(
        Object.fromEntries(data.map((d) => [d.dayOfWeek, deriveFranja(d.slots)]))
      )
    } catch {
      setError('Error al cargar disponibilidad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSlots() }, [])

  async function applyFranja(dayOfWeek: number) {
    const franja = franjas[dayOfWeek]
    if (!franja) return
    setApplying(dayOfWeek)
    setError(null)
    try {
      const res = await fetch('/api/admin/availability-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, startTime: franja.start, endTime: franja.end }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar franja')
    } finally {
      setApplying(null)
    }
  }

  async function toggleSlot(dayOfWeek: number, slot: string, current: boolean) {
    const key = `${dayOfWeek}:${slot}`
    setToggling(key)
    try {
      await fetch('/api/admin/availability-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, slot, isActive: !current }),
      })
      setDays((prev) =>
        prev.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...d, slots: d.slots.map((s) => (s.slot === slot ? { ...s, isActive: !current } : s)) }
            : d
        )
      )
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[#555] text-sm font-inter">
        Definí la franja horaria de cada día para activar todos los slots de una vez,
        o ajustá slots individuales haciendo click en cada uno.
      </p>

      {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

      <div className="space-y-3">
        {days.map((day) => {
          const franja      = franjas[day.dayOfWeek] ?? { start: '08:30', end: '17:30' }
          const isApplying  = applying === day.dayOfWeek
          const activeCount = day.slots.filter((s) => s.isActive).length

          return (
            <div
              key={day.dayOfWeek}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3"
            >
              {/* Header row: name + franja inputs + button */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <span className="font-syne font-semibold text-sm text-white">{day.dayName}</span>
                  <span className="text-[#444] text-[10px] font-inter">{activeCount} slots</span>
                </div>

                <input
                  type="time"
                  value={franja.start}
                  onChange={(e) =>
                    setFranjas((prev) => ({ ...prev, [day.dayOfWeek]: { ...franja, start: e.target.value } }))
                  }
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 w-28"
                />
                <span className="text-[#444] text-sm font-inter">→</span>
                <input
                  type="time"
                  value={franja.end}
                  onChange={(e) =>
                    setFranjas((prev) => ({ ...prev, [day.dayOfWeek]: { ...franja, end: e.target.value } }))
                  }
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 w-28"
                />

                <button
                  onClick={() => applyFranja(day.dayOfWeek)}
                  disabled={isApplying}
                  className="bg-[#c8a97e] hover:bg-[#dfc4a1] text-black text-xs font-bold font-syne rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isApplying && <SmallSpinner />}
                  {isApplying ? 'Aplicando…' : 'Aplicar franja'}
                </button>
              </div>

              {/* Slot toggles */}
              <div className="flex flex-wrap gap-1.5">
                {day.slots.map((s) => {
                  const tKey      = `${day.dayOfWeek}:${s.slot}`
                  const isLoading = toggling === tKey
                  return (
                    <button
                      key={s.slot}
                      onClick={() => toggleSlot(day.dayOfWeek, s.slot, s.isActive)}
                      disabled={isLoading}
                      className={[
                        'px-2.5 py-1 rounded-md text-xs font-inter transition-all disabled:opacity-40',
                        s.isActive
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                          : 'bg-[#1a1a1a] border border-[#252525] text-[#444] hover:text-[#666]',
                      ].join(' ')}
                    >
                      {s.slot}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SmallSpinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
