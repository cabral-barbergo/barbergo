// v2 - debug clientPhone
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import {
  getBookingsByDate,
  createBooking,
  isSlotTaken,
  getActiveSlots,
  getBlockedSlots,
  getBlockedDays,
  getServiceZone,
  SlotConflictError,
} from '@/lib/db/bookings'
import { groupSlotsIntoBlocks, findBlockForSlot, canJoinBlock, getEffectiveLocation } from '@/lib/routing'
import { jsToAppDay } from '@/lib/slots'
import { notifyBookingCreated } from '@/lib/notify'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, slot, clientName, clientPhone, address, lat, lon, serviceId: rawServiceId } =
    body as Record<string, unknown>

  console.log('[bookings POST] body:', { clientName, clientPhone, date, slot })

  const serviceId = typeof rawServiceId === 'string' ? rawServiceId : 'corte'

  if (
    typeof date !== 'string' ||
    typeof slot !== 'string' ||
    typeof clientName !== 'string' ||
    typeof clientPhone !== 'string' ||
    typeof address !== 'string' ||
    typeof lat !== 'number' ||
    typeof lon !== 'number'
  ) {
    return NextResponse.json(
      { error: 'date, slot, clientName, clientPhone, address, lat, lon are required' },
      { status: 400 }
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  const jsDay = new Date(`${date}T12:00:00`).getDay()
  if (jsDay === 0 || jsDay === 6) {
    return NextResponse.json({ error: 'No hay turnos disponibles los fines de semana' }, { status: 409 })
  }
  const appDay = jsToAppDay(jsDay)

  try {
    const [blockedDays, activeSlots, blockedSlots, existing, zone] = await Promise.all([
      getBlockedDays(),
      getActiveSlots(appDay),
      getBlockedSlots(date),
      getBookingsByDate(date),
      getServiceZone(),
    ])

    // Whole-day block check
    if (blockedDays.some((b) => b.date === date)) {
      return NextResponse.json({ error: 'Este día no está disponible' }, { status: 409 })
    }

    // Slot validity check
    if (!activeSlots.includes(slot)) {
      return NextResponse.json({ error: 'Horario inválido para este día' }, { status: 400 })
    }

    // Slot blocked check
    if (blockedSlots.includes(slot)) {
      return NextResponse.json({ error: 'Este horario no está disponible' }, { status: 409 })
    }

    // Early duplicate check
    if (existing.some((b) => b.slot === slot)) {
      return NextResponse.json({ error: 'Este horario ya no está disponible' }, { status: 409 })
    }

    // Block-based proximity + adjacency check (use effective location for proximity)
    const eff = getEffectiveLocation(lat, lon, zone)
    const naturalBlocks = groupSlotsIntoBlocks(activeSlots)
    const block = findBlockForSlot(slot, naturalBlocks)
    if (!block) {
      return NextResponse.json({ error: 'Horario inválido' }, { status: 400 })
    }
    const blockBookings = existing.filter((b) => block.includes(b.slot.substring(0, 5)))
    const projectedBlockBookings = blockBookings.map((b) => {
      const bEff = getEffectiveLocation(b.lat, b.lon, zone)
      return { ...b, lat: bEff.lat, lon: bEff.lon }
    })
    const joinResult = canJoinBlock(block, projectedBlockBookings, slot, eff.lat, eff.lon)
    if (!joinResult.ok) {
      const msg =
        joinResult.reason === 'distance'
          ? 'Tu ubicación está fuera del área de servicio para este horario'
          : 'Este horario no es adyacente a los turnos existentes del bloque'
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    // Final atomic check to narrow race window
    if (await isSlotTaken(date, slot)) {
      return NextResponse.json({ error: 'Este horario ya no está disponible' }, { status: 409 })
    }

    const booking = await createBooking({ date, slot, clientName, clientPhone, address, lat, lon, serviceId })

    console.log('[notify] clientPhone from booking object:', booking.clientPhone)
    console.log('[notify] clientPhone from request body:', clientPhone)
    console.log('[notify] PELUQUERO_PHONE env:', process.env.PELUQUERO_PHONE ? 'set' : 'NOT SET')
    console.log('[notify] TWILIO_SID env:', process.env.TWILIO_ACCOUNT_SID ? 'set' : 'NOT SET')

    waitUntil(
      notifyBookingCreated(booking).catch((err) => console.error('[notify] booking created:', err))
    )

    return NextResponse.json(booking, { status: 201 })
  } catch (err) {
    if (err instanceof SlotConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error('[bookings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
