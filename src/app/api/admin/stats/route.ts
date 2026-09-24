export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getPrecioCorte } from '@/lib/db/bookings'

type Period = 'week' | 'month'

function toISO(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
}

function getDateRange(period: Period, date: string): { start: string; end: string } {
  const d = new Date(date + 'T12:00:00')
  if (period === 'week') {
    const js = d.getDay()
    const daysFromMon = js === 0 ? 6 : js - 1
    const monday = new Date(d)
    monday.setDate(d.getDate() - daysFromMon)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: toISO(monday), end: toISO(sunday) }
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: toISO(start), end: toISO(end) }
}

function prevPeriodDate(period: Period, date: string): string {
  const d = new Date(date + 'T12:00:00')
  if (period === 'week') {
    d.setDate(d.getDate() - 7)
    return toISO(d)
  }
  return toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

interface PeriodStats {
  revenue: number
  turnos: number
  persons: number
  cancelled: number
  cancellationRate: number
}

async function queryStats(start: string, end: string, precioCorte: number): Promise<PeriodStats> {
  const { data, error } = await supabase
    .from('bookings')
    .select('status, persons')
    .gte('date', start)
    .lte('date', end)
    .in('status', ['confirmed', 'cancelled'])
    .is('linked_to', null)

  if (error) throw error

  const rows = (data ?? []) as { status: string; persons: number | null }[]
  const confirmed = rows.filter((r) => r.status === 'confirmed')
  const cancelled = rows.filter((r) => r.status === 'cancelled').length
  const total = rows.length

  const turnos = confirmed.length
  const persons = confirmed.reduce((sum, r) => sum + (r.persons ?? 1), 0)
  const revenue = precioCorte * persons
  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0

  return { revenue, turnos, persons, cancelled, cancellationRate }
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') as Period | null
  const date = searchParams.get('date')

  if (!period || !['week', 'month'].includes(period)) {
    return NextResponse.json({ error: 'period must be week or month' }, { status: 400 })
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const precioCorte = await getPrecioCorte()
    const range = getDateRange(period, date)
    const prevRange = getDateRange(period, prevPeriodDate(period, date))

    const [current, previous] = await Promise.all([
      queryStats(range.start, range.end, precioCorte),
      queryStats(prevRange.start, prevRange.end, precioCorte),
    ])

    const revenueChange =
      previous.revenue > 0
        ? ((current.revenue - previous.revenue) / previous.revenue) * 100
        : null

    return NextResponse.json({
      period,
      range,
      current: { ...current, revenueChange },
      previous,
    })
  } catch (err) {
    console.error('[admin/stats GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
