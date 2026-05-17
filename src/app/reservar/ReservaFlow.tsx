'use client'

import { useState } from 'react'
import type { Booking } from '@/lib/types'
import StepIndicator from './components/StepIndicator'
import SuccessScreen from './components/SuccessScreen'
import Step1Location, { type LocationData } from './steps/Step1Location'
import Step2Day from './steps/Step2Day'
import Step3Slot from './steps/Step3Slot'
import Step4Service from './steps/Step4Service'
import Step5Form from './steps/Step5Form'

type Step = 1 | 2 | 3 | 4 | 5

interface ReservaState {
  location: LocationData | null
  date: string | null
  slot: string | null
  serviceId: string | null
}

export default function ReservaFlow() {
  const [step, setStep]   = useState<Step>(1)
  const [state, setState] = useState<ReservaState>({
    location: null,
    date: null,
    slot: null,
    serviceId: null,
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
            <Card>
              <Step2Day
                location={state.location}
                onSelect={(date) => {
                  patch({ date, slot: null })
                  setStep(3)
                }}
              />
              <BackButton onClick={() => setStep(1)} />
            </Card>
          )}

          {step === 3 && state.date && state.location && (
            <Card>
              <Step3Slot
                date={state.date}
                location={state.location}
                onSelect={(slot) => {
                  patch({ slot })
                  setStep(4)
                }}
              />
              <BackButton onClick={() => setStep(2)} />
            </Card>
          )}

          {step === 4 && (
            <Card>
              <Step4Service
                selected={state.serviceId}
                onSelect={(serviceId) => patch({ serviceId })}
                onConfirm={() => state.serviceId && setStep(5)}
              />
              <BackButton onClick={() => setStep(3)} />
            </Card>
          )}

          {step === 5 && state.date && state.slot && state.serviceId && state.location && (
            <Card>
              <Step5Form
                date={state.date}
                slot={state.slot}
                serviceId={state.serviceId}
                location={state.location}
                onSuccess={(booking) => setConfirmedBooking(booking)}
              />
              <BackButton onClick={() => setStep(4)} />
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
        <span className="text-[#c8a97e] text-xl">💈</span>
        <span className="font-syne font-bold text-white text-lg tracking-wide">BarberGo</span>
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
