function toLocalISO(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
}

export function getAvailableBookingDates(windowDays: number, blockedDates: string[], inactiveDays: number[] = []): string[] {
  const blocked = new Set(blockedDates)
  const inactive = new Set(inactiveDays)
  const result: string[] = []
  const d = new Date()
  while (result.length < windowDays) {
    d.setDate(d.getDate() + 1)
    const jsDay = d.getDay()
    if (jsDay === 0) continue
    const appDay = jsDay === 0 ? 6 : jsDay - 1
    if (inactive.has(appDay)) continue
    const iso = toLocalISO(d)
    if (blocked.has(iso)) continue
    result.push(iso)
  }
  return result
}
