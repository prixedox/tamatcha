import sharp from 'sharp'
import { mkdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// Canonical brand package (extracted Výstupy.zip) lives OUTSIDE the repo;
// only optimized outputs are committed. Re-run with: npm run assets:brand
const SRC = process.env.BRAND_SRC ?? path.join(process.env.HOME, 'projects/tamatcha-brand/Výstupy')
const FOTO = path.join(SRC, 'FONT/Výstupy/Produktové fotografie/TRANSPARENT')
const LOGO = path.join(SRC, 'Logo/Výstupy/Logo/PNG/TRANSPARENT')
const CLASH = path.join(SRC, 'FONT/Výstupy/Font/Clash Display')
const PLAKAT = path.join(SRC, 'Letak_nabidka_instagram.pdf (1)/Plakat_smer.png')
const MONT = 'node_modules/@fontsource/montserrat/files'

if (!existsSync(SRC)) {
  console.error(`brand source not found: ${SRC} (set BRAND_SRC or extract ~/Downloads/Výstupy.zip)`)
  process.exit(1)
}

// mapping verified against the in-store screens (Obrazovky 1–7)
const DRINKS = [
  ['DSC00227.png', 'fizz'],
  ['DSC00231.png', 'latte-iced'],
  ['DSC00232.png', 'yerba'],
  ['DSC00233.png', 'latte-hot'],
  ['DSC00234.png', 'cloud'],
]

await mkdir('public/brand/drinks', { recursive: true })
await mkdir('public/brand/logo', { recursive: true })
await mkdir('public/fonts', { recursive: true })

for (const [file, name] of DRINKS) {
  for (const w of [480, 880]) {
    const out = `public/brand/drinks/${name}-${w}.webp`
    await sharp(path.join(FOTO, file))
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(out)
    const m = await sharp(out).metadata()
    console.log(`${out} ${m.width}x${m.height}`)
  }
}

await sharp(path.join(LOGO, 'tamatcha_zakladni_logotyp_emerald.png'))
  .resize({ width: 440 }).png().toFile('public/brand/logo/logotype-emerald.png')
await sharp(path.join(LOGO, 'tamatcha_zakladni_logotyp_cream.png'))
  .resize({ width: 440 }).png().toFile('public/brand/logo/logotype-cream.png')
// watermark mask: only the alpha channel matters (used via CSS mask-image)
await sharp(path.join(LOGO, 'tamatcha_piktogram_emerald.png'))
  .resize({ width: 1200 }).png().toFile('public/brand/logo/piktogram-mask.png')
for (const s of [128, 180]) {
  await sharp(path.join(LOGO, 'tamatcha_piktogram_emerald.png'))
    .resize({ width: s, height: s, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: '#F3F0ED' })
    .png().toFile(`public/brand/logo/favicon-${s}.png`)
}
for (const f of ['logotype-emerald', 'logotype-cream']) {
  const m = await sharp(`public/brand/logo/${f}.png`).metadata()
  console.log(`${f} ${m.width}x${m.height}`)
}

await sharp(PLAKAT)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile('public/brand/og.jpg')

await copyFile(path.join(CLASH, 'Font/WEB/ClashDisplay-Medium.woff2'), 'public/fonts/ClashDisplay-Medium.woff2')
await copyFile(path.join(CLASH, 'Font/WEB/ClashDisplay-Semibold.woff2'), 'public/fonts/ClashDisplay-Semibold.woff2')
await copyFile(path.join(CLASH, 'Licence/FFL.txt'), 'public/fonts/LICENSE-clash-display.txt')
for (const subset of ['latin', 'latin-ext']) {
  for (const w of [400, 500, 700]) {
    await copyFile(`${MONT}/montserrat-${subset}-${w}-normal.woff2`,
      `public/fonts/montserrat-${subset}-${w}-normal.woff2`)
  }
}
await copyFile('node_modules/@fontsource/montserrat/LICENSE', 'public/fonts/LICENSE-montserrat.txt')
console.log('fonts + licenses copied')
