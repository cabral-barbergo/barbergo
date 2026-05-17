'use client'

import type { Booking } from '@/lib/types'
import { SERVICES } from '@/lib/constants'

interface Props {
  booking: Booking
}

export default function SuccessScreen({ booking }: Props) {
  const service = SERVICES.find((s) => s.id === booking.serviceId)
  const [year, month, day] = booking.date.split('-').map(Number)
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dateLabel = `${day} de ${MONTHS[month - 1]} de ${year}`

  return (
    <div className="flex flex-col items-center text-center px-4 py-12 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-[#c8a97e]/10 border-2 border-[#c8a97e] flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-[#c8a97e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-syne text-2xl font-bold text-white mb-2">
        ¡Turno confirmado!
      </h1>
      <p className="text-[#888] font-inter mb-8">
        Recibirás un WhatsApp con todos los detalles.
      </p>

      <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 text-left space-y-4 mb-8">
        <Row icon="👤" label="Cliente"   value={booking.clientName} />
        <Row icon="📅" label="Fecha"     value={dateLabel} />
        <Row icon="🕐" label="Horario"   value={booking.slot} />
        {service && <Row icon={service.icon} label="Servicio" value={service.label} />}
        <Row icon="📍" label="Dirección" value={booking.address} />
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

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-snug">{icon}</span>
      <div>
        <p className="text-[#555] text-xs font-inter uppercase tracking-wide">{label}</p>
        <p className="text-white font-inter text-sm">{value}</p>
      </div>
    </div>
  )
}
