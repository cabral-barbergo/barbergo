'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapPinOff } from 'lucide-react'
import type { Booking } from '@/lib/types'
import { SERVICES } from '@/lib/constants'
import { getAvailableBookingDates } from '@/lib/utils'
import RouteMap from '../components/RouteMap'

interface AdminBookingsResponse {
  bookings: Booking[]
  totalDistanceKm: number
}

function toLocalISO(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
}

function todayISO(): string {
  return toLocalISO(new Date())
}

export default function AgendaSection() {
  const [date,        setDate]        = useState(todayISO())
  const [data,        setData]        = useState<AdminBookingsResponse | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [cancelling,  setCancelling]  = useState<string | null>(null)
  const [precioCorte, setPrecioCorte] = useState<number>(2500)

  // Mobile chip selector state
  const [chipDays,  setChipDays]  = useState<string[]>([])
  const chipScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadSettings() {
      const [settingsRes, blockedRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/blocked-dates',  { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      ])
      const windowDays: number = settingsRes.booking_window_days ?? 5
      const blockedDates: string[] = Array.isArray(blockedRes) ? blockedRes : []
      if (settingsRes.precio_corte != null) setPrecioCorte(settingsRes.precio_corte)
      // Include today + window days of weekdays
      const allDays = [todayISO(), ...getAvailableBookingDates(windowDays, blockedDates)]
      setChipDays(allDays)
    }
    loadSettings()
  }, [])

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDay(todayISO()) }, [])

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
  const revenue     = precioCorte * bookings.length

  return (
    <div className="space-y-5">
      {/* Mobile: horizontal chip selector */}
      {chipDays.length > 0 && (
        <div
          ref={chipScrollRef}
          className="md:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {chipDays.map((d) => {
            const [, mm, dd] = d.split('-')
            const isSelected = d === date
            const hasBookings = (data?.bookings ?? []).length > 0 && d === date
            return (
              <button
                key={d}
                onClick={() => { setDate(d); fetchDay(d) }}
                className={[
                  'flex flex-col items-center rounded-full px-3.5 py-2 shrink-0 transition-all',
                  isSelected
                    ? 'bg-[#c8a97e] text-black'
                    : 'bg-[#1f1f1f] text-[#888] border border-[#2a2a2a]',
                ].join(' ')}
              >
                <span className={`text-sm font-bold font-syne leading-none ${isSelected ? 'text-black' : 'text-[#aaa]'}`}>
                  {parseInt(dd)}/{parseInt(mm)}
                </span>
                <span className="mt-1 w-1 h-1 rounded-full" style={{ background: hasBookings ? (isSelected ? '#000' : '#c8a97e') : 'transparent' }} />
              </button>
            )
          })}
        </div>
      )}

      {/* Desktop: date input */}
      <div className="hidden md:flex items-center gap-3">
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
                    <MapPinOff size={11} className="text-[#555]" /><span className="text-[#666]">Sin dirección</span>
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
