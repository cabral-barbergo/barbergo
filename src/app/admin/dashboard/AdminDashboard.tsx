'use client'

import { useState, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, CalendarDays, Settings, LogOut, BarChart3 } from 'lucide-react'
import BarberGoLogo from '@/components/BarberGoLogo'
import AgendaSection      from './sections/AgendaSection'
import CalendarSection    from './sections/CalendarSection'
import ConfigGroupSection from './sections/ConfigGroupSection'
import StatsSection       from './sections/StatsSection'

type Tab = 'ruta' | 'agenda' | 'estadisticas' | 'configuracion'

const NAV_ITEMS: { id: Tab; label: string; Icon: ElementType }[] = [
  { id: 'agenda',        label: 'Agenda',        Icon: CalendarDays },
  { id: 'ruta',          label: 'Ruta',          Icon: MapPin },
  { id: 'estadisticas',  label: 'Estadísticas',  Icon: BarChart3 },
  { id: 'configuracion', label: 'Configuración', Icon: Settings },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [tab,        setTab]        = useState<Tab>('ruta')
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

      {/* Desktop tab nav */}
      <div className="hidden md:flex border-b border-[#1a1a1a] px-4 sm:px-8 gap-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
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
        {tab === 'estadisticas'  && <StatsSection />}
        {tab === 'configuracion' && <ConfigGroupSection />}
      </div>

      {/* Mobile/tablet bottom nav — 4-item pill nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-[#222] h-16 flex items-center justify-around px-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                maxWidth: isActive ? '160px' : '40px',
                minWidth: '40px',
                padding: isActive ? '0 14px' : '0',
                transition: 'max-width 220ms ease, padding 220ms ease, background-color 150ms ease',
              }}
              className={[
                'flex items-center justify-center gap-2 h-10 rounded-full overflow-hidden',
                isActive ? 'bg-[#c8a97e]' : 'bg-transparent',
              ].join(' ')}
              aria-label={label}
            >
              <Icon
                size={20}
                style={{ color: isActive ? '#000' : '#666', flexShrink: 0 }}
              />
              <span
                style={{
                  opacity: isActive ? 1 : 0,
                  maxWidth: isActive ? '120px' : '0',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  color: '#000',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter, sans-serif)',
                  transition: 'opacity 150ms ease 60ms, max-width 200ms ease',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
