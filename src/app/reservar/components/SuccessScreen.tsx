'use client'

import type { Booking } from '@/lib/types'
import { SERVICES } from '@/lib/constants'
import { CheckCircle, User, CalendarDays, Clock, Scissors, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

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
