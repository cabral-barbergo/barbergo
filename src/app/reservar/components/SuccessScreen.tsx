'use client'

import type { Booking } from '@/lib/types'
import { SERVICES } from '@/lib/constants'
import { CheckCircle, User, CalendarDays, Clock, Scissors, MapPin, CalendarPlus } from 'lucide-react'
import type { ReactNode } from 'react'

function generateICS(booking: Booking): string {
  const [year, month, day] = booking.date.split('-').map(Number)
  const [hours, minutes] = booking.slot.split(':').map(Number)
  const startDate = new Date(year, month - 1, day, hours, minutes, 0)

  const persons = booking.persons ?? 1
  const durationMin = persons === 1 ? 30 : persons === 4 ? 90 : 60
  const endDate = new Date(startDate.getTime() + durationMin * 60000)

  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seba Cabral//Turnos//ES',
    'BEGIN:VEVENT',
    `UID:${booking.token || Date.now()}@sebacabral.com.ar`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    'SUMMARY:Corte de pelo con Seba',
    `LOCATION:${(booking.address || '').replace(/,/g, '\\,')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function addToCalendar(booking: Booking) {
  const icsContent = generateICS(booking)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'turno-seba-cabral.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

interface Props {
  booking: Booking
}

const GOLD = '#c8a97e'

export default function SuccessScreen({ booking }: Props) {
  const service = SERVICES.find((s) => s.id === booking.serviceId)
  const [year, month, day] = booking.date.split('-').map(Number)
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dateLabel = `${day} de ${MONTHS[month - 1]} de ${year}`

  return (
    <div className="flex flex-col items-center text-center px-4 py-12 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-[#c8a97e]/10 border-2 border-[#c8a97e] flex items-center justify-center mb-6">
        <CheckCircle color={GOLD} size={48} />
      </div>

      <h1 className="font-syne text-2xl font-bold text-white mb-2">
        ¡Turno confirmado!
      </h1>
      <p className="text-[#888] font-inter mb-8">
        Recibirás un WhatsApp con todos los detalles.
      </p>

      <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 text-left space-y-4 mb-8">
        <Row icon={<User color={GOLD} size={18} />}         label="Cliente"   value={booking.clientName} />
        <Row icon={<CalendarDays color={GOLD} size={18} />} label="Fecha"     value={dateLabel} />
        <Row icon={<Clock color={GOLD} size={18} />}        label="Horario"   value={booking.slot} />
        {service && <Row icon={<Scissors color={GOLD} size={18} />} label="Servicio" value={service.label} />}
        <Row icon={<MapPin color={GOLD} size={18} />}       label="Dirección" value={booking.address} />
      </div>

      <div className="bg-[#c8a97e]/10 border border-[#c8a97e]/20 rounded-xl px-4 py-3 text-sm font-inter text-[#c8a97e] mb-8">
        💬 Te llegará un WhatsApp de confirmación al {booking.clientPhone}
      </div>

      <button
        onClick={() => addToCalendar(booking)}
        className="w-full flex items-center justify-center gap-2 font-inter text-sm text-[#c8a97e] bg-transparent border border-[#c8a97e] rounded-[10px] px-4 py-3 mb-4 hover:bg-[#c8a97e]/10 transition-colors"
        style={{ borderWidth: '1.5px' }}
      >
        <CalendarPlus size={16} />
        Agregar a mi calendario
      </button>

      <a
        href={`/turno/${booking.token}`}
        className="text-sm font-inter text-[#888] underline underline-offset-4 hover:text-[#c8a97e] transition-colors"
      >
        Ver / gestionar mi turno →
      </a>
    </div>
  )
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[#555] text-xs font-inter uppercase tracking-wide">{label}</p>
        <p className="text-white font-inter text-sm">{value}</p>
      </div>
    </div>
  )
}
