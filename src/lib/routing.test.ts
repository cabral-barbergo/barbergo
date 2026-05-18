import { describe, it, expect } from 'vitest'
import {
  haversine,
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


describe('optimizeRoute', () => {
  it('returns same single booking', () => {
    const result = optimizeRoute([palermo])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p')
  })

  it('does not change empty array', () => {
    expect(optimizeRoute([])).toHaveLength(0)
  })

  it('sorts bookings by slot ascending', () => {
    const a = makeBooking('a', -34.585, -58.43, '12:00')
    const b = makeBooking('b', -34.588, -58.393, '09:00')
    const c = makeBooking('c', -34.562, -58.455, '10:30')
    const result = optimizeRoute([a, b, c])
    expect(result.map((x) => x.slot)).toEqual(['09:00', '10:30', '12:00'])
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
  // palermo: -34.585, -58.43
  // A point ~300m away from palermo
  const nearPalermo = { lat: -34.5875, lon: -58.43 }
  // A point ~5km away from palermo (Recoleta is ~3km, Belgrano ~7km)
  const farFromAll = { lat: -34.62, lon: -58.37 } // san telmo area

  it('ok when day is empty', () => {
    expect(canJoinDay([], nearPalermo.lat, nearPalermo.lon)).toEqual({ ok: true })
  })

  it('ok when within 600m of an existing booking', () => {
    expect(canJoinDay([palermo], nearPalermo.lat, nearPalermo.lon)).toEqual({ ok: true })
  })

  it('blocked when more than 600m from all existing bookings', () => {
    expect(canJoinDay([palermo], farFromAll.lat, farFromAll.lon)).toEqual({ ok: false })
  })

  it('ok when within 600m of at least one booking among many', () => {
    // farFromAll is near sanTelmo; add a sanTelmo booking so distance passes
    const stBooking = makeBooking('st2', sanTelmo.lat, sanTelmo.lon, '11:00')
    const result = canJoinDay([palermo, stBooking], farFromAll.lat, farFromAll.lon)
    expect(result.ok).toBe(true)
  })
})

describe('getAvailableSlotsForDay', () => {
  const allSlots = ['09:00', '10:00', '11:00', '12:00']

  it('all slots available on empty day', () => {
    const slots = getAvailableSlotsForDay([], '2026-05-17', palermo.lat, palermo.lon, allSlots)
    expect(slots.every((s) => s.status === 'available')).toBe(true)
  })

  it('marks taken slot correctly and only adjacent slot is available', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '09:00')
    // allSlots = ['09:00','10:00','11:00','12:00']
    // booking at index 0 → only index 1 ('10:00') is adjacent
    const slots = getAvailableSlotsForDay(
      [booking],
      '2026-05-17',
      palermo.lat,
      palermo.lon,
      allSlots
    )
    expect(slots.find((s) => s.slot === '09:00')!.status).toBe('taken')
    expect(slots.find((s) => s.slot === '10:00')!.status).toBe('available')
    expect(slots.find((s) => s.slot === '11:00')!.status).toBe('blocked')
    expect(slots.find((s) => s.slot === '12:00')!.status).toBe('blocked')
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

  it('marks slot as taken when booking slot has HH:MM:SS format (raw DB value)', () => {
    const booking = { ...makeBooking('x', palermo.lat, palermo.lon), slot: '10:00:00' }
    const slots = getAvailableSlotsForDay(
      [booking],
      '2026-05-17',
      palermo.lat,
      palermo.lon,
      allSlots
    )
    expect(slots.find((s) => s.slot === '10:00')!.status).toBe('taken')
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
