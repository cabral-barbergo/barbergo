import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
        <span className="inline-block text-[#c8a97e] text-sm font-inter font-medium tracking-widest uppercase mb-6">
          Peluquería a domicilio
        </span>

        <h1 className="font-syne text-5xl sm:text-6xl md:text-7xl font-bold leading-tight text-balance mb-6 max-w-3xl">
          Tu peluquero,{' '}
          <span className="text-[#c8a97e]">donde estés</span>
        </h1>

        <p className="font-inter text-white/60 text-lg sm:text-xl max-w-xl mb-10 text-balance">
          Reservá un turno en minutos. El peluquero llega a tu casa en el horario que elegís, sin filas ni esperas.
        </p>

        <Link
          href="/reservar"
          className="inline-flex items-center gap-2 bg-[#c8a97e] text-[#0a0a0a] font-inter font-semibold text-base px-8 py-4 rounded-full hover:bg-[#d4b98a] active:scale-95 transition-all duration-150"
        >
          Reservar turno
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </main>

      {/* Features */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-[#c8a97e]/40 flex items-center justify-center text-[#c8a97e]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-syne font-semibold text-white text-base">A domicilio</h3>
            <p className="font-inter text-white/50 text-sm leading-relaxed">
              El peluquero va donde vos estés. Nada de traslados.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-[#c8a97e]/40 flex items-center justify-center text-[#c8a97e]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-syne font-semibold text-white text-base">Ruta optimizada</h3>
            <p className="font-inter text-white/50 text-sm leading-relaxed">
              Los turnos se organizan por cercanía para que todo fluya.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-[#c8a97e]/40 flex items-center justify-center text-[#c8a97e]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-syne font-semibold text-white text-base">Sin llamadas</h3>
            <p className="font-inter text-white/50 text-sm leading-relaxed">
              Reservá online en segundos y recibís confirmación al instante.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 flex items-center justify-center">
        <Link
          href="/admin"
          className="font-inter text-white/20 text-xs hover:text-white/40 transition-colors"
        >
          Admin
        </Link>
      </footer>
    </div>
  )
}
