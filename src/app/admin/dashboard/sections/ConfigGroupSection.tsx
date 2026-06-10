'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Settings, Clock, CalendarX, Map, Check } from 'lucide-react'
import AvailabilitySection from './AvailabilitySection'
import BlockedDaysSection  from './BlockedDaysSection'
import ZoneSection         from './ZoneSection'
import DrumPicker          from '@/components/DrumPicker'

type SubTab = 'general' | 'disponibilidad' | 'bloqueados' | 'zona'

const SUBTABS: { id: SubTab; label: string; Icon: React.ElementType }[] = [
  { id: 'general',        label: 'General',          Icon: Settings },
  { id: 'disponibilidad', label: 'Disponibilidad',   Icon: Clock },
  { id: 'bloqueados',     label: 'Días bloqueados',  Icon: CalendarX },
  { id: 'zona',           label: 'Zona de cobertura',Icon: Map },
]

// ── General settings section ──────────────────────────────────────

function ChangePasswordSection() {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!current || !next || !confirm) {
      setError('Todos los campos son requeridos')
      return
    }
    if (next.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (next !== confirm) {
      setError('La nueva contraseña y la confirmación no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cambiar la contraseña')
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '0.5rem 0.75rem',
    color: '#fff',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-sm font-syne font-semibold">Cambiar contraseña</h3>
        {success && (
          <span className="flex items-center gap-1 text-emerald-400 text-xs font-inter">
            <Check size={13} /> Contraseña actualizada
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[#555] text-xs font-inter block mb-1">Contraseña actual</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="text-[#555] text-xs font-inter block mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            style={inputStyle}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="text-[#555] text-xs font-inter block mb-1">Confirmar nueva contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="font-inter font-semibold text-sm transition-colors"
          style={{
            background: loading ? '#2a2a2a' : 'rgba(200,169,126,0.12)',
            border: '1px solid #c8a97e',
            color: loading ? '#555' : '#c8a97e',
            borderRadius: 8,
            padding: '0.5rem 1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}

function GeneralSettings() {
  const [windowDays,  setWindowDays]  = useState<number>(5)
  const [precioCorte, setPrecioCorte] = useState<number>(2500)
  const [loading, setLoading] = useState(true)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const savedTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function schedulePatch(payload: Record<string, number>) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
      }
    }, 500)
  }

  function handleDaysChange(v: number) {
    setWindowDays(v)
    schedulePatch({ booking_window_days: v })
  }

  function handlePriceChange(v: number) {
    setPrecioCorte(v)
    schedulePatch({ precio_corte: v })
  }

  if (loading) {
    return <div className="h-40 bg-[#1a1a1a] rounded-xl animate-pulse" />
  }

  return (
    <div className="space-y-5">
      <p className="text-[#555] text-sm font-inter">
        Configuración general del sistema de reservas.
      </p>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-6">
        {/* Días de anticipación */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-sm font-syne font-semibold">
              Días de anticipación para reservas
            </label>
            {saved && <span className="text-emerald-400"><Check size={14} /></span>}
          </div>
          <p className="text-[#555] text-xs font-inter mb-3">
            Cuántos días laborales hacia adelante pueden reservar los clientes.
          </p>
          <div className="flex justify-center">
            <DrumPicker
              value={windowDays}
              onChange={handleDaysChange}
              step={1}
              min={1}
              max={30}
              format={(v) => `${v} días`}
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e1e1e' }} />

        {/* Precio del corte */}
        <div>
          <label className="text-white text-sm font-syne font-semibold block mb-1">
            Precio del corte
          </label>
          <p className="text-[#555] text-xs font-inter mb-3">
            Precio base por servicio, usado para calcular la facturación diaria.
          </p>
          <div className="flex justify-center">
            <DrumPicker
              value={precioCorte}
              onChange={handlePriceChange}
              step={100}
              min={0}
              format={(v) => `$${v.toLocaleString('es-AR')}`}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}
      </div>

      <ChangePasswordSection />
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
