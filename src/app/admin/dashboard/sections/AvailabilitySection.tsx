'use client'

import { useEffect, useState } from 'react'

interface AvRow {
  id: string | null
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  isActive: boolean
}

export default function AvailabilitySection() {
  const [rows,    setRows]    = useState<AvRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/availability')
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError('Error al cargar disponibilidad'))
      .finally(() => setLoading(false))
  }, [])

  function patch(i: number, update: Partial<AvRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...update } : r)))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[#555] text-sm font-inter">
        Configurá el horario de atención para cada día de la semana.
      </p>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.dayOfWeek}
            className={[
              'flex items-center gap-4 bg-[#1a1a1a] border rounded-xl px-4 py-3 transition-colors',
              row.isActive ? 'border-[#252525]' : 'border-[#1e1e1e] opacity-60',
            ].join(' ')}
          >
            {/* Day name */}
            <span className="font-syne font-semibold text-sm text-white w-20 shrink-0">{row.dayName}</span>

            {/* Toggle */}
            <button
              onClick={() => patch(i, { isActive: !row.isActive })}
              className={[
                'relative w-10 h-5 rounded-full transition-colors shrink-0',
                row.isActive ? 'bg-[#c8a97e]' : 'bg-[#333]',
              ].join(' ')}
              aria-label={row.isActive ? 'Desactivar' : 'Activar'}
            >
              <span
                className={[
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                  row.isActive ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>

            {/* Times */}
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => patch(i, { startTime: e.target.value })}
                disabled={!row.isActive}
                className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 transition-all disabled:opacity-30 w-28"
              />
              <span className="text-[#444] text-sm font-inter">→</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => patch(i, { endTime: e.target.value })}
                disabled={!row.isActive}
                className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm font-inter text-white focus:outline-none focus:border-[#c8a97e]/60 transition-all disabled:opacity-30 w-28"
              />
            </div>

            <span className={`text-xs font-inter shrink-0 ${row.isActive ? 'text-emerald-400' : 'text-[#333]'}`}>
              {row.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-bold font-syne rounded-xl px-6 py-2.5 text-sm transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <SmallSpinner />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && (
          <span className="text-emerald-400 text-xs font-inter">✓ Guardado</span>
        )}
      </div>
    </div>
  )
}

function SmallSpinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin text-black" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
