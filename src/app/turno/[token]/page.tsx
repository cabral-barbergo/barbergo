'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SERVICES } from '@/lib/constants'
import type { Booking } from '@/lib/types'

// ── date helpers ─────────────────────────────────────────────────────────────

const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]
const DAYS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const jsDate = new Date(iso + 'T12:00:00')
  return `${DAYS_FULL[jsDate.getDay()]} ${d} de ${MONTHS[m - 1]} de ${y}`
}

/** Returns true if the appointment starts in less than 2 hours from now */
function isWithin2Hours(date: string, slot: string): boolean {
  const [h, min] = slot.split(':').map(Number)
  const appt = new Date(`${date}T${slot}:00`)
  appt.setHours(h, min, 0, 0)
  return appt.getTime() - Date.now() < 2 * 60 * 60 * 1000
}

// ── page ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'not-found' | 'cancelled-already' | 'active' | 'cancelled-now'

export default function TurnoPage() {
  const { token } = useParams<{ token: string }>()

  const [booking, setBooking]     = useState<Booking | null>(null)
  const [phase, setPhase]         = useState<Phase>('loading')
  const [showModal, setShowModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${token}`)
      .then((r) => r.json())
      .then((data: Booking | { error: string }) => {
        if ('error' in data) { setPhase('not-found'); return }
        setBooking(data)
        setPhase(data.status === 'cancelled' ? 'cancelled-already' : 'active')
      })
      .catch(() => setPhase('not-found'))
  }, [token])

  async function handleCancel() {
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/bookings/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) { setCancelError(data.error ?? 'Error al cancelar'); return }
      setShowModal(false)
      setPhase('cancelled-now')
    } catch {
      setCancelError('Error de conexión. Intentá de nuevo.')
    } finally {
      setCancelling(false)
    }
  }

  // ── render states ──────────────────────────────────────────────────────────

  if (phase === 'loading') return <Shell><LoadingCard /></Shell>

  if (phase === 'not-found') return (
    <Shell>
      <StateCard
        icon="🔍"
        title="Turno no encontrado"
        body="El enlace puede ser incorrecto o el turno ya no existe."
        action={<HomeLink />}
      />
    </Shell>
  )

  if (phase === 'cancelled-already') return (
    <Shell>
      <StateCard
        icon="❌"
        title="Este turno ya fue cancelado"
        body={booking ? `El turno del ${formatDate(booking.date)} a las ${booking.slot} fue cancelado anteriormente.` : ''}
        action={<HomeLink />}
      />
    </Shell>
  )

  if (phase === 'cancelled-now') return (
    <Shell>
      <StateCard
        icon="✅"
        title="Turno cancelado"
        body="Tu turno fue cancelado exitosamente. Si querés reservar uno nuevo, podés hacerlo desde la página principal."
        muted
        action={<HomeLink label="Reservar nuevo turno" />}
      />
    </Shell>
  )

  // active
  if (!booking) return null

  const service      = SERVICES.find((s) => s.id === booking.serviceId)
  const tooLate      = isWithin2Hours(booking.date, booking.slot)

  return (
    <Shell>
      {/* Header card */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-6">

        <div className="flex items-center gap-3">
          <span className="text-2xl">💈</span>
          <div>
            <p className="font-syne font-bold text-white text-lg leading-tight">Tu turno</p>
            <p className="text-[#555] text-xs font-inter">Podés cancelarlo hasta 2 horas antes</p>
          </div>
          <span className="ml-auto px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-600/30 text-emerald-400 text-xs font-inter font-medium">
            Confirmado
          </span>
        </div>

        <div className="h-px bg-[#1e1e1e]" />

        {/* Details */}
        <div className="space-y-4">
          <DetailRow icon="👤" label="Cliente"   value={booking.clientName} />
          <DetailRow icon="📅" label="Fecha"     value={formatDate(booking.date)} />
          <DetailRow icon="🕐" label="Horario"   value={booking.slot} />
          {service && (
            <DetailRow icon={service.icon} label="Servicio"
              value={`${service.label} · ${service.duration} min · $${service.price.toLocaleString('es-AR')}`}
            />
          )}
          <DetailRow icon="📍" label="Dirección" value={booking.address} />
          <DetailRow icon="📞" label="Teléfono"  value={booking.clientPhone} />
        </div>

        <div className="h-px bg-[#1e1e1e]" />

        {/* Cancel area */}
        {tooLate ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg leading-snug">⏰</span>
            <p className="text-[#555] text-sm font-inter leading-relaxed">
              No es posible cancelar con menos de 2 horas de anticipación.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full border border-red-900/50 text-red-400 hover:bg-red-900/10 hover:border-red-700/60 font-inter font-medium text-sm rounded-xl px-4 py-3 transition-all"
          >
            Cancelar turno
          </button>
        )}
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <Modal
          onClose={() => { setShowModal(false); setCancelError(null) }}
          onConfirm={handleCancel}
          cancelling={cancelling}
          error={cancelError}
        />
      )}
    </Shell>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="flex items-center justify-center py-6 px-4 border-b border-[#1a1a1a]">
        <a href="/" className="flex items-center gap-2">
          <span className="text-[#c8a97e] text-xl">💈</span>
          <span className="font-syne font-bold text-white text-lg tracking-wide">BarberGo</span>
        </a>
      </header>
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-snug w-6 shrink-0 text-center">{icon}</span>
      <div>
        <p className="text-[#444] text-[10px] font-inter uppercase tracking-wide">{label}</p>
        <p className="text-white text-sm font-inter leading-snug">{value}</p>
      </div>
    </div>
  )
}

function StateCard({
  icon, title, body, action, muted,
}: {
  icon: string
  title: string
  body: string
  action?: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 text-center shadow-xl shadow-black/40 space-y-4">
      <div className="text-5xl">{icon}</div>
      <h1 className={`font-syne text-xl font-bold ${muted ? 'text-[#c8a97e]' : 'text-white'}`}>{title}</h1>
      {body && <p className="text-[#555] text-sm font-inter leading-relaxed">{body}</p>}
      {action}
    </div>
  )
}

function HomeLink({ label = 'Volver al inicio' }: { label?: string }) {
  return (
    <a
      href="/reservar"
      className="inline-block mt-2 text-sm font-inter text-[#c8a97e] underline underline-offset-4 hover:text-[#dfc4a1] transition-colors"
    >
      {label}
    </a>
  )
}

function LoadingCard() {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 space-y-5 shadow-xl shadow-black/40">
      <div className="h-6 w-40 bg-[#1e1e1e] rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-[#1a1a1a] rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    </div>
  )
}

function Modal({
  onClose, onConfirm, cancelling, error,
}: {
  onClose: () => void
  onConfirm: () => void
  cancelling: boolean
  error: string | null
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog" aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-syne font-bold text-white text-lg">¿Cancelar el turno?</h2>
          <p className="text-[#666] text-sm font-inter">
            Esta acción no se puede deshacer. Te enviaremos una confirmación por WhatsApp.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3 text-sm font-inter text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold font-inter text-sm rounded-xl px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cancelando…
              </>
            ) : 'Sí, cancelar el turno'}
          </button>
          <button
            onClick={onClose}
            disabled={cancelling}
            className="w-full border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#3a3a3a] font-inter text-sm rounded-xl px-4 py-3 transition-all disabled:opacity-50"
          >
            No, mantener el turno
          </button>
        </div>
      </div>
    </div>
  )
}
