import { describe, it, expect } from 'vitest'
import { normalizeArPhone, toWhatsApp, isValidArMobile } from './phone'

describe('normalizeArPhone', () => {
  it.each([
    ['2324123456', '+5492324123456'],
    ['02324 15 123456', '+5492324123456'],
    ['2324 15 123456', '+5492324123456'],
    ['+54 9 2324 123456', '+5492324123456'],
    ['5492324123456', '+5492324123456'],
    ['54 2324 15 123456', '+5492324123456'],
    ['+54 9 2324 15 123456', '+5492324123456'],
    ['15123456', '+5492324123456'],
    ['011 15 1234 5678', '+5491112345678'],
    ['(011) 1234-5678', '+5491112345678'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeArPhone(input)).toBe(expected)
  })

  it('produces a valid mobile for typical inputs', () => {
    for (const p of ['2324123456', '02324 15 123456', '+54 9 2324 123456']) {
      expect(isValidArMobile(normalizeArPhone(p))).toBe(true)
    }
  })

  it('flags clearly invalid numbers', () => {
    expect(isValidArMobile(normalizeArPhone('1234'))).toBe(false)
  })
})

describe('toWhatsApp', () => {
  it('adds the whatsapp: prefix', () => {
    expect(toWhatsApp('02324 15 123456')).toBe('whatsapp:+5492324123456')
  })
})
