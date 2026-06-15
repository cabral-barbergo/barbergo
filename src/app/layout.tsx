import type { Metadata, Viewport } from 'next'
import { Syne, Inter } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Seba Cabral',
  description: 'Reservá tu turno de peluquería a domicilio',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  other: {
    'facebook-domain-verification': 'kqn11it6z28xb5brz5oum6eq0f1pkg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${syne.variable} ${inter.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased">
        {children}
        <footer style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', padding: '0.5rem' }}>
          Seba Cabral Peluqueria Itinerante · Calle 36 154, Mercedes, Buenos Aires · +54 9 2324 505612
        </footer>
      </body>
    </html>
  )
}
