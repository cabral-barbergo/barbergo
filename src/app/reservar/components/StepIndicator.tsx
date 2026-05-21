'use client'

const LABELS = ['Ubicación', 'Turno', 'Servicio', 'Confirmar']

interface Props {
  current: number // 1-4
}

export default function StepIndicator({ current }: Props) {
  return (
    <div className="flex items-center justify-center gap-0 px-4">
      {LABELS.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-syne transition-all',
                  done  ? 'bg-[#c8a97e] text-black'           : '',
                  active ? 'bg-[#c8a97e] text-black gold-glow' : '',
                  !done && !active ? 'bg-[#2a2a2a] text-[#555]' : '',
                ].join(' ')}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={[
                  'mt-1 text-[10px] font-inter hidden sm:block transition-colors',
                  active ? 'text-[#c8a97e]' : done ? 'text-[#c8a97e]/60' : 'text-[#444]',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {i < LABELS.length - 1 && (
              <div
                className={[
                  'h-px w-8 sm:w-12 mx-1 transition-colors',
                  done ? 'bg-[#c8a97e]/50' : 'bg-[#2a2a2a]',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
