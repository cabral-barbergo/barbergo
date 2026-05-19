import { describe, it, expect } from 'vitest'
import {
  haversine,
  optimizeRoute,
  routeTotalDistance,
  groupSlotsIntoBlocks,
  findBlockForSlot,
  canJoinBlock,
  getAvailableSlotsForDay,
} from './routing'
import type { Booking } from './types'

function makeBooking(id: string, lat: number, lon: number, slot = '09:00', date = '2026-05-19'): Booking {
  return {
    id,
    token: id,
    date,
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

// Wide zone that contains all test coordinates — keeps existing test behavior unchanged
const ZONE_WIDE = {
  centerLat: -34.6,
  centerLon: -58.4,
  polygon: [[-34.5, -58.5], [-34.5, -58.3], [-34.7, -58.3], [-34.7, -58.5]] as [number, number][],
}

// Buenos Aires area coords
const palermo  = makeBooking('p',  -34.585, -58.430)
const recoleta = makeBooking('r',  -34.588, -58.393)
const sanTelmo  = makeBooking('st', -34.621, -58.370) // ~5 km from palermo

// A point ~300m from palermo
const nearPalermo = { lat: -34.5875, lon: -58.430 }

describe('haversine', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversine(-34.585, -58.43, -34.585, -58.43)).toBe(0)
  })

  it('returns ~111 km per degree latitude', () => {
    expect(haversine(0, 0, 1, 0)).toBeCloseTo(111.19, 0)
  })

  it('is symmetric', () => {
    const d1 = haversine(-34.585, -58.43, -34.588, -58.393)
    const d2 = haversine(-34.588, -58.393, -34.585, -58.43)
    expect(d1).toBeCloseTo(d2, 6)
  })
})

describe('optimizeRoute', () => {
  it('returns same single booking', () => {
    expect(optimizeRoute([palermo])[0].id).toBe('p')
  })

  it('does not change empty array', () => {
    expect(optimizeRoute([])).toHaveLength(0)
  })

  it('sorts bookings by slot ascending', () => {
    const a = makeBooking('a', -34.585, -58.43, '12:00')
    const b = makeBooking('b', -34.588, -58.393, '09:00')
    const c = makeBooking('c', -34.562, -58.455, '10:30')
    expect(optimizeRoute([a, b, c]).map((x) => x.slot)).toEqual(['09:00', '10:30', '12:00'])
  })
})

describe('routeTotalDistance', () => {
  it('returns 0 for empty list', () => {
    expect(routeTotalDistance([])).toBe(0)
  })

  it('returns 0 for single booking', () => {
    expect(routeTotalDistance([palermo])).toBe(0)
  })

  it('returns positive distance for two bookings', () => {
    expect(routeTotalDistance([palermo, recoleta])).toBeGreaterThan(0)
  })
})

describe('groupSlotsIntoBlocks', () => {
  it('returns empty array for empty input', () => {
    expect(groupSlotsIntoBlocks([])).toEqual([])
  })

  it('groups consecutive slots into one block', () => {
    const blocks = groupSlotsIntoBlocks(['08:30', '09:00', '09:30'])
    expect(blocks).toEqual([['08:30', '09:00', '09:30']])
  })

  it('splits non-consecutive slots into separate blocks', () => {
    const blocks = groupSlotsIntoBlocks(['08:30', '09:00', '14:30', '15:00'])
    expect(blocks).toEqual([['08:30', '09:00'], ['14:30', '15:00']])
  })

  it('handles the example from spec', () => {
    const input = ['08:30', '09:00', '09:30', '12:00', '14:30', '15:00']
    const blocks = groupSlotsIntoBlocks(input)
    expect(blocks).toEqual([['08:30', '09:00', '09:30'], ['12:00'], ['14:30', '15:00']])
  })

  it('handles unsorted input', () => {
    const blocks = groupSlotsIntoBlocks(['09:30', '08:30', '09:00'])
    expect(blocks).toEqual([['08:30', '09:00', '09:30']])
  })
})

describe('findBlockForSlot', () => {
  const blocks = [['08:30', '09:00', '09:30'], ['14:30', '15:00']]

  it('finds the correct block', () => {
    expect(findBlockForSlot('09:00', blocks)).toEqual(['08:30', '09:00', '09:30'])
  })

  it('returns null for slot not in any block', () => {
    expect(findBlockForSlot('12:00', blocks)).toBeNull()
  })
})

