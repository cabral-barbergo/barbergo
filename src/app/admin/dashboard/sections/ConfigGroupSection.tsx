'use client'

import React, { useEffect, useState } from 'react'
import { Settings, Clock, CalendarX, Map } from 'lucide-react'
import AvailabilitySection from './AvailabilitySection'
import BlockedDaysSection  from './BlockedDaysSection'
import ZoneSection         from './ZoneSection'

type SubTab = 'general' | 'disponibilidad' | 'bloqueados' | 'zona'

const SUBTABS: { id: SubTab; label: string; Icon: React.ElementType }[] = [
  { id: 'general',        label: 'General',          Icon: Settings },
  { id: 'disponibilidad', label: 'Disponibilidad',   Icon: Clock },
  { id: 'bloqueados',     label: 'Días bloqueados',  Icon: CalendarX },
  { id: 'zona',           label: 'Zona de cobertura',Icon: Map },
]

// ── General settings section ──────────────────────────────────────

function GeneralSettings() {
  const [windowDays, setWindowDays] = useState<number>(5)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.booking_window_days) setWindowDays(data.booking_window_days)
      })
      .catch(() => setError('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_window_days: windowDays }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-20 bg-[#1a1a1a] rounded-xl animate-pulse" />
  }

  return (
    <div className="space-y-5">
      <p className="text-[#555] text-sm font-inter">
        Configuración general del sistema de reservas.
      </p>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
        <div>
          <label className="text-white text-sm font-syne font-semibold block mb-1">
            Días de anticipación para reservas
          </label>
          <p className="text-[#555] text-xs font-inter mb-3">
            Cuántos días laborales hacia adelante pueden reservar los clientes.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={30}
              value={windowDays}
              onChange={(e) => setWindowDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 text-center"
            />
            <span className="text-[#555] text-sm font-inter">días laborales</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-bold font-syne rounded-xl px-5 py-2 text-sm transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {saved && <span className="text-emerald-400 text-xs font-inter">✓ Guardado</span>}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export default function ConfigGroupSection() {
  const [subtab, setSubtab] = useState<SubTab>('general')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-[#1a1a1a] overflow-x-auto">
        {SUBTABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSubtab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-inter font-medium border-b-2 transition-colors whitespace-nowrap',
              subtab === id
                ? 'border-[#c8a97e] text-[#c8a97e]'
                : 'border-transparent text-[#444] hover:text-[#888]',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {subtab === 'general'        && <GeneralSettings />}
        {subtab === 'disponibilidad' && <AvailabilitySection />}
        {subtab === 'bloqueados'     && <BlockedDaysSection />}
        {subtab === 'zona'           && <ZoneSection />}
      </div>
    </div>
  )
}
