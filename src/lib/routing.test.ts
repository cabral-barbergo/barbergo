import { describe, it, expect } from 'vitest'
import {
  haversine,
  distanceToSegment,
  optimizeRoute,
  routeTotalDistance,
  canJoinDay,
  getAvailableSlotsForDay,
} from './routing'
import type { Booking } from './types'

function makeBooking(id: string, lat: number, lon: number, slot = '09:00'): Booking {
  return {
    id,
    token: id,
    date: '2026-05-17',
    slot,
    clientName: 'Test',
    clientPhone: '1111',
    address: 'Test',
    lat,
    lon,
    serviceId: 'corte',
    status: 'confirmed',
  }
}

// Approximate coords in Buenos Aires area
// Palermo: -34.5850, -58.4300
// Recoleta: -34.5880, -58.3930
// Belgrano: -34.5620, -58.4550
// San Telmo: -34.6210, -58.3700  (far south-east)
// Villa Devoto: -34.6000, -58.5200 (far west)

const palermo = makeBooking('p', -34.585, -58.43)
const recoleta = makeBooking('r', -34.588, -58.393)
const belgrano = makeBooking('b', -34.562, -58.455)
const sanTelmo = makeBooking('st', -34.621, -58.37)    // outside corridor

describe('haversine', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversine(-34.585, -58.43, -34.585, -58.43)).toBe(0)
  })

  it('returns ~111 km per degree latitude', () => {
    const d = haversine(0, 0, 1, 0)
    expect(d).toBeCloseTo(111.19, 0)
  })

  it('is symmetric', () => {
    const d1 = haversine(-34.585, -58.43, -34.588, -58.393)
    const d2 = haversine(-34.588, -58.393, -34.585, -58.43)
    expect(d1).toBeCloseTo(d2, 6)
  })
})

describe('distanceToSegment', () => {
  it('returns distance to nearest endpoint when projection falls outside segment', () => {
    // Point is before A on the line, so closest point is A
    const point = { lat: 0, lon: -1 }
    const a = { lat: 0, lon: 0 }
    const b = { lat: 0, lon: 1 }
    const dToA = haversine(0, -1, 0, 0)
    expect(distanceToSegment(point, a, b)).toBeCloseTo(dToA, 4)
  })

  it('returns 0 when point is on the segment', () => {
    const point = { lat: 0, lon: 0.5 }
    const a = { lat: 0, lon: 0 }
    const b = { lat: 0, lon: 1 }
    expect(distanceToSegment(point, a, b)).toBeCloseTo(0, 4)
  })

  it('returns distance to degenerate segment (point)', () => {
    const p = { lat: -34.585, lon: -58.43 }
    const a = { lat: -34.588, lon: -58.393 }
    const expected = haversine(p.lat, p.lon, a.lat, a.lon)
    expect(distanceToSegment(p, a, a)).toBeCloseTo(expected, 4)
  })
})

describe('optimizeRoute', () => {
  it('returns same single booking', () => {
    const result = optimizeRoute([palermo])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p')
  })

  it('does not change empty array', () => {
    expect(optimizeRoute([])).toHaveLength(0)
  })

  it('returns a valid permutation of the input bookings', () => {
    const input = [palermo, sanTelmo, recoleta, belgrano]
    const optimized = optimizeRoute(input)
    expect(optimized).toHaveLength(input.length)
    expect(optimized.map((b) => b.id).sort()).toEqual(input.map((b) => b.id).sort())
  })
})

describe('routeTotalDistance', () => {
  it('returns 0 for a single booking', () => {
    expect(routeTotalDistance([palermo])).toBe(0)
  })

  it('returns 0 for empty list', () => {
    expect(routeTotalDistance([])).toBe(0)
  })

  it('returns positive distance for two bookings', () => {
    expect(routeTotalDistance([palermo, recoleta])).toBeGreaterThan(0)
  })
})

