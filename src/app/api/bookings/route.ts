import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getBookingsByDate, createBooking, getAvailability, getBlockedDays } from '@/lib/db/bookings'
import { canJoinDay } from '@/lib/routing'
import { generateSlots, jsToAppDay } from '@/lib/slots'
import { notifyBookingCreated } from '@/lib/notify'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, slot, clientName, clientPhone, address, lat, lon, serviceId } =
    body as Record<string, unknown>

  if (
    typeof date !== 'string' ||
    typeof slot !== 'string' ||
    typeof clientName !== 'string' ||
    typeof clientPhone !== 'string' ||
    typeof address !== 'string' ||
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    typeof serviceId !== 'string'
  ) {
    return NextResponse.json(
      { error: 'date, slot, clientName, clientPhone, address, lat, lon, serviceId are required' },
      { status: 400 }
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const [blockedDays, availability, existing] = await Promise.all([
      getBlockedDays(),
      getAvailability(),
      getBookingsByDate(date),
    ])

    // Blocked day check
    if (blockedDays.some((b) => b.date === date)) {
      return NextResponse.json({ error: 'This day is not available' }, { status: 409 })
    }

    // Day config check
    const jsDay = new Date(`${date}T12:00:00`).getDay()
    const dayConfig = availability.find((a) => a.dayOfWeek === jsToAppDay(jsDay))
    if (!dayConfig) {
      return NextResponse.json({ error: 'No availability configured for this day' }, { status: 409 })
    }

    // Slot validity check
    const allSlots = generateSlots(dayConfig.startTime, dayConfig.endTime)
    if (!allSlots.includes(slot)) {
      return NextResponse.json({ error: 'Invalid slot for this day' }, { status: 400 })
    }

    // Race condition check: slot taken
    if (existing.some((b) => b.slot === slot)) {
      return NextResponse.json({ error: 'Slot is no longer available' }, { status: 409 })
    }

    // Routing check
    const joinResult = canJoinDay(existing, lat, lon)
    if (!joinResult.ok) {
      const message =
        joinResult.reason === 'corridor'
          ? 'Location is outside the service corridor for this day'
          : 'Adding this booking would create an excessive detour'
      return NextResponse.json({ error: message, reason: joinResult.reason }, { status: 409 })
    }

    const booking = await createBooking({
      date,
      slot,
      clientName,
      clientPhone,
      address,
      lat,
      lon,
      serviceId,
    })

    // Keep function alive after response so Twilio call completes
    waitUntil(notifyBookingCreated(booking).catch((err) =>
      console.error('[notify] booking created:', err)
    ))

    return NextResponse.json(booking, { status: 201 })
  } catch (err) {
    console.error('[bookings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
