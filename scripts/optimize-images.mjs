import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'source-photos'
const OUT = 'public/img'
const jobs = [
  { file: 'logo.jpg', widths: [96] },
  { file: 'post1_festival.jpg', widths: [480, 640] },
  { file: 'post2_menu.jpg', widths: [480, 640] },
  { file: 'post3_latte.jpg', widths: [480, 640] },
  { file: 'post4_fizz.jpg', widths: [480, 640] },
  { file: 'post5_bar.jpg', widths: [480, 640] },
  { file: 'post6_free.jpg', widths: [480, 640] },
]

await mkdir(OUT, { recursive: true })
for (const { file, widths } of jobs) {
  const base = path.parse(file).name
  for (const w of widths) {
    const img = sharp(path.join(SRC, file)).resize({ width: w, withoutEnlargement: true })
    await img.clone().avif({ quality: 55 }).toFile(`${OUT}/${base}-${w}.avif`)
    await img.clone().webp({ quality: 72 }).toFile(`${OUT}/${base}-${w}.webp`)
    await img.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${base}-${w}.jpg`)
    console.log(`${base}-${w} done`)
  }
}
