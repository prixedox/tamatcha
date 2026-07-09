import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, rmSync, readdirSync } from 'node:fs'
const SC = '/tmp/claude-1000/-home-martin-projects-tamatcha/76f1450b-16fd-4142-83e0-83b82fb8c091/scratchpad'
const OUT = `${SC}/r3d/frames`
const N = parseInt(process.env.FRAMES || '60')
const WIDTH = 720
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 1200, height: 1450 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 160)))
await p.goto('http://localhost:8099/render.html')
const ok = await p.waitForFunction(() => window.__ready === true, { timeout: 25000 }).then(() => true).catch(() => false)
console.log('ready:', ok)
await p.waitForTimeout(500)
for (let i = 0; i < N; i++) {
  const deg = (i * 360) / N
  await p.evaluate((d) => window.renderFrame(d), deg)
  await p.waitForTimeout(90)
  const png = await p.locator('canvas').screenshot({ omitBackground: true })
  const n = String(i + 1).padStart(3, '0')
  await sharp(png).resize(WIDTH, null, { fit: 'inside' }).webp({ quality: 70, alphaQuality: 88, effort: 5 }).toFile(`${OUT}/frame-${n}.webp`)
}
await b.close()
let total = 0
for (const f of readdirSync(OUT)) total += (await sharp(`${OUT}/${f}`).metadata()).size || 0
console.log('wrote', N, 'transparent webp frames to', OUT, '(~' + Math.round(total / 1024) + 'KB total)')
