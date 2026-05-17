export function generateSlots(startTime: string, endTime: string): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const end = eh * 60 + em
  const slots: string[] = []

  for (let mins = sh * 60 + sm; mins < end; mins += 30) {
    slots.push(
      `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    )
  }

  return slots
}

// Converts JS Date.getDay() (0=Sun) to app day_of_week (0=Mon)
export function jsToAppDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}
