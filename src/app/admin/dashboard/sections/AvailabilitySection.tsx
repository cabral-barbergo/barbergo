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

const DAY_LABELS: Record<string, string> = {
  Lunes: 'LUNES',
  Martes: 'MARTES',
  Miércoles: 'MIÉRCOLES',
  Jueves: 'JUEVES',
  Viernes: 'VIERNES',
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
          <div key={i} className="h-36 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

      {days.map((day) => {
        const franja     = franjas[day.dayOfWeek] ?? { start: '08:30', end: '17:30' }
        const isApplying = applying === day.dayOfWeek
        const label      = DAY_LABELS[day.dayName] ?? day.dayName.toUpperCase()

        return (
          <div key={day.dayOfWeek} className="space-y-3">
            {/* Day header */}
            <p className="font-syne font-bold text-[#c8a97e] text-lg tracking-wide">{label}</p>

            {/* Franja inputs */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[#555] text-[10px] font-inter uppercase tracking-wide">Inicio</label>
                <input
                  type="time"
                  value={franja.start}
                  onChange={(e) =>
                    setFranjas((prev) => ({ ...prev, [day.dayOfWeek]: { ...franja, start: e.target.value } }))
                  }
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 w-full"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[#555] text-[10px] font-inter uppercase tracking-wide">Fin</label>
                <input
                  type="time"
                  value={franja.end}
                  onChange={(e) =>
                    setFranjas((prev) => ({ ...prev, [day.dayOfWeek]: { ...franja, end: e.target.value } }))
                  }
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 w-full"
                />
              </div>
            </div>

            {/* Apply button */}
            <button
              onClick={() => applyFranja(day.dayOfWeek)}
              disabled={isApplying}
              className="w-full bg-[#c8a97e] hover:bg-[#dfc4a1] text-black text-sm font-semibold font-syne rounded-lg py-2 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isApplying && <SmallSpinner />}
              {isApplying ? 'Aplicando…' : 'Aplicar franja'}
            </button>

            {/* Slot grid */}
            <div
              className="flex flex-wrap gap-1.5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, 64px)', display: 'grid' }}
            >
              {day.slots.map((s) => {
                const tKey      = `${day.dayOfWeek}:${s.slot}`
                const isLoading = toggling === tKey
                return (
                  <button
                    key={s.slot}
                    onClick={() => toggleSlot(day.dayOfWeek, s.slot, s.isActive)}
                    disabled={isLoading}
                    style={{
                      width: 64,
                      height: 36,
                      fontSize: '0.75rem',
                      background: s.isActive ? 'rgba(200,169,126,0.15)' : '#1a1a1a',
                      border: s.isActive ? '1.5px solid #c8a97e' : '1px solid #2a2a2a',
                      color: s.isActive ? '#c8a97e' : '#444',
                    }}
                    className="rounded-md font-inter transition-all disabled:opacity-40 flex items-center justify-center"
                  >
                    {s.slot}
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#1a1a1a]" />
          </div>
        )
      })}
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
