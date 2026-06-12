import { NextResponse } from 'next/server'
import { getBookingsByDate, getActiveSlots, getBlockedSlots, getBlockedDays, getServiceZone } from '@/lib/db/bookings'
import { getAvailableSlotsForDay, getEffectiveLocation } from '@/lib/routing'
import { jsToAppDay } from '@/lib/slots'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const latRaw = searchParams.get('lat')
  const lonRaw = searchParams.get('lon')

  if (!date || latRaw == null || lonRaw == null) {
    return NextResponse.json({ error: 'date, lat, and lon are required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  const lat = parseFloat(latRaw)
  const lon = parseFloat(lonRaw)
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat and lon must be numbers' }, { status: 400 })
  }

  const jsDay = new Date(`${date}T12:00:00`).getDay()
  // Sunday (0) has no slots; Saturday (6) is allowed
  if (jsDay === 0) {
    return NextResponse.json({ slots: [], isBlocked: false })
  }

  const appDay = jsToAppDay(jsDay)

  try {
    const [activeSlots, blockedSlots, bookings, blockedDays, zone] = await Promise.all([
      getActiveSlots(appDay),
      getBlockedSlots(date),
      getBookingsByDate(date),
      getBlockedDays(),
      getServiceZone(),
    ])

    // Whole-day block check (backward compat with blocked_days table)
    const dayBlocked = blockedDays.find((b) => b.date === date)
    if (dayBlocked) {
      return NextResponse.json({ slots: [], isBlocked: true, reason: dayBlocked.reason ?? undefined })
    }

    if (activeSlots.length === 0) {
      return NextResponse.json({ slots: [], isBlocked: true, reason: 'Día no disponible' })
    }

    const eff = getEffectiveLocation(lat, lon, zone)
    const slots = getAvailableSlotsForDay(bookings, date, eff.lat, eff.lon, activeSlots, blockedSlots, zone)

    console.log('[availability] date=%s lat=%s lon=%s isolated=%s effLat=%s effLon=%s activeSlots=%d bookings=%d result=%d',
      date, lat, lon, eff.isIsolated, eff.lat, eff.lon, activeSlots.length, bookings.length, slots.length)

    return NextResponse.json({ slots, isBlocked: false })
  } catch (err) {
    console.error('[availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
