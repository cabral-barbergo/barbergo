'use client'

import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (link) link.setAttribute('href', '/api/manifest?admin=1')
    return () => {
      if (link) link.setAttribute('href', '/api/manifest')
    }
  }, [])

  return <>{children}</>
}
