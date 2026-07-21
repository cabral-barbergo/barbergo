import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth || auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    // Find old primary bookings (persons > 0 or persons is null = single booking)
    const { data: oldBookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('id')
      .lt('date', cutoffStr)
    if (fetchErr) throw fetchErr

    const oldIds = (oldBookings ?? []).map((r: { id: string }) => r.id)

    let deleted = 0

    if (oldIds.length > 0) {
      // Find slave bookings linked to those old primaries (to avoid orphans)
      const { data: linkedBookings, error: linkedErr } = await supabase
        .from('bookings')
        .select('id')
        .in('linked_to', oldIds)
      if (linkedErr) throw linkedErr

      const linkedIds = (linkedBookings ?? []).map((r: { id: string }) => r.id)
      const allIds = [...new Set([...oldIds, ...linkedIds])]

      const { error: deleteErr, count } = await supabase
        .from('bookings')
        .delete({ count: 'exact' })
        .in('id', allIds)
      if (deleteErr) throw deleteErr

      deleted = count ?? allIds.length
    }

    // Lightweight read to register activity even when nothing is deleted
    await supabase.from('bookings').select('id', { count: 'exact', head: true })

    console.log(`[cron/cleanup] deleted=${deleted} cutoff=${cutoffStr}`)

    return NextResponse.json({
      success: true,
      deleted,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/cleanup] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
