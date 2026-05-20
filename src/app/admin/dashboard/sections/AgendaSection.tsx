'use client'

import { useState, useCallback } from 'react'
import type { Booking } from '@/lib/types'
import { SERVICES } from '@/lib/constants'
import RouteMap from '../components/RouteMap'

interface AdminBookingsResponse {
  bookings: Booking[]
  totalDistanceKm: number
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export default function AgendaSection() {
  const [date,      setDate]      = useState(todayISO())
  const [data,      setData]      = useState<AdminBookingsResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null) // token being cancelled

  const fetchDay = useCallback(async (d: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bookings?date=${d}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value)
    fetchDay(e.target.value)
  }

  // Load today on first mount
  useState(() => { fetchDay(todayISO()) })

  async function cancelBooking(token: string) {
    setCancelling(token)
    try {
      const res = await fetch(`/api/bookings/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (res.ok) fetchDay(date)
      else {
        const d = await res.json()
        alert(d.error ?? 'No se pudo cancelar')
      }
    } finally {
      setCancelling(null)
    }
  }

  const bookings    = data?.bookings ?? []
  const mapBookings = bookings.filter((b) => b.lat !== 0 || b.lon !== 0)
  const revenue     = bookings.reduce((s, b) => {
    const svc = SERVICES.find((sv) => sv.id === b.serviceId)
    return s + (svc?.price ?? 0)
  }, 0)

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-[#555] text-xs font-inter uppercase tracking-wide shrink-0">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={handleDateChange}
          className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 transition-all"
        />
        <button
          onClick={() => fetchDay(date)}
          disabled={loading}
          className="text-xs font-inter text-[#c8a97e] hover:text-[#dfc4a1] transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm font-inter">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Map */}
        <div className="lg:col-span-3">
          <RouteMap bookings={mapBookings} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Turnos"   value={String(bookings.length)} />
            <Stat label="Km"       value={data ? `${data.totalDistanceKm.toFixed(1)}` : '—'} />
            <Stat label="Factura"  value={revenue > 0 ? `$${(revenue / 1000).toFixed(1)}k` : '—'} />
          </div>

          {/* Booking list */}
          {loading && (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-[#1a1a1a] rounded-lg animate-pulse" />)}
            </div>
          )}

          {!loading && bookings.length === 0 && (
            <div className="text-center py-8 text-[#444] text-sm font-inter">Sin turnos para este día.</div>
          )}

          {!loading && bookings.map((b, i) => {
            const svc = SERVICES.find((s) => s.id === b.serviceId)
            return (
              <div
                key={b.id}
                className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#c8a97e] text-black text-[10px] font-bold font-syne flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-syne font-semibold text-white text-sm">{b.clientName}</span>
                  </div>
                  <span className="text-[#c8a97e] text-xs font-inter font-medium">{b.slot}</span>
                </div>
                {b.lat === 0 && b.lon === 0 ? (
                  <p className="text-[#555] text-xs font-inter leading-snug pl-7 flex items-center gap-1">
                    <span>📍</span><span className="text-[#666]">Sin dirección</span>
                  </p>
                ) : (
                  <p className="text-[#555] text-xs font-inter leading-snug pl-7">{b.address}</p>
                )}
                <div className="flex items-center justify-between pl-7">
                  <span className="text-[#444] text-xs font-inter">
                    {svc?.label ?? (b.serviceId === 'manual' ? 'Manual' : b.serviceId)}
                    {b.clientPhone ? ` · ${b.clientPhone}` : ''}
                  </span>
                  <button
                    onClick={() => cancelBooking(b.token)}
                    disabled={cancelling === b.token}
                    className="text-red-500/70 hover:text-red-400 text-xs font-inter transition-colors disabled:opacity-50"
                  >
                    {cancelling === b.token ? '…' : 'Cancelar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-3 py-3 text-center">
      <p className="font-syne font-bold text-[#c8a97e] text-lg leading-none">{value}</p>
      <p className="text-[#444] text-[10px] font-inter uppercase tracking-wide mt-1">{label}</p>
    </div>
  )
}
