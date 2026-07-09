// Extract a scroll-scrub frame sequence from the ritual whisk clip.
// Dev-only tool — requires ffmpeg: `npm i -D ffmpeg-static` before running.
// Output frames (public/ritual/frame-NNN.webp) are committed; CI never runs this.
//   node scripts/extract-ritual-frames.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'

const SRC = 'source-photos/ritual-whisk.mp4'
const TMP = '.ritual-frames-tmp'
const OUT = 'public/ritual'
const FPS = 8, WIDTH = 1280, QUALITY = 72

mkdirSync(TMP, { recursive: true })
mkdirSync(OUT, { recursive: true })
execFileSync(ffmpegPath, ['-y', '-i', SRC, '-vf', `fps=${FPS},scale=${WIDTH}:-1`, '-q:v', '3', `${TMP}/f-%03d.jpg`], { stdio: 'ignore' })

const frames = readdirSync(TMP).filter((f) => f.endsWith('.jpg')).sort()
let i = 0
for (const f of frames) {
  i++
  const n = String(i).padStart(3, '0')
  await sharp(path.join(TMP, f)).webp({ quality: QUALITY }).toFile(`${OUT}/frame-${n}.webp`)
}
rmSync(TMP, { recursive: true, force: true })
console.log(`extracted ${i} frames -> ${OUT}/frame-001..${String(i).padStart(3, '0')}.webp`)
