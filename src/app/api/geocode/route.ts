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

  let geoData: GoogleGeocodeResponse
  try {
    const res = await fetch(url)
    geoData = await res.json()
  } catch {
    return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
  }

  if (geoData.status !== 'OK' || !geoData.results.length) {
    return NextResponse.json({ error: 'Address not found' }, { status: 400 })
  }

  const result = geoData.results[0]
  const countryComponent = result.address_components.find((c) =>
    c.types.includes('country')
  )

  if (countryComponent?.short_name !== 'AR') {
    return NextResponse.json(
      { error: 'Address must be within Argentina' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    lat: result.geometry.location.lat,
    lon: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  })
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
