import { NextResponse } from 'next/server'
import { getBookingsByDate, getAvailability, getBlockedDays } from '@/lib/db/bookings'
import { getAvailableSlotsForDay } from '@/lib/routing'
import { generateSlots, jsToAppDay } from '@/lib/slots'

export const dynamic = 'force-dynamic'

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

  try {
    const [blockedDays, availability, bookings] = await Promise.all([
      getBlockedDays(),
      getAvailability(),
      getBookingsByDate(date),
    ])

    console.log(`[availability] date=${date} lat=${lat} lon=${lon}`)
    console.log(`[availability] bookings from DB (${bookings.length}):`, JSON.stringify(bookings.map(b => ({ date: b.date, slot: b.slot, status: b.status }))))

    const blocked = blockedDays.find((b) => b.date === date)
    if (blocked) {
      return NextResponse.json({
        slots: [],
        isBlocked: true,
        reason: blocked.reason ?? undefined,
      })
    }

    const jsDay = new Date(`${date}T12:00:00`).getDay()
    const dayConfig = availability.find((a) => a.dayOfWeek === jsToAppDay(jsDay))

    if (!dayConfig) {
      return NextResponse.json({ slots: [], isBlocked: true, reason: 'Día no disponible' })
    }

    const allSlots = generateSlots(dayConfig.startTime, dayConfig.endTime)
    const slots = getAvailableSlotsForDay(bookings, date, lat, lon, allSlots)

    console.log(`[availability] slots result:`, JSON.stringify(slots))

    return NextResponse.json({ slots, isBlocked: false })
  } catch (err) {
    console.error('[availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
