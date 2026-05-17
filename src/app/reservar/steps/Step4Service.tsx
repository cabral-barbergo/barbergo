'use client'

import { SERVICES } from '@/lib/constants'
import type { Service } from '@/lib/types'

interface Props {
  selected: string | null
  onSelect: (serviceId: string) => void
  onConfirm: () => void
}

export default function Step4Service({ selected, onSelect, onConfirm }: Props) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-syne text-xl font-bold text-white mb-1">¿Qué servicio querés?</h2>
        <p className="text-[#666] text-sm font-inter">Elegí uno para continuar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICES.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={selected === service.id}
            onSelect={() => onSelect(service.id)}
          />
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={!selected}
        className="w-full bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-semibold font-syne rounded-xl px-4 py-3 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuar
      </button>
    </div>
  )
}

function ServiceCard({
  service,
  isSelected,
  onSelect,
}: {
  service: Service
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        'flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
        isSelected
          ? 'border-[#c8a97e] bg-[#c8a97e]/10 gold-glow'
          : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a] hover:bg-[#1f1f1f]',
      ].join(' ')}
    >
      <span className="text-3xl leading-none">{service.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-syne font-semibold text-sm ${isSelected ? 'text-[#c8a97e]' : 'text-white'}`}>
          {service.label}
        </p>
        <p className="font-inter text-xs text-[#555] mt-0.5">{service.duration} min</p>
      </div>
      <div className="text-right">
        <p className={`font-syne font-bold text-sm ${isSelected ? 'text-[#c8a97e]' : 'text-[#888]'}`}>
          ${service.price.toLocaleString('es-AR')}
        </p>
      </div>
    </button>
  )
}
