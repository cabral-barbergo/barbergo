'use client'

import { useEffect, useState } from 'react'
import type { BlockedDay } from '@/lib/types'

// ── calendar helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_ABBR    = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Returns array of {iso, d} | null (empty cell) for a month grid (Mon-first). */
function buildMonth(year: number, month: number): Array<{ iso: string; d: number } | null> {
  const firstJsDay = new Date(year, month, 1).getDay() // 0=Sun
  const offset     = (firstJsDay + 6) % 7              // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ iso: string; d: number } | null> = []
  for (let i = 0; i < offset; i++)       cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ iso: isoDate(year, month, d), d })
  while (cells.length % 7 !== 0)         cells.push(null)
  return cells
}

// ── component ────────────────────────────────────────────────────────────────

export default function BlockedDaysSection() {
  const today    = new Date()
  const [blocked,  setBlocked]  = useState<BlockedDay[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<{ date: string; existing?: BlockedDay } | null>(null)
  const [reason,   setReason]   = useState('')
  const [acting,   setActing]   = useState(false)
  const [actError, setActError] = useState<string | null>(null)

  const blockedSet = new Set(blocked.map((b) => b.date))

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/blocked-days')
      setBlocked(await r.json())
    } finally {
      setLoading(false)
    }
  }

  function openModal(date: string) {
    const existing = blocked.find((b) => b.date === date)
    setModal({ date, existing })
    setReason(existing?.reason ?? '')
    setActError(null)
  }

  async function handleBlock() {
    if (!modal) return
    setActing(true)
    setActError(null)
    try {
      const res = await fetch('/api/admin/blocked-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: modal.date, reason }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      await load()
      setModal(null)
    } catch (err) {
      setActError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActing(false)
    }
  }

  async function handleUnblock() {
    if (!modal) return
    setActing(true)
    setActError(null)
    try {
      const res = await fetch('/api/admin/blocked-days', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: modal.date }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
      setModal(null)
    } catch (err) {
      setActError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActing(false)
    }
  }

  // Render two months
  const months = [
    { year: today.getFullYear(), month: today.getMonth() },
    { year: today.getFullYear() + (today.getMonth() === 11 ? 1 : 0),
      month: (today.getMonth() + 1) % 12 },
  ]

  return (
    <div className="space-y-6">
      <p className="text-[#555] text-sm font-inter">
        Hacé click en un día para bloquearlo (no aceptará nuevos turnos) o desbloquearlo.
      </p>

      {loading ? (
        <div className="h-48 bg-[#1a1a1a] rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {months.map(({ year, month }) => (
            <MonthCalendar
              key={`${year}-${month}`}
              year={year}
              month={month}
              blockedSet={blockedSet}
              today={today}
              onClickDay={openModal}
            />
          ))}
        </div>
      )}

      {/* Blocked list */}
      {blocked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[#444] text-xs font-inter uppercase tracking-wide">Días bloqueados</p>
          <div className="flex flex-wrap gap-2">
            {blocked.map((b) => (
              <div
                key={b.date}
                className="flex items-center gap-2 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-1.5"
              >
                <span className="text-red-400 text-xs font-inter">{b.date}</span>
                {b.reason && <span className="text-[#555] text-xs font-inter">— {b.reason}</span>}
                <button
                  onClick={() => openModal(b.date)}
                  className="text-[#444] hover:text-red-400 text-xs ml-1 transition-colors"
                  aria-label="Gestionar"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
            <h2 className="font-syne font-bold text-white text-lg">
              {modal.existing ? 'Día bloqueado' : 'Bloquear día'}
            </h2>
            <p className="text-[#c8a97e] text-sm font-inter">{modal.date}</p>

            {!modal.existing && (
              <div>
                <label className="block text-xs font-inter text-[#555] uppercase tracking-wide mb-2">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Feriado, viaje…"
                  className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl px-4 py-2.5 text-sm font-inter text-white placeholder-[#333] focus:outline-none focus:border-[#c8a97e]/60 transition-all"
                />
              </div>
            )}

            {modal.existing?.reason && (
              <p className="text-[#555] text-sm font-inter">
                Motivo: <span className="text-white">{modal.existing.reason}</span>
              </p>
            )}

            {actError && <p className="text-red-400 text-xs font-inter">{actError}</p>}

            <div className="flex flex-col gap-2">
              {modal.existing ? (
                <button
                  onClick={handleUnblock}
                  disabled={acting}
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold font-inter text-sm rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {acting ? <SmSpin /> : null}
                  Desbloquear este día
                </button>
              ) : (
                <button
                  onClick={handleBlock}
                  disabled={acting}
                  className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold font-inter text-sm rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {acting ? <SmSpin /> : null}
                  Bloquear este día
                </button>
              )}
              <button
                onClick={() => setModal(null)}
                className="w-full border border-[#2a2a2a] text-[#666] hover:text-white font-inter text-sm rounded-xl px-4 py-2.5 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MonthCalendar({
  year, month, blockedSet, today, onClickDay,
}: {
  year: number
  month: number
  blockedSet: Set<string>
  today: Date
  onClickDay: (iso: string) => void
}) {
  const cells = buildMonth(year, month)
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 space-y-3">
      <p className="font-syne font-semibold text-white text-center">
        {MONTH_NAMES[month]} {year}
      </p>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_ABBR.map((d) => (
          <div key={d} className="text-[#444] text-[10px] font-inter text-center py-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />
          const isBlocked = blockedSet.has(cell.iso)
          const isToday   = cell.iso === todayIso
          const isPast    = cell.iso < todayIso
          return (
            <button
              key={cell.iso}
              onClick={() => !isPast && onClickDay(cell.iso)}
              disabled={isPast}
              className={[
                'aspect-square rounded-lg text-xs font-inter transition-all flex items-center justify-center',
                isBlocked
                  ? 'bg-red-900/50 text-red-400 border border-red-900/50 hover:bg-red-900/70'
                  : isPast
                  ? 'text-[#2a2a2a] cursor-not-allowed'
                  : isToday
                  ? 'bg-[#c8a97e]/20 text-[#c8a97e] border border-[#c8a97e]/40 hover:bg-[#c8a97e]/30'
                  : 'text-[#888] hover:bg-[#2a2a2a] hover:text-white',
              ].join(' ')}
            >
              {cell.d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SmSpin() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