describe('canJoinBlock', () => {
  const block = ['08:30', '09:00', '09:30', '10:00']

  it('ok when block has no bookings (first in block)', () => {
    expect(canJoinBlock(block, [], '09:00', nearPalermo.lat, nearPalermo.lon)).toEqual({ ok: true })
  })

  it('ok when slot is adjacent to a booking and within 600m', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '09:00')
    // 09:30 is adjacent to 09:00 (idx 1 → idx 2)
    const result = canJoinBlock(block, [booking], '09:30', nearPalermo.lat, nearPalermo.lon)
    expect(result.ok).toBe(true)
  })

  it('blocked when slot is not adjacent to any booking', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '08:30')
    // 10:00 (idx 3) is not adjacent to 08:30 (idx 0)
    const result = canJoinBlock(block, [booking], '10:00', nearPalermo.lat, nearPalermo.lon)
    expect(result).toEqual({ ok: false, reason: 'not_adjacent' })
  })

  it('blocked when adjacent but too far away', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '09:00')
    // sanTelmo is ~5km from palermo
    const result = canJoinBlock(block, [booking], '09:30', sanTelmo.lat, sanTelmo.lon)
    expect(result).toEqual({ ok: false, reason: 'distance' })
  })
})

describe('getAvailableSlotsForDay', () => {
  const DATE = '2026-05-19'
  const activeSlots = ['08:30', '09:00', '09:30', '14:30', '15:00']

  it('returns all active slots when no bookings and no blocks', () => {
    const slots = getAvailableSlotsForDay([], DATE, palermo.lat, palermo.lon, activeSlots, [], ZONE_WIDE)
    expect(slots.map((s) => s.slot)).toEqual(activeSlots)
    expect(slots.every((s) => s.status === 'available')).toBe(true)
  })

  it('excludes blocked slots', () => {
    const slots = getAvailableSlotsForDay([], DATE, palermo.lat, palermo.lon, activeSlots, ['09:00'], ZONE_WIDE)
    expect(slots.map((s) => s.slot)).not.toContain('09:00')
    expect(slots.map((s) => s.slot)).toContain('08:30')
  })

  it('excludes taken slots and only shows adjacent available ones', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '09:00', DATE)
    const slots = getAvailableSlotsForDay([booking], DATE, nearPalermo.lat, nearPalermo.lon, activeSlots, [], ZONE_WIDE)
    const slotNames = slots.map((s) => s.slot)
    // 09:00 is taken → not returned
    expect(slotNames).not.toContain('09:00')
    // 08:30 adjacent to 09:00 (within 600m) → available
    expect(slotNames).toContain('08:30')
    // 09:30 adjacent to 09:00 (within 600m) → available
    expect(slotNames).toContain('09:30')
    // 14:30 and 15:00 are in a separate block with no bookings → available
    expect(slotNames).toContain('14:30')
    expect(slotNames).toContain('15:00')
  })

  it('hides slots too far from existing booking', () => {
    const booking = makeBooking('x', palermo.lat, palermo.lon, '09:00', DATE)
    // sanTelmo is far from palermo → adjacent slots fail distance check
    const slots = getAvailableSlotsForDay([booking], DATE, sanTelmo.lat, sanTelmo.lon, activeSlots, [], ZONE_WIDE)
    const slotNames = slots.map((s) => s.slot)
    // 08:30 and 09:30 are adjacent but too far → not available
    expect(slotNames).not.toContain('08:30')
    expect(slotNames).not.toContain('09:30')
    // 14:30 / 15:00 block is empty → still available
    expect(slotNames).toContain('14:30')
    expect(slotNames).toContain('15:00')
  })

  it('ignores cancelled bookings', () => {
    const cancelled = { ...makeBooking('x', palermo.lat, palermo.lon, '09:00', DATE), status: 'cancelled' as const }
    const slots = getAvailableSlotsForDay([cancelled], DATE, sanTelmo.lat, sanTelmo.lon, activeSlots, [], ZONE_WIDE)
    // Cancelled doesn't count → all active slots available
    expect(slots.map((s) => s.slot)).toEqual(activeSlots)
  })

  it('ignores bookings from other dates', () => {
    const other = makeBooking('x', palermo.lat, palermo.lon, '09:00', '2026-05-20')
    const slots = getAvailableSlotsForDay([other], DATE, palermo.lat, palermo.lon, activeSlots, [], ZONE_WIDE)
    expect(slots.map((s) => s.slot)).toEqual(activeSlots)
  })

  it('normalizes HH:MM:SS slot format from DB', () => {
    const booking = { ...makeBooking('x', palermo.lat, palermo.lon, '09:00:00', DATE) }
    const slots = getAvailableSlotsForDay([booking], DATE, nearPalermo.lat, nearPalermo.lon, activeSlots, [], ZONE_WIDE)
    // 09:00 should be treated as taken
    expect(slots.map((s) => s.slot)).not.toContain('09:00')
  })

  it('returns empty array when no active slots', () => {
    const slots = getAvailableSlotsForDay([], DATE, palermo.lat, palermo.lon, [], [], ZONE_WIDE)
    expect(slots).toEqual([])
  })
})
