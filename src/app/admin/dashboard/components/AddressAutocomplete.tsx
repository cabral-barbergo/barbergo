'use client'

import { useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let mapsReady = false

interface Props {
  value: string
  onChange: (v: string) => void
  onPlaceSelect: (address: string, lat: number, lon: number) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
  autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!mapsReady) {
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' })
      mapsReady = true
    }

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
          const addr = place.formatted_address ?? ''
          if (addr) onChange(addr)
          if (place.geometry?.location) {
            onPlaceSelect(addr, place.geometry.location.lat(), place.geometry.location.lng())
          }
        })
      })
      .catch(() => {})

    return () => {
      if (ac) google.maps.event.clearInstanceListeners(ac)
    }
  // onPlaceSelect and onChange are stable setters — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
    />
  )
}
