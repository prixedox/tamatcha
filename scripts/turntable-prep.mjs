// Usage: npm run turntable -- <fizz|latte-iced|latte-hot|cloud|yerba> <video-file>
// Converts an AI-generated turntable clip into scroll-scrub frames + manifest.
// Requires ffmpeg-static (dev-only, not installed by default): npm i -D ffmpeg-static
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const DRINKS = ['fizz', 'latte-iced', 'latte-hot', 'cloud', 'yerba']
const FRAMES = 48

const [drink, video] = process.argv.slice(2)
if (!DRINKS.includes(drink) || !video) {
  console.error('usage: npm run turntable -- <fizz|latte-iced|latte-hot|cloud|yerba> <video-file>')
  process.exit(1)
}

let ffmpeg
try {
  ffmpeg = (await import('ffmpeg-static')).default
} catch {
  console.error('ffmpeg-static is not installed (dev-only dep). Run: npm i -D ffmpeg-static')
  process.exit(1)
}
const sharp = (await import('sharp')).default

const out = `public/brand/turntable/${drink}`
const tmp = '.turntable-tmp'
await rm(tmp, { recursive: true, force: true })
await mkdir(tmp, { recursive: true })
await mkdir(out, { recursive: true })

try {
  // extract every frame at 640px wide, then sample FRAMES evenly
  await run(ffmpeg, ['-y', '-i', video, '-vf', 'scale=640:-2', path.join(tmp, 'all-%04d.png')])
  const all = (await readdir(tmp)).filter((f) => f.endsWith('.png')).sort()
  if (all.length < FRAMES) {
    throw new Error(`only ${all.length} frames extracted — clip too short?`)
  }

  let width = 0
  let height = 0
  for (let i = 0; i < FRAMES; i++) {
    const src = path.join(tmp, all[Math.floor((i * all.length) / FRAMES)])
    const info = await sharp(src)
      .webp({ quality: 82 })
      .toFile(path.join(out, `frame-${String(i + 1).padStart(3, '0')}.webp`))
    width = info.width
    height = info.height
  }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ frames: FRAMES, width, height }) + '\n')
  console.log(`${out}: ${FRAMES} frames ${width}x${height} + manifest.json`)
} finally {
  await rm(tmp, { recursive: true, force: true })
}
