import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabase'

const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .order('day_of_week')
    if (error) throw error

    // Build a 7-slot array (0=Mon … 6=Sun), filling gaps with defaults
    const byDay = Object.fromEntries((data ?? []).map((r: AvRow) => [r.day_of_week, r]))

    const rows = Array.from({ length: 7 }, (_, i) => {
      const r = byDay[i]
      return {
        id:         r?.id         ?? null,
        dayOfWeek:  i,
        dayName:    DAYS[i],
        startTime:  r?.start_time ?? '09:00',
        endTime:    r?.end_time   ?? '18:00',
        isActive:   r?.is_active  ?? false,
      }
    })

    return NextResponse.json(rows)
  } catch (err) {
    console.error('[admin/availability GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let items: AvInput[]
  try { items = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await Promise.all(
      items.map((item) =>
        item.id
          ? supabase
              .from('availability')
              .update({ start_time: item.startTime, end_time: item.endTime, is_active: item.isActive })
              .eq('id', item.id)
          : supabase
              .from('availability')
              .insert({ day_of_week: item.dayOfWeek, start_time: item.startTime, end_time: item.endTime, is_active: item.isActive })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/availability PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface AvRow  { id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean }
interface AvInput { id?: string | null; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }
