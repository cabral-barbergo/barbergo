'use client'

import { useState } from 'react'
import type { Booking } from '@/lib/types'
import StepIndicator from './components/StepIndicator'
import SuccessScreen from './components/SuccessScreen'
import Step1Location, { type LocationData } from './steps/Step1Location'
import Step2DaySlot from './steps/Step2DaySlot'
import Step3Form from './steps/Step5Form'
import BarberGoLogo from '@/components/BarberGoLogo'

type Step = 1 | 2 | 3

interface ReservaState {
  location: LocationData | null
  date: string | null
  slot: string | null
}

export default function ReservaFlow() {
  const [step, setStep]   = useState<Step>(1)
  const [state, setState] = useState<ReservaState>({
    location: null,
    date: null,
    slot: null,
  })
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)

  function patch(update: Partial<ReservaState>) {
    setState((prev) => ({ ...prev, ...update }))
  }

  if (confirmedBooking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <SuccessScreen booking={confirmedBooking} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      <div className="pt-6 pb-4 px-4">
        <StepIndicator current={step} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-lg">

          {step === 1 && (
            <Card>
              <Step1Location
                onConfirm={(location) => {
                  patch({ location })
                  setStep(2)
                }}
              />
            </Card>
          )}

          {step === 2 && state.location && (
            <div>
              <Step2DaySlot
                location={state.location}
                onSelect={(date, slot) => {
                  patch({ date, slot })
                  setStep(3)
                }}
              />
              <BackButton onClick={() => setStep(1)} />
            </div>
          )}

          {step === 3 && state.date && state.slot && state.location && (
            <Card>
              <Step3Form
                date={state.date}
                slot={state.slot}
                location={state.location}
                onSuccess={(booking) => setConfirmedBooking(booking)}
              />
              <BackButton onClick={() => setStep(2)} />
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="flex items-center justify-center py-6 px-4 border-b border-[#1a1a1a]">
      <a href="/" className="flex items-center gap-2">
        <BarberGoLogo size={20} />
        <span className="font-syne font-bold text-white text-lg tracking-wide">Seba Cabral</span>
      </a>
    </header>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40">
      {children}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-5 flex items-center gap-1 text-[#444] hover:text-[#888] text-xs font-inter transition-colors"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver
    </button>
  )
}
