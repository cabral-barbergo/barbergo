'use client'

import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'

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
  Lunes:      'LUNES',
  Martes:     'MARTES',
  Miércoles:  'MIÉRCOLES',
  Jueves:     'JUEVES',
  Viernes:    'VIERNES',
  Sábado:     'SÁBADO',
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

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? '#c8a97e' : '#333',
        position: 'relative',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 250ms',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 250ms',
        }}
      />
    </button>
  )
}

export default function AvailabilitySection() {
  const [days,      setDays]      = useState<DayData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [franjas,   setFranjas]   = useState<Record<number, { start: string; end: string }>>({})
  const [applying,  setApplying]  = useState<number | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)
  const [dayActive, setDayActive] = useState<Record<number, boolean>>({})
  const [error,     setError]     = useState<string | null>(null)

  async function loadSlots() {
    try {
      const [slotsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/availability-slots').then((r) => r.json()) as Promise<DayData[]>,
        fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ])
      setDays(slotsRes)
      setFranjas(Object.fromEntries(slotsRes.map((d) => [d.dayOfWeek, deriveFranja(d.slots)])))

      const active: Record<number, boolean> = {}
      for (let n = 0; n <= 5; n++) {
        const key = `day_active_${n}`
        active[n] = settingsRes[key] !== false
      }
      setDayActive(active)
    } catch {
      setError('Error al cargar disponibilidad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSlots() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleDayActiveToggle(dayOfWeek: number, value: boolean) {
    setDayActive((prev) => ({ ...prev, [dayOfWeek]: value }))
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`day_active_${dayOfWeek}`]: value }),
      })
    } catch {
      // revert on error
      setDayActive((prev) => ({ ...prev, [dayOfWeek]: !value }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
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
        const isActive   = dayActive[day.dayOfWeek] !== false

        return (
          <div key={day.dayOfWeek} className="space-y-3">
            {/* Day header with toggle */}
            <div className="flex items-center justify-between">
              <p
                className="font-syne font-bold text-lg tracking-wide"
                style={{ color: isActive ? '#c8a97e' : '#555' }}
              >
                {label}
              </p>
              <ToggleSwitch
                on={isActive}
                onChange={(v) => handleDayActiveToggle(day.dayOfWeek, v)}
              />
            </div>

            {/* Franja + slots (disabled when day is off) */}
            <div className="w-full space-y-2" style={{ opacity: isActive ? 1 : 0.4, pointerEvents: isActive ? 'auto' : 'none' }}>
              {/* Inputs row */}
              <div className="flex items-center gap-2 w-full">
                <input
                  type="time"
                  value={franja.start}
                  onChange={(e) =>
                    setFranjas((prev) => ({ ...prev, [day.dayOfWeek]: { ...franja, start: e.target.value } }))
                  }
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg font-inter text-white focus:outline-none focus:border-[#c8a97e]/60"
                  style={{ flex: '45 45 0%', padding: '0.5rem', fontSize: '0.85rem' }}
                />
                <ChevronRight size={16} className="text-[#666] shrink-0" />
                <input
                  type="time"
                  value={franja.end}
                  onChange={(e) =>
                    setFranjas((prev) => ({ ...prev, [day.dayOfWeek]: { ...franja, end: e.target.value } }))
                  }
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg font-inter text-white focus:outline-none focus:border-[#c8a97e]/60"
                  style={{ flex: '45 45 0%', padding: '0.5rem', fontSize: '0.85rem' }}
                />
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

              {/* Slot grid — 5 cols */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.375rem' }}>
                {day.slots.map((s) => {
                  const tKey      = `${day.dayOfWeek}:${s.slot}`
                  const isLoading = toggling === tKey
                  return (
                    <button
                      key={s.slot}
                      onClick={() => toggleSlot(day.dayOfWeek, s.slot, s.isActive)}
                      disabled={isLoading}
                      style={{
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
