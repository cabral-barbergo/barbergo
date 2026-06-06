export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingsByDate, isSlotTaken, createBooking } from '@/lib/db/bookings'
import { optimizeRoute, routeTotalDistance } from '@/lib/routing'
import { isAdminAuthorized, csrfCheck } from '@/lib/adminAuth'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const bookings = await getBookingsByDate(date)
    const route = optimizeRoute(bookings)

    return NextResponse.json({
      bookings: route,
      totalDistanceKm: routeTotalDistance(bookings),
    })
  } catch (err) {
    console.error('[admin/bookings GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const csrf = csrfCheck(request)
  if (csrf) return NextResponse.json({ error: csrf.error }, { status: csrf.status })

  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, slot, clientName, address, lat, lon } = body as {
    date?: string
    slot?: string
    clientName?: string
    address?: string
    lat?: number
    lon?: number
  }

  if (!date || !slot || !clientName) {
    return NextResponse.json({ error: 'date, slot, and clientName are required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const taken = await isSlotTaken(date, slot)
    if (taken) {
      return NextResponse.json({ error: 'Este horario ya está tomado' }, { status: 409 })
    }

    const booking = await createBooking({
      date,
      slot,
      clientName,
      clientPhone: '',
      address: address ?? '',
      lat: lat ?? 0,
      lon: lon ?? 0,
      serviceId: 'manual',
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (err) {
    console.error('[admin/bookings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
