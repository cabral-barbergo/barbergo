'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

type LatLon = [number, number]


const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

let mapsInitialized = false

export default function ZoneSection() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const centerMarkerRef = useRef<google.maps.Marker | null>(null)
  const vertexMarkersRef = useRef<google.maps.Marker[]>([])

  const polygonPathRef = useRef<LatLon[]>([])
  const centerRef = useRef<LatLon>([-34.6519, -59.4307])

  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const redrawPolygon = useCallback((map: google.maps.Map, path: LatLon[]) => {
    if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null }
    vertexMarkersRef.current.forEach((m) => m.setMap(null))
    vertexMarkersRef.current = []

    if (path.length < 2) return

    const gmPath = path.map(([lat, lng]) => ({ lat, lng }))
    const polygon = new google.maps.Polygon({
      paths: gmPath,
      strokeColor: '#c8a97e',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#c8a97e',
      fillOpacity: 0.15,
      map,
    })
    polygonRef.current = polygon

    path.forEach((pt, idx) => {
      const marker = new google.maps.Marker({
        position: { lat: pt[0], lng: pt[1] },
        map,
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#c8a97e',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      })
      marker.addListener('drag', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        polygonPathRef.current[idx] = [e.latLng.lat(), e.latLng.lng()]
        polygon.setPath(polygonPathRef.current.map(([la, ln]) => ({ lat: la, lng: ln })))
      })
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        polygonPathRef.current[idx] = [e.latLng.lat(), e.latLng.lng()]
      })
      vertexMarkersRef.current.push(marker)
    })
  }, [])

  useEffect(() => {
    if (!mapDivRef.current) return

    if (!mapsInitialized) {
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' })
      mapsInitialized = true
    }

    let cancelled = false

    ;(async () => {
      const { Map } = await importLibrary('maps') as google.maps.MapsLibrary
      if (cancelled || !mapDivRef.current) return

      const map = new Map(mapDivRef.current, {
        center: { lat: -34.6519, lng: -59.4307 },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        styles: MAP_STYLES,
      })
      mapRef.current = map

      // Load existing zone from API
      try {
        const res = await fetch('/api/admin/zone', {
          cache: 'no-store',
        })
        if (res.ok) {
          const zone = await res.json()
          centerRef.current = [zone.centerLat, zone.centerLon]
          polygonPathRef.current = zone.polygon as LatLon[]
          if (!cancelled) {
            map.setCenter({ lat: zone.centerLat, lng: zone.centerLon })
            redrawPolygon(map, polygonPathRef.current)

            const centerMarker = new google.maps.Marker({
              position: { lat: zone.centerLat, lng: zone.centerLon },
              map,
              draggable: true,
              title: 'Centro de la ciudad',
              icon: {
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: '#e05252',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              },
            })
            centerMarker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
              if (!e.latLng) return
              centerRef.current = [e.latLng.lat(), e.latLng.lng()]
            })
            centerMarkerRef.current = centerMarker
          }
        }
      } catch (err) {
        console.error('[ZoneSection] load zone:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        polygonPathRef.current = [...polygonPathRef.current, [e.latLng.lat(), e.latLng.lng()]]
        redrawPolygon(map, polygonPathRef.current)
      })
    })()

    return () => { cancelled = true }
  }, [redrawPolygon])

  function handleClear() {
    polygonPathRef.current = []
    if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null }
    vertexMarkersRef.current.forEach((m) => m.setMap(null))
    vertexMarkersRef.current = []
    setStatus(null)
  }

  async function handleSave() {
    if (polygonPathRef.current.length < 3) {
      setStatus('El polígono necesita al menos 3 vértices')
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/zone', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ center: centerRef.current, polygon: polygonPathRef.current }),
      })
      if (!res.ok) {
        const data = await res.json()
        setStatus(`Error: ${data.error}`)
      } else {
        setStatus('Zona guardada correctamente')
      }
    } catch {
      setStatus('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-syne font-bold text-white text-lg">Zona de cobertura</h2>
        <p className="text-[#666] text-xs mt-1 font-inter">
          Hacé clic en el mapa para agregar vértices al polígono. Arrastrá los vértices para ajustar.
          El marcador rojo es el centro de la ciudad (arrastralo para moverlo).
        </p>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-[#1a1a1a]" style={{ height: 480 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111] z-10">
            <span className="text-[#666] text-sm font-inter">Cargando mapa...</span>
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded text-xs font-inter font-medium border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-colors"
        >
          Limpiar polígono
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded text-xs font-inter font-medium bg-[#c8a97e] text-black hover:bg-[#d4b990] transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar zona'}
        </button>
        {status && (
          <span className={`text-xs font-inter ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {status}
          </span>
        )}
      </div>

      <div className="bg-[#111] rounded-lg border border-[#1a1a1a] p-4">
        <p className="text-[#555] text-xs font-inter font-medium uppercase tracking-wider mb-2">Cómo funciona</p>
        <ul className="text-[#666] text-xs font-inter space-y-1.5">
          <li>• Los clientes <span className="text-[#888]">dentro del polígono</span> usan la regla de proximidad normal (600 m).</li>
          <li>• Los clientes <span className="text-[#888]">fuera del polígono</span> se proyectan al punto del perímetro más cercano sobre la línea hacia el centro, y se usa ese punto para calcular la proximidad.</li>
          <li>• Arrastrá el marcador rojo para ajustar el centro de referencia de la ciudad.</li>
        </ul>
      </div>
    </div>
  )
}
