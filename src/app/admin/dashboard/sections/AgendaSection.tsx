'use client'

import { useState, useCallback, useEffect } from 'react'
import { MapPinOff, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
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

const DAY_ABBR  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTH_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function chipLabel(iso: string, index: number): string {
  if (index === 0) return 'Hoy'
  if (index === 1) return 'Mañana'
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()}`
}

function formatDateButton(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()} ${MONTH_ABR[d.getMonth()]}`
}

export default function AgendaSection() {
  const [date,        setDate]        = useState(todayISO())
  const [data,        setData]        = useState<AdminBookingsResponse | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [cancelling,  setCancelling]  = useState<string | null>(null)
  const [precioCorte, setPrecioCorte] = useState<number>(2500)
  const [chipDays, setChipDays] = useState<string[]>([])

  useEffect(() => {
    async function loadSettings() {
      const [settingsRes, blockedRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/blocked-dates',  { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      ])
      const blockedDates: string[] = Array.isArray(blockedRes) ? blockedRes : []
      const inactiveDays: number[] = [0,1,2,3,4,5].filter((n) => settingsRes[`day_active_${n}`] === false)
      if (settingsRes.precio_corte != null) setPrecioCorte(settingsRes.precio_corte)
      setChipDays([todayISO(), ...getAvailableBookingDates(4, blockedDates, inactiveDays)])
    }
    loadSettings()
  }, [])

  const fetchDay = useCallback(async (d: string) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/bookings?date=${d}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

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

  function shiftDay(delta: number) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    const next = toLocalISO(d)
    setDate(next)
    fetchDay(next)
  }

  const bookings    = data?.bookings ?? []
  const mapBookings = bookings.filter((b) => b.lat !== 0 || b.lon !== 0)
  const revenue     = precioCorte * bookings.length

  return (
    <div className="space-y-3">
      {/* Date selector: ← [📅 fecha] → */}
      <div className="flex items-center w-full gap-1">
        <button
          type="button"
          onClick={() => shiftDay(-1)}
          className="p-2 transition-colors rounded-lg"
          style={{ color: '#888' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#c8a97e')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
        >
          <ChevronLeft size={18} />
        </button>

        <label
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-inter text-sm cursor-pointer relative overflow-hidden"
          style={{ background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#ede9e1' }}
        >
          <CalendarDays size={15} className="shrink-0 pointer-events-none" />
          <span className="pointer-events-none font-medium">{formatDateButton(date)}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              setDate(v)
              fetchDay(v)
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>

        <button
          type="button"
          onClick={() => shiftDay(1)}
          className="p-2 transition-colors rounded-lg"
          style={{ color: '#888' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#c8a97e')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day chips — 5 fixed, no scroll */}
      {chipDays.length > 0 && (
        <div className="flex gap-1.5">
          {chipDays.map((d, i) => {
            const isSelected  = d === date
            const hasBookings = isSelected && bookings.length > 0
            return (
              <button
                key={d}
                type="button"
                onClick={() => { setDate(d); fetchDay(d) }}
                className="flex-1 flex flex-col items-center rounded-xl py-2 transition-all font-inter"
                style={{
                  background:  isSelected ? '#c8a97e' : '#1f1f1f',
                  border:      `1px solid ${isSelected ? '#c8a97e' : '#2a2a2a'}`,
                  color:       isSelected ? '#000' : '#888',
                  fontWeight:  isSelected ? 700 : 400,
                  minWidth:    0,
                }}
              >
                <span className="text-xs leading-none truncate px-1">{chipLabel(d, i)}</span>
                <span
                  className="mt-1 w-1 h-1 rounded-full"
                  style={{ background: hasBookings ? (isSelected ? '#000' : '#c8a97e') : 'transparent' }}
                />
              </button>
            )
          })}
        </div>
      )}

      {error && <div className="text-red-400 text-sm font-inter">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Map */}
        <div className="lg:col-span-3">
          <RouteMap bookings={mapBookings} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Turnos"  value={String(bookings.length)} />
            <Stat label="Km"      value={data ? `${data.totalDistanceKm.toFixed(1)}` : '—'} />
            <Stat label="Factura" value={revenue > 0 ? `$${(revenue / 1000).toFixed(1)}k` : '—'} />
          </div>

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
              <div key={b.id} className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 space-y-1.5">
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
                    <MapPinOff size={11} className="text-[#555]" />
                    <span className="text-[#666]">Sin dirección</span>
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
