'use client'

import { useState } from 'react'
import AvailabilitySection from './AvailabilitySection'
import BlockedDaysSection  from './BlockedDaysSection'
import ZoneSection         from './ZoneSection'

type SubTab = 'disponibilidad' | 'bloqueados' | 'zona'

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'bloqueados',     label: 'Días bloqueados' },
  { id: 'zona',           label: 'Zona de cobertura' },
]

export default function ConfigGroupSection() {
  const [subtab, setSubtab] = useState<SubTab>('disponibilidad')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-[#1a1a1a]">
        {SUBTABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSubtab(id)}
            className={[
              'px-4 py-2.5 text-sm font-inter font-medium border-b-2 transition-colors',
              subtab === id
                ? 'border-[#c8a97e] text-[#c8a97e]'
                : 'border-transparent text-[#444] hover:text-[#888]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {subtab === 'disponibilidad' && <AvailabilitySection />}
        {subtab === 'bloqueados'     && <BlockedDaysSection />}
        {subtab === 'zona'           && <ZoneSection />}
      </div>
    </div>
  )
}