describe('canJoinDay', () => {
  it('always ok when day is empty', () => {
    expect(canJoinDay([], -34.585, -58.43)).toEqual({ ok: true })
  })

  it('always ok when day has 1 booking', () => {
    expect(canJoinDay([palermo], -34.621, -58.37)).toEqual({ ok: true })
  })

  it('ok for client inside the corridor (close to route segment)', () => {
    // Palermo → Recoleta route; a point slightly off the midpoint should be within 3 km
    const midLat = (palermo.lat + recoleta.lat) / 2
    const midLon = (palermo.lon + recoleta.lon) / 2
    // Offset by ~0.005 degrees (~500m) perpendicular
    const result = canJoinDay([palermo, recoleta], midLat + 0.005, midLon)
    expect(result.ok).toBe(true)
  })

  it('rejects client far outside the corridor', () => {
    // San Telmo is far south-east of the Palermo–Belgrano route
    const result = canJoinDay([palermo, belgrano], sanTelmo.lat, sanTelmo.lon)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('corridor')
  })

  it('rejects client that causes excessive detour even if corridor check could pass alone', () => {
    // Construct a scenario where the new point is geometrically close to the route
    // but forces a big detour because of route topology.
    // Use palermo → recoleta (short route). Add villa devoto (far west) which
    // is > 40% more distance.
    const baseDistance = routeTotalDistance([palermo, recoleta])
    const extended = routeTotalDistance([
      palermo,
      recoleta,
      makeBooking('vd2', -34.6, -58.52),
    ])
    // Verify the detour actually exceeds 40% (sanity check for the test setup)
    expect(extended).toBeGreaterThan(baseDistance * 1.4)

    const result = canJoinDay([palermo, recoleta], -34.6, -58.52)
    // Should fail (corridor or detour)
    expect(result.ok).toBe(false)
  })
})

describe('getAvailableSlotsForDay', () => {
  const allSlots = ['09:00', '10:00', '11:00', '12:00']

  it('all slots available on empty day', () => {
    const slots = getAvailableSlotsForDay([], '2026-05-17', palermo.lat, palermo.lon, allSlots)
    expect(slots.every((s) => s.status === 'available')).toBe(true)
  })

  it('marks taken slot correctly', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '09:00')
    const slots = getAvailableSlotsForDay(
      [booking],
      '2026-05-17',
      palermo.lat,
      palermo.lon,
      allSlots
    )
    const nine = slots.find((s) => s.slot === '09:00')!
    expect(nine.status).toBe('taken')
    expect(slots.filter((s) => s.status === 'available')).toHaveLength(3)
  })

  it('blocks all free slots when canJoinDay fails', () => {
    // Two existing bookings on different slots; new client far outside corridor
    const b1 = makeBooking('x1', palermo.lat, palermo.lon, '09:00')
    const b2 = makeBooking('x2', belgrano.lat, belgrano.lon, '10:00')
    const slots = getAvailableSlotsForDay(
      [b1, b2],
      '2026-05-17',
      sanTelmo.lat,
      sanTelmo.lon,
      allSlots
    )
    // Taken slots keep their status; all remaining (free) slots must be blocked
    const freeSlots = slots.filter((s) => s.status !== 'taken')
    expect(freeSlots.every((s) => s.status === 'blocked')).toBe(true)
    expect(freeSlots.length).toBeGreaterThan(0)
  })

  it('ignores bookings from other dates', () => {
    const otherDay = { ...palermo, date: '2026-05-18', slot: '09:00', id: 'od' }
    const slots = getAvailableSlotsForDay(
      [otherDay],
      '2026-05-17',
      palermo.lat,
      palermo.lon,
      allSlots
    )
    expect(slots.every((s) => s.status === 'available')).toBe(true)
  })

  it('ignores cancelled bookings when evaluating canJoinDay', () => {
    const cancelled = { ...palermo, status: 'cancelled' as const, id: 'c1' }
    const cancelled2 = { ...recoleta, status: 'cancelled' as const, id: 'c2' }
    // With 2 cancelled bookings, effective count is 0 → always ok
    const slots = getAvailableSlotsForDay(
      [cancelled, cancelled2],
      '2026-05-17',
      sanTelmo.lat,
      sanTelmo.lon,
      allSlots
    )
    expect(slots.every((s) => s.status === 'available')).toBe(true)
  })
})
