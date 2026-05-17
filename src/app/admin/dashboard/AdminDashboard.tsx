'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AgendaSection       from './sections/AgendaSection'
import AvailabilitySection from './sections/AvailabilitySection'
import BlockedDaysSection  from './sections/BlockedDaysSection'

type Tab = 'agenda' | 'disponibilidad' | 'bloqueados'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'agenda',          label: 'Agenda',         icon: '📅' },
  { id: 'disponibilidad',  label: 'Disponibilidad', icon: '🕐' },
  { id: 'bloqueados',      label: 'Días bloqueados', icon: '🚫' },
]

export default function AdminDashboard() {
  const router  = useRouter()
  const [tab, setTab] = useState<Tab>('agenda')
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#c8a97e] text-xl">💈</span>
          <span className="font-syne font-bold text-white text-lg">BarberGo</span>
          <span className="ml-2 text-[#333] text-xs font-inter border border-[#222] rounded px-2 py-0.5">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-[#444] hover:text-[#c8a97e] text-xs font-inter transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Salir
        </button>
      </header>

      {/* Tab nav */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-8 flex gap-1">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-inter font-medium border-b-2 transition-colors',
              tab === id
                ? 'border-[#c8a97e] text-[#c8a97e]'
                : 'border-transparent text-[#444] hover:text-[#888]',
            ].join(' ')}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-8 py-7 max-w-7xl mx-auto w-full">
        {tab === 'agenda'         && <AgendaSection />}
        {tab === 'disponibilidad' && <AvailabilitySection />}
        {tab === 'bloqueados'     && <BlockedDaysSection />}
      </div>
    </div>
  )
}
