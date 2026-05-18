'use client'

import { useEffect, useState } from 'react'
import type { LocationData } from './Step1Location'
import type { AvailabilitySlot } from '@/lib/types'

interface Props {
  date: string
  location: LocationData
  onSelect: (slot: string) => void
}

const DAY_NAMES_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTH_NAMES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  const jsDate = new Date(iso + 'T12:00:00')
  return `${DAY_NAMES_FULL[jsDate.getDay()]} ${d} de ${MONTH_NAMES_FULL[m - 1]}`
}

export default function Step3Slot({ date, location, onSelect }: Props) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/availability?date=${date}&lat=${location.lat}&lon=${location.lon}`)
      .then((r) => r.json())
      .then((data) => {
        setIsBlocked(data.isBlocked ?? false)
        setBlockReason(data.reason)
        setSlots(data.slots ?? [])
      })
      .catch(() => setError('Error al cargar los horarios'))
      .finally(() => setLoading(false))
  }, [date, location.lat, location.lon])

  function handleSelect(slot: string) {
    setSelected(slot)
    onSelect(slot)
  }

  const available = slots.filter((s) => s.status === 'available')

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-syne text-xl font-bold text-white mb-1">Elegí un horario</h2>
        <p className="text-[#c8a97e] text-sm font-inter">{formatDate(date)}</p>
      </div>

      {loading && (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#1a1a1a] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-8 text-red-400 text-sm font-inter">{error}</div>
      )}

      {!loading && !error && isBlocked && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center space-y-2">
          <div className="text-3xl mb-2">🚫</div>
          <p className="font-syne text-white font-semibold">Día no disponible</p>
          {blockReason && (
            <p className="text-[#666] text-sm font-inter">{blockReason}</p>
          )}
        </div>
      )}

      {!loading && !error && !isBlocked && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {available.map(({ slot }) => {
              const isSelected = selected === slot
              return (
                <button
                  key={slot}
                  onClick={() => handleSelect(slot)}
                  className={[
                    'relative rounded-lg px-2 py-2.5 text-sm font-inter font-medium transition-all cursor-pointer',
                    !isSelected
                      ? 'bg-emerald-900/40 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-[#c8a97e] border border-[#c8a97e] text-black gold-glow',
                  ].join(' ')}
                >
                  {slot}
                </button>
              )
            })}
          </div>

          {available.length === 0 && (
            <p className="text-center text-[#666] text-sm font-inter py-4">
              No hay horarios disponibles para tu zona en este día.
            </p>
          )}
        </>
      )}
    </div>
  )
}
