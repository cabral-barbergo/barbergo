import { NextResponse } from 'next/server'
import { isAdminAuthorized, csrfCheck } from '@/lib/adminAuth'
import { getAllSlotsForDay, toggleAvailabilitySlot, applySlotRange } from '@/lib/db/bookings'

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

  const raw = body as Record<string, unknown>

  // Range mode: apply a time range to a day
  if ('startTime' in raw || 'endTime' in raw) {
    const { dayOfWeek, startTime, endTime } = raw as { dayOfWeek?: number; startTime?: string; endTime?: string }
    if (dayOfWeek == null || !startTime || !endTime) {
      return NextResponse.json({ error: 'dayOfWeek, startTime, and endTime are required' }, { status: 400 })
    }
    try {
      await applySlotRange(dayOfWeek, startTime, endTime)
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('[admin/availability-slots PATCH range]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // Toggle mode: flip a single slot
  const { dayOfWeek, slot, isActive } = raw as { dayOfWeek?: number; slot?: string; isActive?: boolean }
  if (dayOfWeek == null || !slot || isActive == null) {
    return NextResponse.json({ error: 'dayOfWeek, slot, and isActive are required' }, { status: 400 })
  }
  try {
    await toggleAvailabilitySlot(dayOfWeek, slot, isActive)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/availability-slots PATCH toggle]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
