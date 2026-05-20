export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getBookingWindowDays, setBookingWindowDays } from '@/lib/db/bookings'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const DEFAULT_WINDOW = 5

export async function GET() {
  try {
    const value = await getBookingWindowDays()
    return NextResponse.json({ booking_window_days: value })
  } catch (err) {
    console.error('[admin/settings GET]', err)
    return NextResponse.json({ booking_window_days: DEFAULT_WINDOW })
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

  const { booking_window_days } = body as { booking_window_days?: number }

  if (
    booking_window_days == null ||
    !Number.isInteger(booking_window_days) ||
    booking_window_days < 1 ||
    booking_window_days > 30
  ) {
    return NextResponse.json({ error: 'booking_window_days must be an integer between 1 and 30' }, { status: 400 })
  }

  // Diagnostic: check current state of service_zone row
  const { data: diagData, error: diagError } = await supabase
    .from('service_zone')
    .select('*')
    .eq('name', 'main')
    .single()
  console.error('[settings PATCH] diagnostic service_zone row:', JSON.stringify(diagData, null, 2))
  console.error('[settings PATCH] diagnostic service_zone error:', JSON.stringify(diagError, null, 2))

  try {
    await setBookingWindowDays(booking_window_days)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const serialized = JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2)
    console.error('[settings PATCH] setBookingWindowDays threw:', serialized)
    return NextResponse.json({ error: 'Internal server error', detail: serialized }, { status: 500 })
  }
}
