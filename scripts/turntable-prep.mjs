// Usage: npm run turntable -- <drink> <video> [--from <sec>] [--to <sec>]
// Converts an AI-generated turntable clip into scroll-scrub frames + manifest:
// extracts the selected time window (use --from/--to to keep a single-direction
// rotation span), tight-crops to the drink's union bounding box, and removes
// the white background via edge-connected flood fill (interior whites like ice
// and foam survive). Output: transparent webp cutouts, like the product photos.
// Requires ffmpeg-static (dev-only, not installed by default): npm i -D ffmpeg-static
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const DRINKS = ['fizz', 'latte-iced', 'latte-hot', 'cloud', 'yerba']
const FRAMES = 48
const WIDTH = 640 // extraction width
const PAD = 0.04 // crop padding around the drink's bounding box
const BG_LUMA = 238 // background = luminance >= this ...
const BG_CHROMA = 16 // ... with channel spread <= this

const args = process.argv.slice(2)
const flags = {}
const pos = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from' || args[i] === '--to') flags[args[i].slice(2)] = Number(args[++i])
  else pos.push(args[i])
}
const [drink, video] = pos
if (!DRINKS.includes(drink) || !video) {
  console.error('usage: npm run turntable -- <fizz|latte-iced|latte-hot|cloud|yerba> <video-file> [--from <sec>] [--to <sec>]')
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

const isBg = (r, g, b) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return 0.299 * r + 0.587 * g + 0.114 * b >= BG_LUMA && max - min <= BG_CHROMA
}

try {
  // extract the selected window at WIDTH (seek after -i = frame-accurate)
  const seek = []
  if (flags.from != null) seek.push('-ss', String(flags.from))
  if (flags.to != null) seek.push('-to', String(flags.to))
  await run(ffmpeg, ['-y', '-i', video, ...seek, '-vf', `scale=${WIDTH}:-2`, path.join(tmp, 'all-%04d.png')])
  const all = (await readdir(tmp)).filter((f) => f.endsWith('.png')).sort()
  if (all.length < FRAMES) {
    throw new Error(`only ${all.length} frames extracted — window too short?`)
  }
  const picked = Array.from({ length: FRAMES }, (_, i) => path.join(tmp, all[Math.floor((i * all.length) / FRAMES)]))

  // pass 1: union bounding box of non-background pixels (sampled frames), so
  // every frame gets the SAME crop and the drink doesn't jitter while scrubbing
  let bx0 = Infinity
  let by0 = Infinity
  let bx1 = -1
  let by1 = -1
  let W = 0
  let H = 0
  for (let i = 0; i < picked.length; i += 6) {
    const { data, info } = await sharp(picked[i]).raw().toBuffer({ resolveWithObject: true })
    W = info.width
    H = info.height
    const ch = info.channels
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = (y * W + x) * ch
        if (!isBg(data[p], data[p + 1], data[p + 2])) {
          if (x < bx0) bx0 = x
          if (x > bx1) bx1 = x
          if (y < by0) by0 = y
          if (y > by1) by1 = y
        }
      }
    }
  }
  if (bx1 < 0) throw new Error('no non-background content found — wrong BG thresholds?')
  const padX = Math.round((bx1 - bx0) * PAD)
  const padY = Math.round((by1 - by0) * PAD)
  const crop = { left: Math.max(0, bx0 - padX), top: Math.max(0, by0 - padY) }
  crop.width = Math.min(W, bx1 + padX + 1) - crop.left
  crop.height = Math.min(H, by1 + padY + 1) - crop.top
  crop.width -= crop.width % 2
  crop.height -= crop.height % 2

  // pass 2: crop, remove edge-connected background, soften the cutout edge
  for (let i = 0; i < FRAMES; i++) {
    const { data, info } = await sharp(picked[i]).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width: w, height: h } = info
    const visited = new Uint8Array(w * h)
    const stack = []
    const push = (x, y) => {
      const idx = y * w + x
      if (visited[idx]) return
      const p = idx * 4
      if (isBg(data[p], data[p + 1], data[p + 2])) {
        visited[idx] = 1
        stack.push(idx)
      }
    }
    for (let x = 0; x < w; x++) {
      push(x, 0)
      push(x, h - 1)
    }
    for (let y = 0; y < h; y++) {
      push(0, y)
      push(w - 1, y)
    }
    while (stack.length) {
      const idx = stack.pop()
      const x = idx % w
      const y = (idx / w) | 0
      if (x > 0) push(x - 1, y)
      if (x < w - 1) push(x + 1, y)
      if (y > 0) push(x, y - 1)
      if (y < h - 1) push(x, y + 1)
    }
    for (let idx = 0; idx < w * h; idx++) if (visited[idx]) data[idx * 4 + 3] = 0
    // soften: content pixels touching removed background go semi-transparent
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        if (visited[idx]) continue
        const nearBg =
          (x > 0 && visited[idx - 1]) ||
          (x < w - 1 && visited[idx + 1]) ||
          (y > 0 && visited[idx - w]) ||
          (y < h - 1 && visited[idx + w])
        if (nearBg) data[idx * 4 + 3] = 140
      }
    }
    await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(path.join(out, `frame-${String(i + 1).padStart(3, '0')}.webp`))
  }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ frames: FRAMES, width: crop.width, height: crop.height }) + '\n')
  console.log(`${out}: ${FRAMES} frames ${crop.width}x${crop.height} + manifest.json`)
} finally {
  await rm(tmp, { recursive: true, force: true })
}
