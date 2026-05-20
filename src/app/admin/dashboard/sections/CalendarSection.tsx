'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Check, X, User, MapPin } from 'lucide-react'
import type { Booking } from '@/lib/types'
import AddressAutocomplete from '../components/AddressAutocomplete'

type CalView = 'day' | 'week' | 'month'

interface SlotState {
  slot: string
  isActive: boolean
}

interface DaySlotData {
  dayOfWeek: number
  slots: SlotState[]
}

// ── date utilities ────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** 0=Mon … 4=Fri, 5=Sat, 6=Sun */
function dow(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 6 : js - 1
}

function isWeekday(d: Date): boolean {
  return dow(d) < 5
}

function getMonStart(d: Date): Date {
  const copy = new Date(d)
  const diff = dow(copy)
  copy.setDate(copy.getDate() - Math.min(diff, 4))
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

const DAY_SHORT = ['Lun','Mar','Mié','Jue','Vie']

function formatDay(d: Date): string {
  return `${DAY_SHORT[dow(d)]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function getVisibleDates(view: CalView, current: Date): string[] {
  if (view === 'day') {
    return isWeekday(current) ? [toISO(current)] : []
  }
  if (view === 'week') {
    const mon = getMonStart(current)
    return Array.from({ length: 5 }, (_, i) => toISO(addDays(mon, i)))
  }
  const year = current.getFullYear()
  const month = current.getMonth()
  const dates: string[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (isWeekday(d)) dates.push(toISO(new Date(d)))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function periodLabel(view: CalView, current: Date): string {
  if (view === 'day') return formatDay(current)
  if (view === 'week') {
    const mon = getMonStart(current)
    const fri = addDays(mon, 4)
    return `${mon.getDate()}–${fri.getDate()} ${MONTH_NAMES[fri.getMonth()]} ${fri.getFullYear()}`
  }
  return `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`
}

// ── geocode helper ────────────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; formattedAddress: string } | null> {
  try {
    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    const data = await res.json()
    if (res.ok && data.lat) return { lat: data.lat, lon: data.lon, formattedAddress: data.formattedAddress }
  } catch {}
  return null
}

// ── add booking modal ─────────────────────────────────────────────

interface AddModalProps {
  date: string
  slot: string
  onClose: () => void
  onBooked: () => void
}

function AddModal({ date, slot, onClose, onBooked }: AddModalProps) {
  const [clientName,   setClientName]   = useState('')
  const [address,      setAddress]      = useState('')
  const [freshCoords,  setFreshCoords]  = useState<{ lat: number; lon: number } | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleConfirm() {
    if (!clientName.trim()) { setError('El nombre es requerido'); return }
    setSubmitting(true)
    setError(null)

    let lat = freshCoords?.lat ?? 0
    let lon = freshCoords?.lon ?? 0
    let finalAddress = address.trim()

    if (finalAddress && !freshCoords) {
      const geo = await geocodeAddress(finalAddress)
      if (geo) { lat = geo.lat; lon = geo.lon; finalAddress = geo.formattedAddress }
    }

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot, clientName: clientName.trim(), address: finalAddress, lat, lon }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear turno'); setSubmitting(false); return }
      onBooked()
      onClose()
    } catch {
      setError('Error de red')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div>
          <p className="font-syne font-bold text-white text-base">Agregar turno</p>
          <p className="text-[#555] text-xs font-inter mt-0.5">{date} · {slot}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[#888] text-xs font-inter flex items-center gap-1 mb-1"><User size={12} />Nombre del cliente *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre"
              autoFocus
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60"
            />
          </div>
          <div>
            <label className="text-[#888] text-xs font-inter flex items-center gap-1 mb-1"><MapPin size={12} />Dirección (opcional)</label>
            <AddressAutocomplete
              value={address}
              onChange={(v) => { setAddress(v); setFreshCoords(null) }}
              onPlaceSelect={(addr, lat, lon) => { setAddress(addr); setFreshCoords({ lat, lon }) }}
              placeholder="Calle 123, Ciudad"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] text-sm font-inter rounded-xl py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X size={14} />Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 bg-[#c8a97e] hover:bg-[#dfc4a1] text-black text-sm font-bold font-syne rounded-xl py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />{submitting ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── edit booking modal ────────────────────────────────────────────

interface EditModalProps {
  booking: Booking
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function EditModal({ booking, onClose, onSaved, onDeleted }: EditModalProps) {
  const [clientName,    setClientName]    = useState(booking.clientName)
  const [address,       setAddress]       = useState(booking.address || '')
  const [freshCoords,   setFreshCoords]   = useState<{ lat: number; lon: number } | null>(
    booking.lat !== 0 && booking.lon !== 0 ? { lat: booking.lat, lon: booking.lon } : null
  )
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  async function handleSave() {
    if (!clientName.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)

    let lat = freshCoords?.lat ?? 0
    let lon = freshCoords?.lon ?? 0
    let finalAddress = address.trim()

    if (finalAddress && !freshCoords) {
      const geo = await geocodeAddress(finalAddress)
      if (geo) { lat = geo.lat; lon = geo.lon; finalAddress = geo.formattedAddress }
    }

    if (!finalAddress) { lat = 0; lon = 0 }

    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: clientName.trim(), address: finalAddress, lat, lon }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        setSaving(false)
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('Error de red')
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al eliminar')
        setDeleting(false)
        return
      }
      onDeleted()
      onClose()
    } catch {
      setError('Error de red')
      setDeleting(false)
    }
  }

  const busy = saving || deleting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div>
          <p className="font-syne font-bold text-white text-base">Editar turno</p>
          <p className="text-[#555] text-xs font-inter mt-0.5">{booking.date} · {booking.slot}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[#888] text-xs font-inter flex items-center gap-1 mb-1"><User size={12} />Nombre del cliente *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60"
            />
          </div>
          <div>
            <label className="text-[#888] text-xs font-inter flex items-center gap-1 mb-1"><MapPin size={12} />Dirección</label>
            <AddressAutocomplete
              value={address}
              onChange={(v) => { setAddress(v); setFreshCoords(null) }}
              onPlaceSelect={(addr, lat, lon) => { setAddress(addr); setFreshCoords({ lat, lon }) }}
              placeholder="Calle 123, Ciudad"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

        {/* Delete confirm */}
        {confirmDelete ? (
          <div className="bg-red-950/30 border border-red-500/30 rounded-lg px-4 py-3 space-y-2">
            <p className="text-red-400 text-xs font-inter">¿Eliminar este turno?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 text-xs font-inter text-[#888] hover:text-white transition-colors py-1.5"
              >
                No, cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-syne rounded-lg px-3 py-2 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Trash2 size={12} />{deleting ? '…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-inter rounded-lg py-2 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} />Eliminar turno
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] text-sm font-inter rounded-xl py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X size={14} />Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex-1 bg-[#c8a97e] hover:bg-[#dfc4a1] text-black text-sm font-bold font-syne rounded-xl py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />{saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── slot cell ─────────────────────────────────────────────────────

interface SlotCellProps {
  booking?: Booking
  onAdd?: () => void
  onEdit?: () => void
  compact?: boolean
}

const shortAddress = (address: string) => address.split(',')[0].trim()

function SlotCell({ booking, onAdd, onEdit, compact }: SlotCellProps) {
  if (booking) {
    const addr = !compact && booking.address ? shortAddress(booking.address) : null
    return (
      <button
        onClick={onEdit}
        className={[
          'w-full bg-[#2a2420] border border-[#c8a97e]/20 rounded-lg text-left font-inter transition-colors hover:border-[#c8a97e]/40 hover:bg-[#352b1f]',
          compact ? 'px-2 py-1 text-xs truncate' : '',
        ].join(' ')}
        style={!compact ? { padding: '0.75rem 1rem' } : undefined}
      >
        {compact ? (
          <span className="text-[#c8a97e]">{booking.clientName}</span>
        ) : (
          <>
            <span className="block truncate font-semibold text-[#ede9e1]" style={{ fontSize: '1rem' }}>
              {booking.clientName}
            </span>
            {addr && (
              <span className="block truncate text-[#c8a97e]" style={{ fontSize: '0.85rem' }}>
                {addr}
              </span>
            )}
          </>
        )}
      </button>
    )
  }
  return (
    <button
      onClick={onAdd}
      className={[
        'w-full bg-[#141414] border border-dashed border-[#2a2a2a] rounded-lg text-xs font-inter text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left',
        compact ? 'px-2 py-1' : 'px-3 py-2',
      ].join(' ')}
    >
      <Plus size={12} />
    </button>
  )
}

// ── day view ──────────────────────────────────────────────────────

interface DayViewProps {
  date: string
  slots: SlotState[]
  bookings: Booking[]
  onAdd: (slot: string) => void
  onEdit: (booking: Booking) => void
}

function DayView({ date, slots, bookings, onAdd, onEdit }: DayViewProps) {
  const active = slots.filter((s) => s.isActive)
  if (active.length === 0) {
    return <div className="text-center py-12 text-[#444] text-sm font-inter">Sin slots activos para este día.</div>
  }
  const jsDay = new Date(date + 'T12:00:00').getDay()
  if (jsDay === 0 || jsDay === 6) {
    return <div className="text-center py-12 text-[#444] text-sm font-inter">Sin turnos los fines de semana.</div>
  }
  return (
    <div className="space-y-1.5 max-w-sm">
      {active.map((s) => {
        const booking = bookings.find((b) => b.slot === s.slot)
        return (
          <div key={s.slot} className="flex items-center gap-3">
            <span className="text-[#444] text-xs font-mono w-11 shrink-0">{s.slot}</span>
            <div className="flex-1">
              <SlotCell booking={booking} onAdd={() => onAdd(s.slot)} onEdit={() => booking && onEdit(booking)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── week view ─────────────────────────────────────────────────────

interface WeekViewProps {
  dates: string[]
  slotsData: DaySlotData[]
  bookingsByDate: Record<string, Booking[]>
  onAdd: (date: string, slot: string) => void
  onEdit: (booking: Booking) => void
}

function WeekView({ dates, slotsData, bookingsByDate, onAdd, onEdit }: WeekViewProps) {
  const slotSet = new Set<string>()
  for (let i = 0; i < 5; i++) {
    slotsData.find((d) => d.dayOfWeek === i)?.slots.filter((s) => s.isActive).forEach((s) => slotSet.add(s.slot))
  }
  const allTimes = Array.from(slotSet).sort()

  if (allTimes.length === 0) {
    return <div className="text-center py-12 text-[#444] text-sm font-inter">Sin slots activos esta semana.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" style={{ minWidth: 520 }}>
        <thead>
          <tr>
            <th
              className="w-12 bg-[#111]"
              style={{ position: 'sticky', left: 0, zIndex: 20 }}
            />
            {dates.map((date) => {
              const d = new Date(date + 'T12:00:00')
              return (
                <th key={date} className="text-center pb-2">
                  <p className="text-[#666] text-[10px] font-inter uppercase">{DAY_SHORT[dow(d)]}</p>
                  <p className="text-white text-sm font-syne font-semibold">{d.getDate()}</p>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {allTimes.map((time) => (
            <tr key={time} className="border-t border-[#1a1a1a]">
              <td
                className="text-[#444] text-[10px] font-mono pr-2 py-1 align-middle whitespace-nowrap bg-[#111]"
                style={{ position: 'sticky', left: 0, zIndex: 10 }}
              >
                {time}
              </td>
              {dates.map((date, i) => {
                const dayData  = slotsData.find((d) => d.dayOfWeek === i)
                const isActive = dayData?.slots.find((s) => s.slot === time)?.isActive
                const booking  = bookingsByDate[date]?.find((b) => b.slot === time)
                return (
                  <td key={date} className="px-1 py-1">
                    {isActive ? (
                      <SlotCell
                        booking={booking}
                        onAdd={() => onAdd(date, time)}
                        onEdit={() => booking && onEdit(booking)}
                        compact
                      />
                    ) : (
                      <div className="h-6" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── month view ────────────────────────────────────────────────────

interface MonthViewProps {
  current: Date
  bookingsByDate: Record<string, Booking[]>
  onDayClick: (date: string) => void
}

function MonthView({ current, bookingsByDate, onDayClick }: MonthViewProps) {
  const year  = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startOffset = dow(firstDay)
  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    cells.push(new Date(d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {['L','M','X','J','V','S','D'].map((d) => (
          <div key={d} className="text-center text-[10px] font-inter text-[#444] uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="bg-[#0e0e0e] rounded-lg h-16" />
          const iso   = toISO(d)
          const isWd  = isWeekday(d)
          const count = bookingsByDate[iso]?.length ?? null
          const isToday = iso === toISO(new Date())
          return (
            <button
              key={iso}
              onClick={() => isWd && onDayClick(iso)}
              disabled={!isWd}
              className={[
                'rounded-lg h-16 flex flex-col items-center justify-center transition-colors',
                isWd ? 'bg-[#111] hover:bg-[#1a1a1a] cursor-pointer' : 'bg-[#0e0e0e] opacity-30',
                isToday ? 'ring-1 ring-[#c8a97e]/40' : '',
              ].join(' ')}
            >
              <span className={`text-sm font-syne ${isToday ? 'text-[#c8a97e]' : 'text-white'}`}>{d.getDate()}</span>
              {isWd && count !== null && (
                <span className="text-[10px] font-inter text-[#666] mt-0.5">
                  {count === 0 ? '—' : `${count} turno${count !== 1 ? 's' : ''}`}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────

export default function CalendarSection() {
  const [view,           setView]        = useState<CalView>('week')
  const [currentDate,    setCurrentDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })
  const [slotsData,      setSlotsData]      = useState<DaySlotData[]>([])
  const [loadingSlots,   setLoadingSlots]   = useState(true)
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Booking[]>>({})
  const [addModal,       setAddModal]       = useState<{ date: string; slot: string } | null>(null)
  const [editBooking,    setEditBooking]    = useState<Booking | null>(null)

  const fetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/availability-slots')
      .then((r) => r.json())
      .then((data: { dayOfWeek: number; slots: SlotState[] }[]) =>
        setSlotsData(data.map((d) => ({ dayOfWeek: d.dayOfWeek, slots: d.slots })))
      )
      .finally(() => setLoadingSlots(false))
  }, [])

  async function fetchDates(dates: string[]) {
    const toFetch = dates.filter((d) => !fetchedRef.current.has(d))
    if (toFetch.length === 0) return
    const results = await Promise.all(
      toFetch.map(async (date) => {
        try {
          const res  = await fetch(`/api/admin/bookings?date=${date}`)
          const json = await res.json()
          return { date, bookings: (json.bookings ?? []) as Booking[] }
        } catch {
          return { date, bookings: [] as Booking[] }
        }
      })
    )
    for (const { date } of results) fetchedRef.current.add(date)
    setBookingsByDate((prev) => {
      const next = { ...prev }
      for (const { date, bookings } of results) next[date] = bookings
      return next
    })
  }

  function refreshDate(date: string) {
    fetchedRef.current.delete(date)
    fetchDates([date])
  }

  const periodKey = `${view}:${toISO(currentDate)}`
  useEffect(() => {
    fetchDates(getVisibleDates(view, currentDate))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey])

  function navigate(dir: 1 | -1) {
    setCurrentDate((prev) => {
      if (view === 'day')  return addDays(prev, dir)
      if (view === 'week') return addDays(prev, dir * 7)
      const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d
    })
  }

  const visibleDates = getVisibleDates(view, currentDate)

  if (loadingSlots) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        {/* View selector */}
        <div className="flex justify-center gap-4">
          {(['day', 'week', 'month'] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                'rounded-lg font-inter font-medium transition-colors',
                view === v ? 'bg-[#c8a97e] text-black' : 'bg-[#1a1a1a] text-[#555] hover:text-white',
              ].join(' ')}
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        {/* Date navigator — same width as button group */}
        <div className="flex items-center justify-between" style={{ width: 'calc(3 * (1.5rem * 2 + 3ch) + 2 * 1rem)', minWidth: 280 }}>
          <button onClick={() => navigate(-1)} className="text-[#555] hover:text-white text-lg px-2 transition-colors">‹</button>
          <span className="text-white text-sm font-inter text-center flex-1">{periodLabel(view, currentDate)}</span>
          <button onClick={() => navigate(1)} className="text-[#555] hover:text-white text-lg px-2 transition-colors">›</button>
        </div>
      </div>

      {/* View content */}
      <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-4">
        {view === 'day' && (() => {
          const date = visibleDates[0]
          if (!date) return <div className="text-center py-12 text-[#444] text-sm font-inter">Sin turnos los fines de semana.</div>
          const dayDow   = dow(new Date(date + 'T12:00:00'))
          const slots    = slotsData.find((ds) => ds.dayOfWeek === dayDow)?.slots ?? []
          const bookings = bookingsByDate[date] ?? []
          return (
            <DayView
              date={date}
              slots={slots}
              bookings={bookings}
              onAdd={(slot) => setAddModal({ date, slot })}
              onEdit={(booking) => setEditBooking(booking)}
            />
          )
        })()}

        {view === 'week' && (
          <WeekView
            dates={visibleDates}
            slotsData={slotsData}
            bookingsByDate={bookingsByDate}
            onAdd={(date, slot) => setAddModal({ date, slot })}
            onEdit={(booking) => setEditBooking(booking)}
          />
        )}

        {view === 'month' && (
          <MonthView
            current={currentDate}
            bookingsByDate={bookingsByDate}
            onDayClick={(iso) => { setCurrentDate(new Date(iso + 'T12:00:00')); setView('day') }}
          />
        )}
      </div>

      {/* Add modal */}
      {addModal && (
        <AddModal
          date={addModal.date}
          slot={addModal.slot}
          onClose={() => setAddModal(null)}
          onBooked={() => refreshDate(addModal.date)}
        />
      )}

      {/* Edit modal */}
      {editBooking && (
        <EditModal
          booking={editBooking}
          onClose={() => setEditBooking(null)}
          onSaved={() => refreshDate(editBooking.date)}
          onDeleted={() => refreshDate(editBooking.date)}
        />
      )}
    </div>
  )
}
