'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BarberGoLogo from '@/components/BarberGoLogo'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      router.push('/admin/dashboard')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BarberGoLogo size={40} />
          <h1 className="font-syne font-bold text-white text-2xl mt-3">BarberGo Admin</h1>
          <p className="text-[#444] text-sm font-inter mt-1">Acceso restringido</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 space-y-5 shadow-xl shadow-black/50"
        >
          <div>
            <label className="block text-xs font-inter text-[#555] uppercase tracking-wide mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              autoFocus
              autoComplete="current-password"
              className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm font-inter text-white placeholder-[#333] focus:outline-none focus:border-[#c8a97e]/60 focus:ring-1 focus:ring-[#c8a97e]/30 transition-all"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-inter">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-bold font-syne rounded-xl px-4 py-3 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Spinner /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-black" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
