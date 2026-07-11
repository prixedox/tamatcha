import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, rmSync, readdirSync, existsSync, createReadStream, statSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'

const HERE = dirname(fileURLToPath(import.meta.url))
const DRINK = process.env.DRINK || '' // '' = default matcha look; latte|fizz|cloud|mate
const OUT = join(HERE, '.out', DRINK ? `frames-${DRINK}` : 'frames')
const SNAP = process.env.SNAP ? parseFloat(process.env.SNAP) : null
const N = SNAP !== null ? 1 : parseInt(process.env.FRAMES || '44')
const WIDTH = 900

const hdr = join(HERE, 'assets', 'studio_small_08_1k.hdr')
if (!existsSync(hdr)) {
  console.error('Missing HDRI. Run:\n  curl -sL -o ' + hdr +
    ' https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
if (SNAP === null) for (const f of readdirSync(OUT)) rmSync(join(OUT, f))

// three's FileLoader fetch()es assets, and fetch rejects file:// URLs — so
// serve this dir over localhost instead of loading render.html from disk.
const server = createServer((req, res) => {
  const path = normalize(join(HERE, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!path.startsWith(HERE) || !existsSync(path)) { res.writeHead(404); res.end(); return }
  res.writeHead(200)
  createReadStream(path).pipe(res)
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const port = server.address().port

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 1200, height: 1450 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })
await p.goto(`http://127.0.0.1:${port}/render.html${DRINK ? `?drink=${DRINK}` : ''}`)
const ok = await p.waitForFunction(() => window.__ready === true, { timeout: 60000 }).then(() => true).catch(() => false)
console.log('ready:', ok)
if (!ok) { await b.close(); process.exit(1) }
await p.waitForTimeout(500)

for (let i = 0; i < N; i++) {
  const prog = SNAP !== null ? SNAP : (N > 1 ? i / (N - 1) : 0) // scroll progress 0..1: fill then rotate
  await p.evaluate((d) => window.renderFrame(d), prog)
  await p.waitForTimeout(90)
  const png = await p.locator('canvas').screenshot({ omitBackground: true })
  const file = SNAP !== null ? join(HERE, '.out', DRINK ? `snap-${DRINK}.webp` : 'snap.webp') : join(OUT, `frame-${String(i + 1).padStart(3, '0')}.webp`)
  await sharp(png).resize(WIDTH, null, { fit: 'inside' }).webp({ quality: 70, alphaQuality: 88, effort: 5 }).toFile(file)
  if (SNAP !== null) console.log('snap @', prog, '->', file)
}
await b.close()
server.close()
if (SNAP === null) {
  let total = 0
  for (const f of readdirSync(OUT)) total += statSync(join(OUT, f)).size
  console.log('wrote', N, 'frames to', OUT, '(~' + Math.round(total / 1024) + 'KB total)')
}
