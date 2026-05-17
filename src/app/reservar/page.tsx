import type { Metadata } from 'next'
import ReservaFlow from './ReservaFlow'

export const metadata: Metadata = {
  title: 'Reservar turno | BarberGo',
}

export default function ReservarPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <ReservaFlow />
    </main>
  )
}
