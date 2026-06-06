'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, CalendarDays, Settings, LogOut } from 'lucide-react'
import BarberGoLogo from '@/components/BarberGoLogo'
import AgendaSection       from './sections/AgendaSection'
import CalendarSection     from './sections/CalendarSection'
import ConfigGroupSection  from './sections/ConfigGroupSection'

type Tab = 'ruta' | 'agenda' | 'configuracion'

export default function AdminDashboard() {
  const router     = useRouter()
  const [tab, setTab]           = useState<Tab>('ruta')
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
          <BarberGoLogo size={20} />
          <span className="font-syne font-bold text-white text-lg">Seba Cabral</span>
          <span className="ml-2 text-[#333] text-xs font-inter border border-[#222] rounded px-2 py-0.5">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-[#444] hover:text-[#c8a97e] text-xs font-inter transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <LogOut size={14} />
          Salir
        </button>
      </header>

      {/* Desktop tab nav — hidden on mobile */}
      <div className="hidden md:flex border-b border-[#1a1a1a] px-4 sm:px-8 gap-1">
        {([
          { id: 'ruta'          as Tab, label: 'Ruta',          Icon: MapPin },
          { id: 'agenda'        as Tab, label: 'Agenda',        Icon: CalendarDays },
          { id: 'configuracion' as Tab, label: 'Configuración', Icon: Settings },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-3.5 text-sm font-inter font-medium border-b-2 transition-colors',
              tab === id
                ? 'border-[#c8a97e] text-[#c8a97e]'
                : 'border-transparent text-[#444] hover:text-[#888]',
            ].join(' ')}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-8 py-7 max-w-7xl mx-auto w-full pb-24 md:pb-7">
        {tab === 'ruta'          && <AgendaSection />}
        {tab === 'agenda'        && <CalendarSection />}
        {tab === 'configuracion' && <ConfigGroupSection />}
      </div>

      {/* Mobile bottom nav — visible only on mobile/tablet */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-[#222] h-16 flex items-center justify-around px-2">
        {/* Ruta */}
        <button
          onClick={() => setTab('ruta')}
          className="flex flex-col items-center gap-0.5 px-4"
        >
          <MapPin size={20} className={tab === 'ruta' ? 'text-[#c8a97e]' : 'text-[#666]'} />
          <span className={`text-[10px] font-inter ${tab === 'ruta' ? 'text-[#c8a97e]' : 'text-[#666]'}`}>Ruta</span>
        </button>

        {/* Agenda — elevated center button */}
        <button
          onClick={() => setTab('agenda')}
          className="flex flex-col items-center -mt-5"
        >
          <span className={[
            'w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-all',
            tab === 'agenda' ? 'bg-[#c8a97e]' : 'bg-[#1a1a1a] border border-[#2a2a2a]',
          ].join(' ')}>
            <CalendarDays size={22} className={tab === 'agenda' ? 'text-black' : 'text-[#666]'} />
          </span>
          <span className={`text-[10px] font-inter mt-0.5 ${tab === 'agenda' ? 'text-[#c8a97e]' : 'text-[#666]'}`}>Agenda</span>
        </button>

        {/* Config */}
        <button
          onClick={() => setTab('configuracion')}
          className="flex flex-col items-center gap-0.5 px-4"
        >
          <Settings size={20} className={tab === 'configuracion' ? 'text-[#c8a97e]' : 'text-[#666]'} />
          <span className={`text-[10px] font-inter ${tab === 'configuracion' ? 'text-[#c8a97e]' : 'text-[#666]'}`}>Config</span>
        </button>
      </nav>
    </div>
  )
}
