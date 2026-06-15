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
  // CSRF: require JSON content-type
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported Media Type' }, { status: 415 })
  }

  // CSRF: origin check
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (origin) {
    const allowed = appUrl ? origin === appUrl : (host ? origin.includes(host) : false)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  // ── Input validation ────────────────────────────────────────────
  const rawClientName = raw.clientName
  const rawClientPhone = raw.clientPhone
  const rawDate = raw.date
  const rawSlot = raw.slot
  const rawLat = raw.lat
  const rawLon = raw.lon
  const rawAddress = raw.address

  // clientName: required, string, 2-100 chars, letters/spaces only
  if (typeof rawClientName !== 'string') {
    return NextResponse.json({ error: 'Invalid input', details: 'clientName is required' }, { status: 400 })
  }
  const clientName = rawClientName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').trim()
  if (clientName.length < 2 || clientName.length > 100) {
    return NextResponse.json({ error: 'Invalid input', details: 'clientName must be 2-100 characters' }, { status: 400 })
  }

  // clientPhone: required, digits only, 8-15 chars
  if (typeof rawClientPhone !== 'string') {
    return NextResponse.json({ error: 'Invalid input', details: 'clientPhone is required' }, { status: 400 })
  }
  const clientPhone = rawClientPhone.replace(/\D/g, '')
  if (clientPhone.length < 8 || clientPhone.length > 15) {
    return NextResponse.json({ error: 'Invalid input', details: 'clientPhone must be 8-15 digits' }, { status: 400 })
  }

  // date: required, YYYY-MM-DD, today or future
  if (typeof rawDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return NextResponse.json({ error: 'Invalid input', details: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  const date = rawDate
  const today = new Date().toISOString().split('T')[0]
  if (date < today) {
    return NextResponse.json({ error: 'Invalid input', details: 'date must be today or in the future' }, { status: 400 })
  }

  // slot: required, HH:MM
  if (typeof rawSlot !== 'string' || !/^\d{2}:\d{2}$/.test(rawSlot)) {
    return NextResponse.json({ error: 'Invalid input', details: 'slot must be HH:MM' }, { status: 400 })
  }
  const slot = rawSlot

  // lat/lon: required numbers in range
  if (typeof rawLat !== 'number' || typeof rawLon !== 'number') {
    return NextResponse.json({ error: 'Invalid input', details: 'lat and lon must be numbers' }, { status: 400 })
  }
  const lat = rawLat
  const lon = rawLon
  if (lat < -90 || lat > 90) {
    return NextResponse.json({ error: 'Invalid input', details: 'lat must be between -90 and 90' }, { status: 400 })
  }
  if (lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid input', details: 'lon must be between -180 and 180' }, { status: 400 })
  }

  // address: required string, max 300 chars
  if (typeof rawAddress !== 'string') {
    return NextResponse.json({ error: 'Invalid input', details: 'address is required' }, { status: 400 })
  }
  const address = rawAddress.trim().slice(0, 300)

  // persons and slotsNeeded
  const persons = typeof raw.persons === 'number' && raw.persons >= 1 && raw.persons <= 4 ? raw.persons : 1
  const slotsNeeded = typeof raw.slotsNeeded === 'number' && raw.slotsNeeded >= 1 ? raw.slotsNeeded : 1

  // ────────────────────────────────────────────────────────────────

  console.log('[bookings POST] body:', { clientName, clientPhone, date, slot, persons, slotsNeeded })

  const serviceId = typeof raw.serviceId === 'string' ? raw.serviceId : 'corte'

  const jsDay = new Date(`${date}T12:00:00`).getDay()
  if (jsDay === 0) {
    return NextResponse.json({ error: 'No hay turnos disponibles los domingos' }, { status: 409 })
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

    // For multi-slot bookings, find and validate additional slots in the same block
    let additionalSlots: string[] = []
    if (slotsNeeded > 1) {
      const startIdx = block.indexOf(slot)
      for (let i = 1; i < slotsNeeded; i++) {
        const extraSlot = block[startIdx + i]
        if (!extraSlot) {
          return NextResponse.json({ error: 'No hay suficientes horarios contiguos disponibles' }, { status: 409 })
        }
        if (blockedSlots.includes(extraSlot)) {
          return NextResponse.json({ error: 'No hay suficientes horarios contiguos disponibles' }, { status: 409 })
        }
        if (existing.some((b) => b.slot === extraSlot)) {
          return NextResponse.json({ error: 'No hay suficientes horarios contiguos disponibles' }, { status: 409 })
        }
        additionalSlots.push(extraSlot)
      }
    }

    // Final atomic check to narrow race window
    if (await isSlotTaken(date, slot)) {
      return NextResponse.json({ error: 'Este horario ya no está disponible' }, { status: 409 })
    }
    for (const extra of additionalSlots) {
      if (await isSlotTaken(date, extra)) {
        return NextResponse.json({ error: 'No hay suficientes horarios contiguos disponibles' }, { status: 409 })
      }
    }

    const booking = await createBooking({ date, slot, clientName, clientPhone, address, lat, lon, serviceId, persons })

    // Create linked bookings for additional slots
    for (const extraSlot of additionalSlots) {
      await createBooking({
        date,
        slot: extraSlot,
        clientName,
        clientPhone,
        address,
        lat,
        lon,
        serviceId,
        persons: 0,
        linkedTo: booking.id,
      })
    }

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
