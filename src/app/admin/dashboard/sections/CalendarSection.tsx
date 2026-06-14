'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus, Trash2, Check, X, User, MapPin, GripVertical } from 'lucide-react'
import type { Booking } from '@/lib/types'
import AddressAutocomplete from '../components/AddressAutocomplete'

type CalView = 'day' | 'week'

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

function toLocalISO(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
}

/** 0=Mon … 4=Fri, 5=Sat, 6=Sun */
function dow(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 6 : js - 1
}

function isWeekday(d: Date): boolean {
  return dow(d) <= 5
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

/** Returns windowDays working days starting from today (inclusive). */
function getAdminWeekDates(windowDays: number): string[] {
  if (windowDays <= 0) return []
  const result: string[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  while (result.length < windowDays) {
    if (isWeekday(d)) result.push(toLocalISO(d))
    if (result.length < windowDays) d.setDate(d.getDate() + 1)
  }
  return result
}

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

const DAY_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb']

function formatDay(d: Date): string {
  return `${DAY_SHORT[dow(d)]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function weekRangeLabel(dates: string[]): string {
  if (dates.length === 0) return ''
  const first = new Date(dates[0] + 'T12:00:00')
  const last  = new Date(dates[dates.length - 1] + 'T12:00:00')
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
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
  const [clientName,  setClientName]  = useState('')
  const [address,     setAddress]     = useState('')
  const [freshCoords, setFreshCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

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

// ── draggable booking cell ─────────────────────────────────────────

const shortAddress = (address: string) => address.split(',')[0].trim()

interface DraggableBookingCellProps {
  booking: Booking
  onEdit: () => void
  compact?: boolean
}

function DraggableBookingCell({ booking, onEdit, compact }: DraggableBookingCellProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
    data: { booking },
  })

  const addr = !compact && booking.address ? shortAddress(booking.address) : null

  return (
    <div
      ref={setNodeRef}
      onClick={onEdit}
      {...listeners}
      {...attributes}
      className={[
        'w-full bg-[#2a2420] border border-[#c8a97e]/20 rounded-lg text-left font-inter transition-colors hover:border-[#c8a97e]/40 hover:bg-[#352b1f] cursor-grab active:cursor-grabbing select-none',
        compact ? 'px-2 py-1 text-xs' : '',
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
      style={{
        ...(!compact ? { padding: '0.75rem 1rem' } : {}),
        touchAction: 'pan-y',
      }}
    >
      {compact ? (
        <span className="flex items-center gap-1 min-w-0 truncate">
          <GripVertical size={12} className="text-[#666] shrink-0" />
          <span className="text-[#c8a97e] truncate">{booking.clientName}</span>
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1.5 font-semibold text-[#ede9e1] truncate" style={{ fontSize: '1rem' }}>
            <GripVertical size={12} className="text-[#666] shrink-0" />
            {booking.clientName}
          </span>
          {addr && (
            <span className="block truncate text-[#c8a97e] mt-0.5" style={{ fontSize: '0.85rem' }}>
              {addr}
            </span>
          )}
        </>
      )}
    </div>
  )
}

// ── droppable empty slot ──────────────────────────────────────────

interface DroppableEmptySlotProps {
  date: string
  slot: string
  onAdd: () => void
  compact?: boolean
}

function DroppableEmptySlot({ date, slot, onAdd, compact }: DroppableEmptySlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}|${slot}`,
    data: { date, slot },
  })

  return (
    <div ref={setNodeRef}>
      <button
        onClick={onAdd}
        className={[
          'w-full rounded-lg text-xs font-inter transition-all flex items-center justify-center',
          compact ? 'px-2 py-1' : 'px-3 py-2',
          isOver
            ? 'border-2 border-dashed border-[#c8a97e] bg-[rgba(200,169,126,0.1)]'
            : 'bg-[#141414] border border-dashed border-[#2a2a2a] text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/5',
        ].join(' ')}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

// ── slot cell router ──────────────────────────────────────────────

interface SlotCellProps {
  booking?: Booking
  onAdd: () => void
  onEdit: () => void
  compact?: boolean
  date: string
  slot: string
}

function SlotCell({ booking, onAdd, onEdit, compact, date, slot }: SlotCellProps) {
  if (booking) {
    return <DraggableBookingCell booking={booking} onEdit={onEdit} compact={compact} />
  }
  return <DroppableEmptySlot date={date} slot={slot} onAdd={onAdd} compact={compact} />
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
  if (jsDay === 0) {
    return <div className="text-center py-12 text-[#444] text-sm font-inter">Sin turnos los domingos.</div>
  }
  return (
    <div className="space-y-1.5 max-w-sm">
      {active.map((s) => {
        const booking = bookings.find((b) => b.slot === s.slot)
        return (
          <div key={s.slot} className="flex items-center gap-3">
            <span className="text-[#ede9e1] text-xs font-mono w-11 shrink-0">{s.slot}</span>
            <div className="flex-1">
              <SlotCell
                booking={booking}
                onAdd={() => onAdd(s.slot)}
                onEdit={() => booking && onEdit(booking)}
                date={date}
                slot={s.slot}
              />
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
  for (const date of dates) {
    const dayOfWeek = dow(new Date(date + 'T12:00:00'))
    slotsData.find((d) => d.dayOfWeek === dayOfWeek)?.slots.filter((s) => s.isActive).forEach((s) => slotSet.add(s.slot))
  }
  const allTimes = Array.from(slotSet).sort()

  if (allTimes.length === 0) {
    return <div className="text-center py-12 text-[#444] text-sm font-inter">Sin slots activos esta semana.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" style={{ minWidth: 520, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th
              className="bg-[#111]"
              style={{ width: 60, minWidth: 60, position: 'sticky', left: 0, zIndex: 20 }}
            />
            {dates.map((date) => {
              const d = new Date(date + 'T12:00:00')
              return (
                <th key={date} className="text-center pb-2" style={{ width: 100, minWidth: 100, maxWidth: 100 }}>
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
                className="text-[#ede9e1] text-[10px] font-mono pr-2 py-1 align-middle whitespace-nowrap bg-[#111]"
                style={{ position: 'sticky', left: 0, zIndex: 10 }}
              >
                {time}
              </td>
              {dates.map((date) => {
                const dayOfWeek = dow(new Date(date + 'T12:00:00'))
                const dayData   = slotsData.find((d) => d.dayOfWeek === dayOfWeek)
                const isActive  = dayData?.slots.find((s) => s.slot === time)?.isActive
                const booking   = bookingsByDate[date]?.find((b) => b.slot === time)
                return (
                  <td key={date} className="px-1 py-1">
                    {isActive ? (
                      <SlotCell
                        booking={booking}
                        onAdd={() => onAdd(date, time)}
                        onEdit={() => booking && onEdit(booking)}
                        compact
                        date={date}
                        slot={time}
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

// ── drag overlay card ─────────────────────────────────────────────

function OverlayCard({ booking }: { booking: Booking }) {
  return (
    <div
      className="bg-[#2a2a2a] border border-[#c8a97e]/60 rounded-lg px-3 py-2 shadow-xl"
      style={{ opacity: 0.7, minWidth: 120 }}
    >
      <span className="flex items-center gap-1.5 text-sm font-inter font-semibold text-[#ede9e1]">
        <GripVertical size={12} className="text-[#c8a97e] shrink-0" />
        {booking.clientName}
      </span>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────

export default function CalendarSection() {
  const [view,           setView]        = useState<CalView>('day')
  const [currentDate,    setCurrentDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })

  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    setView('day')
    setCurrentDate(today)
  }, [])

  const [bookingWindow,  setBookingWindow]  = useState(5)
  const [slotsData,      setSlotsData]      = useState<DaySlotData[]>([])
  const [loadingSlots,   setLoadingSlots]   = useState(true)
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Booking[]>>({})
  const [addModal,       setAddModal]       = useState<{ date: string; slot: string } | null>(null)
  const [editBooking,    setEditBooking]    = useState<Booking | null>(null)
  const [dropError,      setDropError]      = useState<string | null>(null)
  const [activeBooking,  setActiveBooking]  = useState<Booking | null>(null)

  const fetchedRef = useRef<Set<string>>(new Set())

  const isTouchDevice = typeof window !== 'undefined' && navigator.maxTouchPoints > 0

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay:     isTouchDevice ? 800 : 150,
        tolerance: isTouchDevice ? 5   : 8,
      },
    }),
  )

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: { booking_window_days: number }) => {
        if (data.booking_window_days) setBookingWindow(data.booking_window_days)
      })
      .catch(() => {})
  }, [])

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

  // ── dnd-kit handlers ────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const booking = active.data.current?.booking as Booking | undefined
    setActiveBooking(booking ?? null)
    setDropError(null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveBooking(null)
    if (!over) return

    const booking = active.data.current?.booking as Booking | undefined
    const toDate  = over.data.current?.date  as string | undefined
    const toSlot  = over.data.current?.slot  as string | undefined

    if (!booking || !toDate || !toSlot) return
    if (booking.date === toDate && booking.slot === toSlot) return

    // Optimistic update
    setBookingsByDate((prev) => {
      const next = { ...prev }
      next[booking.date] = (next[booking.date] ?? []).filter((b) => b.id !== booking.id)
      next[toDate] = [
        ...(next[toDate] ?? []).filter((b) => b.slot !== toSlot),
        { ...booking, date: toDate, slot: toSlot },
      ]
      return next
    })

    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: toDate, slot: toSlot }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al mover turno')
      }
      refreshDate(booking.date)
      refreshDate(toDate)
    } catch (err) {
      // Revert
      setBookingsByDate((prev) => {
        const next = { ...prev }
        next[toDate] = (next[toDate] ?? []).filter((b) => b.id !== booking.id)
        next[booking.date] = [...(next[booking.date] ?? []), booking]
        return next
      })
      setDropError(err instanceof Error ? err.message : 'Error al mover turno')
    }
  }

  function handleDragCancel() {
    setActiveBooking(null)
  }

  const weekDates = getAdminWeekDates(bookingWindow)

  const visibleDates = view === 'day'
    ? (isWeekday(currentDate) ? [toISO(currentDate)] : [])
    : weekDates

  const periodKey = view === 'day'
    ? `day:${toISO(currentDate)}`
    : `week:${weekDates.join(',')}`

  useEffect(() => {
    fetchDates(visibleDates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey])

  function navigate(dir: 1 | -1) {
    setCurrentDate((prev) => addDays(prev, dir))
  }

  const headerLabel = view === 'day'
    ? formatDay(currentDate)
    : weekRangeLabel(weekDates)

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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-5">
        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex justify-center gap-4">
            {(['day', 'week'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'rounded-lg font-inter font-medium transition-colors',
                  view === v ? 'bg-[#c8a97e] text-black' : 'bg-[#1a1a1a] text-[#555] hover:text-white',
                ].join(' ')}
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
              >
                {v === 'day' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2" style={{ minWidth: 240 }}>
            {view === 'day' && (
              <button onClick={() => navigate(-1)} className="text-[#555] hover:text-white text-lg px-2 transition-colors">‹</button>
            )}
            <span className="text-white text-sm font-inter text-center">{headerLabel}</span>
            {view === 'day' && (
              <button onClick={() => navigate(1)} className="text-[#555] hover:text-white text-lg px-2 transition-colors">›</button>
            )}
          </div>
        </div>

        {/* Drop error toast */}
        {dropError && (
          <div className="flex items-center justify-between bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-xs font-inter">{dropError}</p>
            <button onClick={() => setDropError(null)} className="text-red-400/60 hover:text-red-400 ml-3">
              <X size={14} />
            </button>
          </div>
        )}

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
              dates={weekDates}
              slotsData={slotsData}
              bookingsByDate={bookingsByDate}
              onAdd={(date, slot) => setAddModal({ date, slot })}
              onEdit={(booking) => setEditBooking(booking)}
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

      {/* Floating overlay that follows cursor/finger */}
      <DragOverlay>
        {activeBooking ? <OverlayCard booking={activeBooking} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
