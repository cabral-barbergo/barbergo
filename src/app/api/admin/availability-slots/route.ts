import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getAllSlotsForDay, toggleAvailabilitySlot } from '@/lib/db/bookings'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const days = await Promise.all(
      [0, 1, 2, 3, 4].map(async (day) => ({
        dayOfWeek: day,
        dayName: DAY_NAMES[day],
        slots: await getAllSlotsForDay(day),
      }))
    )
    return NextResponse.json(days)
  } catch (err) {
    console.error('[admin/availability-slots GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { dayOfWeek, slot, isActive } = body as { dayOfWeek?: number; slot?: string; isActive?: boolean }

  if (dayOfWeek == null || !slot || isActive == null) {
    return NextResponse.json({ error: 'dayOfWeek, slot, and isActive are required' }, { status: 400 })
  }

  try {
    await toggleAvailabilitySlot(dayOfWeek, slot, isActive)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/availability-slots PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
