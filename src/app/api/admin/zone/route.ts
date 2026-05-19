import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/adminAuth'
import { getServiceZone, updateServiceZone } from '@/lib/db/bookings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const zone = await getServiceZone()
    return NextResponse.json(zone)
  } catch (err) {
    console.error('[admin/zone GET]', err)
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
  const { center, polygon } = body as Record<string, unknown>
  if (
    !Array.isArray(center) || center.length !== 2 ||
    !Array.isArray(polygon) || polygon.length < 3
  ) {
    return NextResponse.json(
      { error: 'center ([lat,lon]) and polygon ([[lat,lon],...] min 3 points) are required' },
      { status: 400 }
    )
  }
  try {
    await updateServiceZone(center as [number, number], polygon as [number, number][])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/zone PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
