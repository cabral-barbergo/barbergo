'use client'

import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import type { Booking } from '@/lib/types'
import { SERVICES } from '@/lib/constants'

interface Props {
  bookings: Booking[]
}

let mapsInitialized = false

function markerSvg(n: number, highlight = false): string {
  const fill = highlight ? '#dfc4a1' : '#c8a97e'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.716 23.284 0 15 0z" fill="${fill}" stroke="#0a0a0a" stroke-width="1"/>
    <text x="15" y="20.5" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="#0a0a0a">${n}</text>
  </svg>`
}

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',               stylers: [{ color: '#1e1e1e' }] },
  { elementType: 'labels.text.fill',       stylers: [{ color: '#888' }] },
  { elementType: 'labels.text.stroke',     stylers: [{ color: '#1e1e1e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#aaa' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d4b5e' }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

export default function RouteMap({ bookings }: Props) {
  const divRef       = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<google.maps.Map | null>(null)
  const markersRef   = useRef<google.maps.Marker[]>([])
  const rendererRef  = useRef<google.maps.DirectionsRenderer | null>(null)
  const infoRef      = useRef<google.maps.InfoWindow | null>(null)

  const [realKm,   setRealKm]   = useState<number | null>(null)
  const [dirError, setDirError] = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!mapsInitialized) {
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' })
      mapsInitialized = true
    }

    let cancelled = false
    setLoading(true)
    setRealKm(null)
    setDirError(false)

    ;(async () => {
      const { Map, InfoWindow } = await importLibrary('maps') as google.maps.MapsLibrary
      if (cancelled || !divRef.current) return

      // Create or reuse map
      if (!mapRef.current) {
        mapRef.current = new Map(divRef.current, {
          center: { lat: -34.6519, lng: -59.4307 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: MAP_STYLES,
        })
        infoRef.current = new InfoWindow()
      }

      const map = mapRef.current

      // Clear previous markers
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      if (rendererRef.current) rendererRef.current.setMap(null)
      infoRef.current?.close()

      setLoading(false)
      if (bookings.length === 0) return

      // Bounds to auto-fit
      const bounds = new google.maps.LatLngBounds()

      bookings.forEach((b, i) => {
        const pos = { lat: b.lat, lng: b.lon }
        bounds.extend(pos)

        const icon: google.maps.Icon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(i + 1))}`,
          scaledSize: new google.maps.Size(30, 38),
          anchor:     new google.maps.Point(15, 38),
        }

        const marker = new google.maps.Marker({ position: pos, map, icon, title: b.clientName, zIndex: i + 1 })
        markersRef.current.push(marker)

        const svc = SERVICES.find((s) => s.id === b.serviceId)
        marker.addListener('click', () => {
          infoRef.current!.setContent(
            `<div style="font-family:sans-serif;padding:6px 2px;min-width:170px;line-height:1.6">` +
            `<b style="color:#c8a97e;font-size:13px">#${i + 1} — ${b.clientName}</b><br>` +
            `<span style="color:#777;font-size:11px">${svc?.label ?? b.serviceId} · ${b.slot}</span><br>` +
            `<span style="font-size:12px">${b.address}</span><br>` +
            `<a href="tel:${b.clientPhone}" style="color:#1a73e8;font-size:12px">${b.clientPhone}</a>` +
            `</div>`
          )
          infoRef.current!.open(map, marker)
        })
      })

      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })

      // Real route via Directions API
      if (bookings.length >= 2) {
        try {
          const { DirectionsService, DirectionsRenderer } = await importLibrary('routes') as google.maps.RoutesLibrary
          if (cancelled) return

          const renderer = new DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#c8a97e', strokeWeight: 3, strokeOpacity: 0.8 },
          })
          renderer.setMap(map)
          rendererRef.current = renderer

          const origin      = { lat: bookings[0].lat, lng: bookings[0].lon }
          const destination = { lat: bookings.at(-1)!.lat, lng: bookings.at(-1)!.lon }
          const waypoints   = bookings.slice(1, -1).map((b) => ({
            location: { lat: b.lat, lng: b.lon },
            stopover: true,
          }))

          new DirectionsService().route(
            { origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING },
            (result, status) => {
              if (cancelled) return
              if (status === 'OK' && result) {
                renderer.setDirections(result)
                const meters = result.routes[0].legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0)
                setRealKm(meters / 1000)
              } else {
                setDirError(true)
              }
            }
          )
        } catch {
          setDirError(true)
        }
      }
    })()

    return () => { cancelled = true }
  }, [bookings])

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-xl overflow-hidden">
        <div ref={divRef} className="w-full h-[420px]" />
        {loading && bookings.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
            <Spinner />
          </div>
        )}
        {!loading && bookings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] rounded-xl">
            <p className="text-[#444] text-sm font-inter">Sin turnos para este día</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4 text-xs font-inter text-[#555]">
        {realKm !== null && (
          <span>Ruta real: <span className="text-[#c8a97e] font-semibold">{realKm.toFixed(1)} km</span></span>
        )}
        {dirError && <span>Ruta estimada (Directions no disponible)</span>}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-6 h-6 animate-spin text-[#c8a97e]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
