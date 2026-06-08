export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const isAdmin = searchParams.get('admin') === '1'

  const manifest = {
    name: isAdmin ? 'SC Admin' : 'Seba Cabral',
    short_name: isAdmin ? 'SC Admin' : 'Seba Cabral',
    start_url: isAdmin ? '/admin' : '/reservar',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
