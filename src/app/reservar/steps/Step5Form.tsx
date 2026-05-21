'use client'

import { useState } from 'react'
import type { Booking } from '@/lib/types'
import type { LocationData } from './Step1Location'

interface Props {
  date: string
  slot: string
  location: LocationData
  onSuccess: (booking: Booking) => void
}

const MONTH_NAMES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${MONTH_NAMES_FULL[m - 1]}`
}

function isValidPhone(phone: string): boolean {
  const d = phone.replace(/[\s\-().+]/g, '')
  return /^(\+?54)?9?\d{10}$/.test(d)
}

export default function Step5Form({ date, slot, location, onSuccess }: Props) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState({ name: false, phone: false })

  const nameError  = touched.name  && !name.trim()       ? 'Ingresá tu nombre.'           : null
  const phoneError = touched.phone && !isValidPhone(phone) ? 'Ingresá un teléfono válido.' : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ name: true, phone: true })
    if (!name.trim() || !isValidPhone(phone)) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          slot,
          serviceId: 'corte',
          clientName: name.trim(),
          clientPhone: phone.trim(),
          address: location.address,
          lat: location.lat,
          lon: location.lon,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No pudimos confirmar el turno.')
        return
      }
      onSuccess(data as Booking)
    } catch {
      setError('Error de conexión. Verificá tu internet e intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-syne text-xl font-bold text-white mb-1">Tus datos</h2>
        <p className="text-[#666] text-sm font-inter">Casi listo — completá el formulario</p>
      </div>

      {/* Summary */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
        <p className="text-[#555] text-xs font-inter uppercase tracking-wide mb-3">Resumen del turno</p>
        <SummaryRow icon="📅" text={`${formatDate(date)} a las ${slot}`} />
        <SummaryRow icon="📍" text={location.address} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-inter text-[#666] mb-1.5 uppercase tracking-wide">
            Nombre y apellido
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Juan Pérez"
            autoComplete="name"
            className={[
              'w-full bg-[#1a1a1a] border rounded-xl px-4 py-3 text-sm font-inter text-white placeholder-[#444] focus:outline-none transition-all',
              nameError
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-[#3a3a3a] focus:border-[#c8a97e]/60 focus:ring-1 focus:ring-[#c8a97e]/30',
            ].join(' ')}
          />
          {nameError && <p className="mt-1 text-red-400 text-xs font-inter">{nameError}</p>}
        </div>

        <div>
          <label className="block text-xs font-inter text-[#666] mb-1.5 uppercase tracking-wide">
            WhatsApp / Teléfono
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            placeholder="+54 9 11 1234-5678"
            autoComplete="tel"
            className={[
              'w-full bg-[#1a1a1a] border rounded-xl px-4 py-3 text-sm font-inter text-white placeholder-[#444] focus:outline-none transition-all',
              phoneError
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-[#3a3a3a] focus:border-[#c8a97e]/60 focus:ring-1 focus:ring-[#c8a97e]/30',
            ].join(' ')}
          />
          {phoneError && <p className="mt-1 text-red-400 text-xs font-inter">{phoneError}</p>}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3 text-sm font-inter text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-bold font-syne rounded-xl px-4 py-3.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Spinner />
              Confirmando…
            </>
          ) : (
            'Confirmar turno'
          )}
        </button>
      </form>
    </div>
  )
}

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm font-inter">
      <span className="text-base leading-snug">{icon}</span>
      <span className="text-[#aaa] leading-snug">{text}</span>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-black" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
