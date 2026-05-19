import { NextResponse } from 'next/server'
import { getBookingsByDate, getActiveSlots, getBlockedSlots, getBlockedDays } from '@/lib/db/bookings'
import { getAvailableSlotsForDay } from '@/lib/routing'
import { jsToAppDay } from '@/lib/slots'

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

  const jsDay = new Date(`${date}T12:00:00`).getDay()
  // Weekends (0=Sun, 6=Sat) have no slots
  if (jsDay === 0 || jsDay === 6) {
    return NextResponse.json({ slots: [], isBlocked: false })
  }

  const appDay = jsToAppDay(jsDay)

  try {
    const [activeSlots, blockedSlots, bookings, blockedDays] = await Promise.all([
      getActiveSlots(appDay),
      getBlockedSlots(date),
      getBookingsByDate(date),
      getBlockedDays(),
    ])

    // Whole-day block check (backward compat with blocked_days table)
    const dayBlocked = blockedDays.find((b) => b.date === date)
    if (dayBlocked) {
      return NextResponse.json({ slots: [], isBlocked: true, reason: dayBlocked.reason ?? undefined })
    }

    if (activeSlots.length === 0) {
      return NextResponse.json({ slots: [], isBlocked: true, reason: 'Día no disponible' })
    }

    const slots = getAvailableSlotsForDay(bookings, date, lat, lon, activeSlots, blockedSlots)

    console.log(`[availability] date=${date} active=${activeSlots.length} blocked=${blockedSlots.length} bookings=${bookings.length} available=${slots.length}`)

    return NextResponse.json({ slots, isBlocked: false })
  } catch (err) {
    console.error('[availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
