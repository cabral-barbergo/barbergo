export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isAdminAuthorized, csrfCheck } from '@/lib/adminAuth'
import { getBookingWindowDays, setBookingWindowDays, getPrecioCorte, setPrecioCorte } from '@/lib/db/bookings'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const DEFAULT_WINDOW = 5
const DEFAULT_PRECIO = 2500
const DAY_ACTIVE_KEYS = [0, 1, 2, 3, 4, 5].map((n) => `day_active_${n}`)

type SettingsRow = { key: string; value: string }

export async function GET() {
  try {
    const [booking_window_days, precio_corte, { data: activeRows }] = await Promise.all([
      getBookingWindowDays(),
      getPrecioCorte(),
      supabase.from('settings').select('key, value').in('key', DAY_ACTIVE_KEYS),
    ])

    const dayActive: Record<string, boolean> = {}
    for (const key of DAY_ACTIVE_KEYS) {
      const row = (activeRows as SettingsRow[] | null ?? []).find((r) => r.key === key)
      dayActive[key] = row ? row.value !== 'false' : true
    }

    return NextResponse.json({ booking_window_days, precio_corte, ...dayActive })
  } catch (err) {
    console.error('[admin/settings GET]', err)
    const fallback: Record<string, boolean> = {}
    for (const key of DAY_ACTIVE_KEYS) fallback[key] = true
    return NextResponse.json({ booking_window_days: DEFAULT_WINDOW, precio_corte: DEFAULT_PRECIO, ...fallback })
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

  const { booking_window_days, precio_corte, ...rest } = body as {
    booking_window_days?: number
    precio_corte?: number
    [key: string]: unknown
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

    // Handle day_active_N keys
    for (let n = 0; n <= 5; n++) {
      const key = `day_active_${n}`
      if (key in rest) {
        const val = rest[key]
        if (typeof val !== 'boolean') {
          return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 })
        }
        const { error } = await supabase
          .from('settings')
          .upsert({ key, value: String(val) }, { onConflict: 'key' })
        if (error) throw error
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const serialized = JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2)
    console.error('[settings PATCH] error:', serialized)
    return NextResponse.json({ error: 'Internal server error', detail: serialized }, { status: 500 })
  }
}
