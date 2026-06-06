'use client'

import { useEffect, useState, useCallback } from 'react'

type SlotConfig = { slot: string; isActive: boolean }
type DayConfig = { dayOfWeek: number; dayName: string; slots: SlotConfig[] }

const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTH_NAMES[m - 1]}`
}

// ── Tab 1: Weekly slot toggles ────────────────────────────────

function WeeklyScheduleTab() {
  const [days, setDays] = useState<DayConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/availability-slots', {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then(setDays)
      .catch(() => setError('Error al cargar horarios'))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(dayOfWeek: number, slot: string, currentActive: boolean) {
    const key = `${dayOfWeek}-${slot}`
    setSaving(key)
    try {
      await fetch('/api/admin/availability-slots', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dayOfWeek, slot, isActive: !currentActive }),
      })
      setDays((prev) =>
        prev.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...d, slots: d.slots.map((s) => s.slot === slot ? { ...s, isActive: !currentActive } : s) }
            : d
        )
      )
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="text-[#555] text-sm font-inter">Cargando...</div>
  if (error) return <div className="text-red-400 text-sm font-inter">{error}</div>

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day.dayOfWeek}>
          <h3 className="font-syne font-semibold text-white mb-3">{day.dayName}</h3>
          <div className="flex flex-wrap gap-2">
            {day.slots.map(({ slot, isActive }) => {
              const key = `${day.dayOfWeek}-${slot}`
              const isSaving = saving === key
              return (
                <button
                  key={slot}
                  onClick={() => toggle(day.dayOfWeek, slot, isActive)}
                  disabled={isSaving}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-inter font-medium border transition-all',
                    isActive
                      ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#444] hover:border-[#3a3a3a]',
                    isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-[#444] text-xs font-inter">Verde = activo · Click para activar/desactivar</p>
    </div>
  )
}

// ── Tab 2: Block slots by date ────────────────────────────────

function BlockSlotsTab() {
  const [date, setDate] = useState(todayIso())
  const [activeSlots, setActiveSlots] = useState<string[]>([])
  const [blockedSlots, setBlockedSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    setError(null)
    try {
      const jsDay = new Date(d + 'T12:00:00').getDay()
      if (jsDay === 0 || jsDay === 6) {
        setActiveSlots([])
        setBlockedSlots([])
        return
      }
      const appDay = jsDay === 0 ? 6 : jsDay - 1
      const [avRes, blRes] = await Promise.all([
        fetch(`/api/admin/availability-slots`, { cache: 'no-store' }),
        fetch(`/api/admin/blocked-slots?date=${d}`, { cache: 'no-store' }),
      ])
      const avData: DayConfig[] = await avRes.json()
      const blData: string[] = await blRes.json()
      const dayData = avData.find((x) => x.dayOfWeek === appDay)
      setActiveSlots(dayData?.slots.filter((s) => s.isActive).map((s) => s.slot) ?? [])
      setBlockedSlots(blData)
    } catch {
      setError('Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  async function toggleBlock(slot: string) {
    setToggling(slot)
    const isBlocked = blockedSlots.includes(slot)
    try {
      await fetch('/api/admin/blocked-slots', {
        method: isBlocked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot }),
      })
      setBlockedSlots((prev) =>
        isBlocked ? prev.filter((s) => s !== slot) : [...prev, slot]
      )
    } catch {
      setError('Error al guardar')
    } finally {
      setToggling(null)
    }
  }

  const jsDay = new Date(date + 'T12:00:00').getDay()
  const isWeekend = jsDay === 0 || jsDay === 6

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-[#888] text-sm font-inter">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm font-inter focus:outline-none focus:border-[#c8a97e]"
        />
        {date && <span className="text-[#555] text-sm font-inter">{formatDateLabel(date)}</span>}
      </div>

      {error && <p className="text-red-400 text-sm font-inter">{error}</p>}

      {isWeekend && (
        <p className="text-[#444] text-sm font-inter">No hay turnos disponibles los fines de semana.</p>
      )}

      {loading && <div className="text-[#555] text-sm font-inter">Cargando...</div>}

      {!loading && !isWeekend && activeSlots.length === 0 && (
        <p className="text-[#444] text-sm font-inter">No hay slots activos para este día.</p>
      )}

      {!loading && activeSlots.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {activeSlots.map((slot) => {
              const isBlocked = blockedSlots.includes(slot)
              const isToggling = toggling === slot
              return (
                <button
                  key={slot}
                  onClick={() => toggleBlock(slot)}
                  disabled={isToggling}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-inter font-medium border transition-all',
                    isBlocked
                      ? 'bg-red-900/40 border-red-500/50 text-red-300 hover:bg-red-900/60'
                      : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60',
                    isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {slot} {isBlocked ? '🔒' : ''}
                </button>
              )
            })}
          </div>
          <p className="text-[#444] text-xs font-inter">Verde = disponible · Rojo = bloqueado · Click para cambiar</p>
        </>
      )}
    </div>
  )
}

// ── Main ConfigSection ────────────────────────────────────────

type ConfigTab = 'horarios' | 'bloqueos'

export default function ConfigSection() {
  const [tab, setTab] = useState<ConfigTab>('horarios')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-syne text-lg font-bold text-white mb-1">Configuración</h2>
        <p className="text-[#555] text-sm font-inter">Horarios semanales y bloqueos por fecha</p>
      </div>

      <div className="flex gap-1 border-b border-[#1a1a1a]">
        {([['horarios', 'Horarios semanales'], ['bloqueos', 'Bloquear slots']] as [ConfigTab, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'px-4 py-2.5 text-sm font-inter font-medium border-b-2 transition-colors',
                tab === id
                  ? 'border-[#c8a97e] text-[#c8a97e]'
                  : 'border-transparent text-[#444] hover:text-[#888]',
              ].join(' ')}
            >
              {label}
            </button>
          )
        )}
      </div>

      <div>
        {tab === 'horarios' && <WeeklyScheduleTab />}
        {tab === 'bloqueos' && <BlockSlotsTab />}
      </div>
    </div>
  )
}
