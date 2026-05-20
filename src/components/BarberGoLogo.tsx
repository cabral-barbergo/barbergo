import { Scissors } from 'lucide-react'

interface BarberGoLogoProps {
  size?: number
  className?: string
}

export default function BarberGoLogo({ size = 24, className }: BarberGoLogoProps) {
  return <Scissors size={size} color="#c8a97e" strokeWidth={1.75} className={className} />
}
