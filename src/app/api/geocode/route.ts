import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { address } = body as { address?: string }
  if (!address?.trim()) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Geocoding not configured' }, { status: 500 })
  }

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}&key=${apiKey}`

  console.log('[geocode] address input:', address)
  console.log('[geocode] request URL:', url.replace(apiKey, 'REDACTED'))

  let geoData: GoogleGeocodeResponse
  try {
    const res = await fetch(url)
    geoData = await res.json()
  } catch (err) {
    console.error('[geocode] fetch error:', err)
    return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
  }

  console.log('[geocode] status:', geoData.status)
  console.log('[geocode] results count:', geoData.results?.length ?? 0)
  if (geoData.results?.length) {
    console.log('[geocode] first result formatted_address:', geoData.results[0].formatted_address)
    console.log('[geocode] first result address_components:', JSON.stringify(geoData.results[0].address_components))
    console.log('[geocode] first result location:', JSON.stringify(geoData.results[0].geometry.location))
  } else {
    console.log('[geocode] full response:', JSON.stringify(geoData))
  }

  if (geoData.status !== 'OK' || !geoData.results.length) {
    return NextResponse.json({ error: 'Address not found' }, { status: 400 })
  }

  const result = geoData.results[0]
  const countryComponent = result.address_components.find((c) =>
    c.types.includes('country')
  )

  console.log('[geocode] country component:', JSON.stringify(countryComponent))

  if (countryComponent?.short_name !== 'AR') {
    return NextResponse.json(
      { error: 'Address must be within Argentina' },
      { status: 400 }
    )
  }

  const isMercedes = result.address_components.some(
    (c) =>
      (c.types.includes('locality') || c.types.includes('sublocality')) &&
      c.long_name.toLowerCase().includes('mercedes')
  )

  if (!isMercedes) {
    return NextResponse.json(
      { error: 'Solo realizamos servicios en Mercedes, Buenos Aires. Verificá tu dirección.' },
      { status: 400 }
    )
  }

  const { lat, lng } = result.geometry.location
  const distanceKm = haversineKm(lat, lng, -34.6519, -59.4307)

  if (distanceKm > 15) {
    return NextResponse.json(
      { error: 'La dirección ingresada está fuera del área de servicio (Mercedes, Buenos Aires).' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    lat,
    lon: lng,
    formattedAddress: result.formatted_address,
  })
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---- types ----------------------------------------------------------------

interface GoogleGeocodeResponse {
  status: string
  results: Array<{
    formatted_address: string
    geometry: { location: { lat: number; lng: number } }
    address_components: Array<{ types: string[]; short_name: string; long_name: string }>
  }>
}
