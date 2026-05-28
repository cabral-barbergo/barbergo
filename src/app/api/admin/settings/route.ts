export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getBookingWindowDays, setBookingWindowDays, getPrecioCorte, setPrecioCorte } from '@/lib/db/bookings'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const DEFAULT_WINDOW = 5
const DEFAULT_PRECIO = 2500

export async function GET() {
  try {
    const [booking_window_days, precio_corte] = await Promise.all([
      getBookingWindowDays(),
      getPrecioCorte(),
    ])
    return NextResponse.json({ booking_window_days, precio_corte })
  } catch (err) {
    console.error('[admin/settings GET]', err)
    return NextResponse.json({ booking_window_days: DEFAULT_WINDOW, precio_corte: DEFAULT_PRECIO })
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

  const { booking_window_days, precio_corte } = body as {
    booking_window_days?: number
    precio_corte?: number
  }

  try {
    if (booking_window_days !== undefined) {
      if (
        !Number.isInteger(booking_window_days) ||
        booking_window_days < 1 ||
        booking_window_days > 30
      ) {
        return NextResponse.json(
          { error: 'booking_window_days must be an integer between 1 and 30' },
          { status: 400 }
        )
      }

      // Diagnostic: check current state of service_zone row
      const { data: diagData, error: diagError } = await supabase
        .from('service_zone')
        .select('*')
        .eq('name', 'main')
        .single()
      console.error('[settings PATCH] diagnostic service_zone row:', JSON.stringify(diagData, null, 2))
      console.error('[settings PATCH] diagnostic service_zone error:', JSON.stringify(diagError, null, 2))

      await setBookingWindowDays(booking_window_days)
    }

    if (precio_corte !== undefined) {
      if (!Number.isInteger(precio_corte) || precio_corte < 0) {
        return NextResponse.json(
          { error: 'precio_corte must be a non-negative integer' },
          { status: 400 }
        )
      }
      await setPrecioCorte(precio_corte)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const serialized = JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2)
    console.error('[settings PATCH] error:', serialized)
    return NextResponse.json({ error: 'Internal server error', detail: serialized }, { status: 500 })
  }
}
