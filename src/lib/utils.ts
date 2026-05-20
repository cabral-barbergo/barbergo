export function getAvailableBookingDates(windowDays: number, blockedDates: string[]): string[] {
  const blocked = new Set(blockedDates)
  const result: string[] = []
  const d = new Date()
  while (result.length < windowDays) {
    d.setDate(d.getDate() + 1)
    const jsDay = d.getDay()
    if (jsDay === 0 || jsDay === 6) continue
    const iso = d.toISOString().split('T')[0]
    if (blocked.has(iso)) continue
    result.push(iso)
  }
  return result
}
