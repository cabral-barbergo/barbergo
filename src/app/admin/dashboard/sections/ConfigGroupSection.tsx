'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Settings, Clock, CalendarX, Map, ChevronUp, ChevronDown, Check } from 'lucide-react'
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
  const [windowDays,  setWindowDays]  = useState<number>(5)
  const [precioCorte, setPrecioCorte] = useState<number>(2500)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [savedPrice,  setSavedPrice]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const savedTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedPriceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.booking_window_days) setWindowDays(data.booking_window_days)
        if (data.precio_corte != null) setPrecioCorte(data.precio_corte)
      })
      .catch(() => setError('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [])

  async function patchDays(next: number) {
    if (saving) return
    setSaving(true)
    setSaved(false)
    setError(null)
    setWindowDays(next)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_window_days: next }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function patchPrice(next: number) {
    if (savingPrice) return
    setSavingPrice(true)
    setSavedPrice(false)
    setError(null)
    setPrecioCorte(next)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_corte: next }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }
      setSavedPrice(true)
      if (savedPriceTimerRef.current) clearTimeout(savedPriceTimerRef.current)
      savedPriceTimerRef.current = setTimeout(() => setSavedPrice(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingPrice(false)
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

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-6">
        {/* Días de anticipación */}
        <div>
          <label className="text-white text-sm font-syne font-semibold block mb-1">
            Días de anticipación para reservas
          </label>
          <p className="text-[#555] text-xs font-inter mb-4">
            Cuántos días laborales hacia adelante pueden reservar los clientes.
          </p>

          <div className="flex flex-col items-center mx-auto" style={{
            background: '#191919',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '0.75rem',
            width: 'fit-content',
          }}>
            <button
              onClick={() => patchDays(Math.min(30, windowDays + 1))}
              disabled={saving || windowDays >= 30}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-[#888] hover:text-[#c8a97e] disabled:opacity-30"
            >
              <ChevronUp size={22} />
            </button>

            <div className="flex items-center justify-center w-12 my-1 relative">
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#c8a97e', lineHeight: 1 }}>
                {windowDays}
              </span>
              {saved && (
                <span className="absolute -right-5 text-emerald-400">
                  <Check size={14} />
                </span>
              )}
            </div>

            <button
              onClick={() => patchDays(Math.max(1, windowDays - 1))}
              disabled={saving || windowDays <= 1}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-[#888] hover:text-[#c8a97e] disabled:opacity-30"
            >
              <ChevronDown size={22} />
            </button>
          </div>

          <p className="text-[#555] text-xs font-inter text-center mt-2">días laborales</p>
        </div>

        {/* Precio del corte */}
        <div>
          <label className="text-white text-sm font-syne font-semibold block mb-1">
            Precio del corte
          </label>
          <p className="text-[#555] text-xs font-inter mb-4">
            Precio base por servicio, usado para calcular la facturación diaria.
          </p>

          <div className="flex flex-col items-center mx-auto" style={{
            background: '#191919',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '0.75rem',
            width: 'fit-content',
          }}>
            <button
              onClick={() => patchPrice(precioCorte + 100)}
              disabled={savingPrice}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-[#888] hover:text-[#c8a97e] disabled:opacity-30"
            >
              <ChevronUp size={22} />
            </button>

            <div className="flex items-center justify-center my-1 relative" style={{ minWidth: '5rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c8a97e', lineHeight: 1 }}>
                ${precioCorte.toLocaleString('es-AR')}
              </span>
              {savedPrice && (
                <span className="absolute -right-5 text-emerald-400">
                  <Check size={14} />
                </span>
              )}
            </div>

            <button
              onClick={() => patchPrice(Math.max(0, precioCorte - 100))}
              disabled={savingPrice || precioCorte <= 0}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-[#888] hover:text-[#c8a97e] disabled:opacity-30"
            >
              <ChevronDown size={22} />
            </button>
          </div>

          <p className="text-[#555] text-xs font-inter text-center mt-2">por corte</p>
        </div>

        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export default function ConfigGroupSection() {
  const [subtab, setSubtab] = useState<SubTab>('general')

  return (
    <div className="space-y-5">
      {/* Mobile: 2x2 grid */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        {SUBTABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSubtab(id)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] border transition-colors"
            style={{
              background: subtab === id ? 'rgba(200,169,126,0.1)' : '#111',
              borderColor: subtab === id ? '#c8a97e' : '#222',
              color: subtab === id ? '#c8a97e' : '#555',
            }}
          >
            <Icon size={18} />
            <span className="text-xs font-inter font-medium text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Desktop: horizontal tabs */}
      <div className="hidden md:flex gap-1 border-b border-[#1a1a1a]">
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
