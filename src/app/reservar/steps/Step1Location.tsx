'use client'

import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

export interface LocationData {
  lat: number
  lon: number
  address: string
}

interface Props {
  onConfirm: (data: LocationData) => void
}

let mapsInitialized = false
function initMaps() {
  if (!mapsInitialized) {
    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' })
    mapsInitialized = true
  }
}

export default function Step1Location({ onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [addressInput, setAddressInput] = useState('')
  const [loading, setLoading]     = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    initMaps()
    let ac: google.maps.places.Autocomplete | null = null

    importLibrary('places')
      .then((lib) => {
        const { Autocomplete } = lib as google.maps.PlacesLibrary
        if (!inputRef.current) return
        ac = new Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'ar' },
          fields: ['formatted_address', 'geometry'],
          types: ['address'],
        })
        ac.addListener('place_changed', () => {
          const place = ac!.getPlace()
          if (place.formatted_address) setAddressInput(place.formatted_address)
        })
      })
      .catch(() => {/* Maps API not configured */})

    return () => {
      if (ac) google.maps.event.clearInstanceListeners(ac)
    }
  }, [])

  async function geocode(address: string): Promise<LocationData> {
    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al geocodificar')
    return { lat: data.lat, lon: data.lon, address: data.formattedAddress }
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await geocode(`${coords.latitude},${coords.longitude}`)
          onConfirm(data)
        } catch {
          onConfirm({ lat: coords.latitude, lon: coords.longitude, address: 'Tu ubicación actual' })
        } finally {
          setGeoLoading(false)
        }
      },
      (err) => {
        setGeoLoading(false)
        setError(
          err.code === 1
            ? 'Permiso denegado. Ingresá la dirección manualmente.'
            : 'No pudimos obtener tu ubicación.'
        )
      }
    )
  }

  async function handleConfirm() {
    const addr = addressInput.trim()
    if (!addr) { setError('Ingresá una dirección.'); return }
    setLoading(true)
    setError(null)
    try {
      const data = await geocode(addr)
      onConfirm(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-syne text-xl font-bold text-white mb-1">¿Dónde te encuentro?</h2>
        <p className="text-[#666] text-sm font-inter">Ingresá tu dirección o usá tu ubicación actual</p>
      </div>

      <button
        onClick={handleUseLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2 border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm font-inter font-medium text-[#c8a97e] hover:border-[#c8a97e]/60 hover:bg-[#c8a97e]/5 transition-all disabled:opacity-50"
      >
        {geoLoading ? <Spinner /> : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        Usar mi ubicación
      </button>

      <Divider />

      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={addressInput}
          onChange={(e) => { setAddressInput(e.target.value); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
          className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm font-inter text-white placeholder-[#444] focus:outline-none focus:border-[#c8a97e]/60 focus:ring-1 focus:ring-[#c8a97e]/30 transition-all"
        />

        {error && <p className="text-red-400 text-xs font-inter">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={loading || !addressInput.trim()}
          className="w-full bg-[#c8a97e] hover:bg-[#dfc4a1] text-black font-semibold font-syne rounded-xl px-4 py-3 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><Spinner dark />Verificando…</span>
            : 'Confirmar dirección'}
        </button>
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[#2a2a2a]" />
      <span className="text-[#444] text-xs font-inter">o</span>
      <div className="flex-1 h-px bg-[#2a2a2a]" />
    </div>
  )
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg className={`w-4 h-4 animate-spin ${dark ? 'text-black' : 'text-[#c8a97e]'}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
