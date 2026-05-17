import type { Service } from './types'

export const SERVICES: Service[] = [
  { id: 'corte',        label: 'Corte de cabello', duration: 30, price: 3500, icon: '✂️' },
  { id: 'barba',        label: 'Arreglo de barba', duration: 20, price: 2500, icon: '🪒' },
  { id: 'corte-barba',  label: 'Corte + Barba',    duration: 50, price: 5500, icon: '💈' },
  { id: 'degradado',    label: 'Degradado',         duration: 40, price: 4500, icon: '⚡' },
]
