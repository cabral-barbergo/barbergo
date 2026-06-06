import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')

// Lucide Scissors path data (same as used in BarberGoLogo.tsx)
// SVG viewport 24x24, scaled to fill ~60% of the icon
function makeSvg(size) {
  const padding = size * 0.2
  const iconSize = size * 0.6
  const offset = padding + (iconSize - 24) / 2  // center the 24x24 path in iconSize box
  const scale = iconSize / 24

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a" rx="${size * 0.2}" ry="${size * 0.2}"/>
  <g transform="translate(${size / 2 - (iconSize / 2)}, ${size / 2 - (iconSize / 2)}) scale(${scale})">
    <circle cx="6" cy="6" r="3" stroke="#c8a97e" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke="#c8a97e" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88" stroke="#c8a97e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="14.47" y1="14.48" x2="20" y2="20" stroke="#c8a97e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12" stroke="#c8a97e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`
}

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const svg = Buffer.from(makeSvg(size))
  await sharp(svg)
    .png()
    .toFile(join(outDir, name))
  console.log(`✓ ${name}`)
}
