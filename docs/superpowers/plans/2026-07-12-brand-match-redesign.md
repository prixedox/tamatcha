# Brand-Match Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Tamatcha one-pager's visual layer to match the official brand package (Výstupy.zip): cream editorial look, Clash Display + Montserrat, official logo, real product photos, screens-version menu.

**Architecture:** Static Vite + vanilla TS one-pager. All WebGL/canvas code is deleted; only Lenis + GSAP scroll reveals remain. Brand assets are generated from the (out-of-repo) brand package by a sharp script into `public/brand/`; only optimized outputs are committed.

**Tech Stack:** Vite 8, TypeScript, Lenis, GSAP ScrollTrigger, sharp (asset pipeline), Playwright (e2e), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-12-brand-match-redesign-design.md`

## Global Constraints

- Language of all site copy: Czech. Use "Kagoshima" spelling (per brand materials), not "Kagošima".
- Menu content is the **screens version**: Fizz `( matcha, soda, pyré dle výběru )`; Cloud `( matcha cloud, mléko, pyré dle výběru )` with Jahoda/Kokos/Borůvka; Latté includes Pistácie (no Kokos); Yerba 79,- Kč, others 119,- Kč, all 450 ml.
- Price format exactly as in materials: `119,- Kč`. Volume: `450 ml`.
- Palette tokens (exact): paper `#F3F0ED`, cream `#E6E2DA`, watermark `#E3DFD7`, emerald `#154230`, coal `#101111`, burgundy `#5D1E21`, gold `#A6824A`.
- Fonts: Clash Display 500/600 (headings), Montserrat 400/500/700 (body). Self-hosted from `public/fonts/`, `font-display: swap`. Licenses ship alongside the fonts.
- No drop shadows under drink cutouts (established preference: shadow-free renders).
- Absolute URLs (`/fonts/...`, `/brand/...`, `/img/...`) are correct in both CSS and HTML — Vite rewrites them with `base` (`/tamatcha/`) at build time (verified against current dist output).
- Site must remain fully readable with JavaScript disabled (reveals hidden only under `html.js`).
- JS budget stays enforced: `npm run check:budgets` (≤120 kB gz) must pass.
- Brand source lives at `~/projects/tamatcha-brand/Výstupy` (extracted from `~/Downloads/Výstupy.zip`); the repo never references it at runtime — only `scripts/brand-assets.mjs` reads it.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Brand asset pipeline (`public/brand/`, `public/fonts/`)

**Files:**
- Create: `scripts/brand-assets.mjs`
- Modify: `package.json` (scripts + devDependency)
- Delete: `scripts/extract-fonts.py`
- Output (committed): `public/brand/drinks/*.webp`, `public/brand/logo/*.png`, `public/brand/og.jpg`, `public/fonts/ClashDisplay-*.woff2`, `public/fonts/montserrat-*.woff2`, `public/fonts/LICENSE-*`

**Interfaces:**
- Produces asset paths consumed by Tasks 2–3 (exact names):
  - `/brand/drinks/{fizz,latte-iced,latte-hot,cloud,yerba}-{480,880}.webp`
  - `/brand/logo/logotype-emerald.png`, `/brand/logo/logotype-cream.png`
  - `/brand/logo/piktogram-mask.png` (alpha mask for CSS watermark)
  - `/brand/logo/favicon-128.png`, `/brand/logo/favicon-180.png`
  - `/brand/og.jpg` (1200×630)
  - `/fonts/ClashDisplay-Medium.woff2`, `/fonts/ClashDisplay-Semibold.woff2`
  - `/fonts/montserrat-{latin,latin-ext}-{400,500,700}-normal.woff2`
- Drink→photo mapping (verified against the Obrazovky screens): DSC00227=fizz, DSC00231=latte-iced, DSC00232=yerba, DSC00233=latte-hot, DSC00234=cloud.

- [ ] **Step 1: Extract the brand package to its permanent home**

```bash
mkdir -p ~/projects/tamatcha-brand
cd ~/projects/tamatcha-brand && unzip -q -o ~/Downloads/Výstupy.zip
ls ~/projects/tamatcha-brand/Výstupy
```

Expected: directories `FONT`, `Logo`, `Obrazovky`, `Basecamp Download`, … If `~/Downloads/Výstupy.zip` is missing, the already-extracted copy exists in the session scratchpad (`…/scratchpad/Výstupy`) — copy that instead.

- [ ] **Step 2: Install Montserrat webfont source**

```bash
cd ~/projects/tamatcha && npm install -D @fontsource/montserrat
ls node_modules/@fontsource/montserrat/files/ | grep -E 'latin(-ext)?-(400|500|700)-normal.woff2'
```

Expected: 6 files (`montserrat-latin-400-normal.woff2`, `…-latin-ext-400-…`, etc.). If names differ, adjust the `MONT` copies in Step 3 to the actual names.

- [ ] **Step 3: Write `scripts/brand-assets.mjs`**

```js
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
```

- [ ] **Step 4: Wire npm script, drop the obsolete font extractor**

In `package.json` scripts, replace `"assets:fonts": "python3 scripts/extract-fonts.py"` with `"assets:brand": "node scripts/brand-assets.mjs"`. Delete the old script:

```bash
git rm scripts/extract-fonts.py
```

- [ ] **Step 5: Run the pipeline and verify outputs**

```bash
npm run assets:brand
ls public/brand/drinks public/brand/logo public/fonts | sort
du -sh public/brand
```

Expected: 10 drink webps, 5 logo pngs, og.jpg, 2 Clash + 6 Montserrat woff2, 2 licenses. `public/brand` total well under 2 MB. **Record the printed `width x height` of every `-880.webp` and both logotypes — Task 2 plugs them into `index.html`.**

- [ ] **Step 6: Sanity-check one output visually**

Read `public/brand/drinks/fizz-480.webp` and `public/brand/og.jpg` with the Read tool. Expected: fizz cutout with transparent background, og shows the poster crop with logo/drinks visible.

- [ ] **Step 7: Existing tests still green (nothing references new files yet)**

```bash
npm run build && npm test
```

Expected: build OK, vitest 2 tests pass (tiers).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: brand asset pipeline — drinks, logos, fonts from Výstupy package

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The Swap — new markup, styles, JS; e2e rewritten (TDD)

This task is intentionally atomic: any DOM change breaks the old visuals/tests, so specs, HTML, CSS and JS swap in one commit. Steps order the work test-first.

**Files:**
- Modify: `e2e/content.spec.ts`, `e2e/menu.spec.ts`, `e2e/nav.spec.ts`, `e2e/scroll.spec.ts`, `e2e/smoke.spec.ts`, `e2e/visual.spec.ts`
- Create: `e2e/lineup.spec.ts`
- Delete: `e2e/hero.spec.ts`, `e2e/ritual.spec.ts`, `e2e/accents.spec.ts`, `e2e/gallery.spec.ts`
- Rewrite: `index.html`, `src/styles/tokens.css`, `src/styles/fonts.css`, `src/styles/base.css`, `src/styles/sections.css`, `src/main.ts`
- Modify: `src/scroll.ts` (drop `.draw`), `package.json` (`--passWithNoTests`)
- Delete: `src/fluid/` (4 files), `src/scenes/` (3 files), `src/tiers.ts`, `src/tiers.test.ts`, `src/debug.d.ts`

**Interfaces:**
- Consumes Task 1 asset paths (see Task 1 Produces list).
- Produces DOM contract used by e2e + scroll.ts: `#nav`, `#burger`, `.nav__links`, `.brand`, `.reveal`/`.in`, `.mcard`, `.mcard__drink`, `.price`, `.formula`, `.lineup__item`, section ids `#o-nas #ritual #menu #galerie #navstiv`, `html.js` class, `nav--scrolled` class.

- [ ] **Step 1: Rewrite `e2e/content.spec.ts` (red first)**

```ts
import { test, expect } from '@playwright/test'

const MUST_HAVE = [
  'Prémiová matcha', 'čerstvě našleháno.', 'První Matcha Bar v Ostravě',
  'Z Kagoshimy',
  'Matcha Fizz', 'Matcha Cloud', 'Iced / Hot Matcha Latté', 'Iced Yerba Maté',
  '( matcha, soda, pyré dle výběru )', 'Pistácie',
  '450 ml', '119,- Kč', '79,- Kč',
  'Prosíváme', 'Šleháme', 'Podáváme',
  'Na Hradbách 1481/6', '+420 605 000 456', 'Drink zdarma?',
  '© 2026 Tamatcha · Ostrava',
]

test('all brand-redesign content present with JS', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('body').innerText()
  for (const s of MUST_HAVE) expect(text, `missing: ${s}`).toContain(s)
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.lineup__item')).toHaveCount(5)
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('page fully readable without JS', async ({ page }) => {
    await page.goto('./')
    const text = await page.locator('body').innerText()
    for (const s of MUST_HAVE) expect(text, `missing: ${s}`).toContain(s)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('.mcard').first()).toBeVisible()
  })
})
```

- [ ] **Step 2: Rewrite `e2e/menu.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('menu: 4 drinks, screens-version prices, real photos load', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.mcard .price')).toHaveText([
    '119,- Kč', '119,- Kč', '119,- Kč', '79,- Kč',
  ])
  // lazy images: bring each into view, then poll until decoded
  for (const img of await page.locator('.mcard__drink').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect(img).toBeVisible()
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }
})

test('menu: screens wording, not flyer wording', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('#menu').innerText()
  expect(text).toContain('( matcha, soda, pyré dle výběru )')
  expect(text).toContain('( matcha cloud, mléko, pyré dle výběru )')
  expect(text).not.toContain('tonic')
  expect(text).not.toContain('kokosová voda')
})
```

- [ ] **Step 3: Create `e2e/lineup.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('lineup shows all five drinks in brand order', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.lineup__item figcaption')).toHaveText([
    'Matcha Fizz', 'Iced Matcha Latté', 'Hot Matcha Latté', 'Matcha Cloud', 'Iced Yerba Maté',
  ])
  for (const img of await page.locator('.lineup__item img').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }
})
```

- [ ] **Step 4: Rewrite `e2e/smoke.spec.ts`** (no more `window.__tamatcha`)

```ts
import { test, expect } from '@playwright/test'

test('site builds and boots', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('html.js')).toHaveCount(1)
  await expect(page.locator('h1')).toBeVisible()
})
```

- [ ] **Step 5: Update `e2e/scroll.spec.ts`** — drop tier param + `data-tier` assertion

```ts
import { test, expect } from '@playwright/test'

test('reveals appear on scroll', async ({ page }) => {
  await page.goto('./')
  const card = page.locator('.mcard').first()
  await expect(card).not.toHaveClass(/\bin\b/)
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveClass(/\bin\b/)
})

test('reduced motion: everything visible immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  const notIn = await page.locator('.reveal:not(.in)').count()
  expect(notIn).toBe(0)
})

test('nav gains scrolled state', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => window.scrollTo(0, 600))
  await expect(page.locator('#nav')).toHaveClass(/nav--scrolled/)
})
```

- [ ] **Step 6: Update `e2e/nav.spec.ts` and `e2e/visual.spec.ts`** — replace every `./?tier=c` with `./` (3× in nav.spec, 1× in visual.spec); everything else stays (the nav-backing tests remain valid on the paper background).

- [ ] **Step 7: Delete obsolete specs**

```bash
git rm e2e/hero.spec.ts e2e/ritual.spec.ts e2e/accents.spec.ts e2e/gallery.spec.ts
```

- [ ] **Step 8: Run e2e to confirm red**

```bash
npm run build && npm run e2e
```

Expected: FAIL — new expectations (`.lineup__item`, `119,- Kč`, screens wording) don't exist yet.

- [ ] **Step 9: Replace `src/styles/tokens.css`**

```css
:root{
  --paper:#F3F0ED;         /* page ground (flyer background) */
  --cream:#E6E2DA;         /* official cream — cards, bands */
  --watermark:#E3DFD7;     /* giant pictogram behind sections */
  --emerald:#154230;       /* headings, logo, primary */
  --emerald-2:#1B5540;     /* hover lift on emerald */
  --coal:#101111;          /* body text */
  --coal-60:rgba(16,17,17,.64);
  --burgundy:#5D1E21;      /* contact band */
  --gold:#A6824A;          /* eyebrows, micro-accents */
  --line:rgba(21,66,48,.14);
  --cream-80:rgba(230,226,218,.8);
  --cream-16:rgba(230,226,218,.16);

  --wrap:1200px;
  --pad:clamp(1.25rem,5vw,3rem);
  --sp-section:clamp(4.5rem,9vw,8rem);
  --r:20px;

  --display:'Clash Display',ui-sans-serif,system-ui,sans-serif;
  --body:'Montserrat',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;

  --ease:cubic-bezier(.22,.61,.36,1);
}
```

- [ ] **Step 10: Replace `src/styles/fonts.css`**

Latin/latin-ext unicode-ranges are the same two range sets already used in the current file (copy them verbatim from git if needed).

```css
@font-face{font-family:'Clash Display';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/ClashDisplay-Medium.woff2') format('woff2')}
@font-face{font-family:'Clash Display';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/ClashDisplay-Semibold.woff2') format('woff2')}
@font-face{font-family:'Montserrat';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/montserrat-latin-ext-400-normal.woff2') format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Montserrat';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/montserrat-latin-400-normal.woff2') format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Montserrat';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/montserrat-latin-ext-500-normal.woff2') format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Montserrat';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/montserrat-latin-500-normal.woff2') format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Montserrat';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/montserrat-latin-ext-700-normal.woff2') format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Montserrat';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/montserrat-latin-700-normal.woff2') format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
```

- [ ] **Step 11: Replace `src/styles/base.css`**

```css
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
/* Lenis (scroll.ts) owns smooth scrolling once JS boots; keep native
   smooth-scroll only for the no-JS fallback (see scroll.ts). */
html.js{scroll-behavior:auto}
body{
  margin:0;
  background:var(--paper);
  color:var(--coal);
  font-family:var(--body);
  font-size:clamp(.98rem,.5vw + .88rem,1.05rem);
  line-height:1.7;
  font-weight:400;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
img{display:block;max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer}
h1,h2,h3,h4,p,ul,figure{margin:0}
ul{padding:0;list-style:none}
::selection{background:var(--emerald);color:var(--cream)}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.skip{position:absolute;left:-999px;top:0;z-index:100;background:var(--emerald);color:var(--cream);padding:.6rem 1rem;border-radius:0 0 var(--r) 0}
.skip:focus{left:0}
```

- [ ] **Step 12: Rewrite `index.html`**

Full new file. **Plug in real `width`/`height`** on every drink `<img>` from the dimensions printed in Task 1 Step 5 (values below marked `W×H-from-task1`; keep the 480-wide numbers for `width`, matching height). Same for the two logotypes (use printed size at display scale — `height` fixed, width proportional).

```html
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tamatcha — první matcha bar v Ostravě</title>
<meta name="description" content="První matcha bar v Ostravě. Prémiová matcha té nejvyšší kvality z prefektury Kagoshima — Matcha Fizz, Cloud, latté i Yerba Maté. Na Hradbách 1481/6, Ostrava-Centrum.">
<meta property="og:type" content="website">
<meta property="og:title" content="Tamatcha — první matcha bar v Ostravě">
<meta property="og:description" content="Prémiová matcha té nejvyšší kvality z prefektury Kagoshima, čerstvě našleháno v centru Ostravy.">
<meta property="og:image" content="https://prixedox.github.io/tamatcha/brand/og.jpg">
<meta property="og:locale" content="cs_CZ">
<meta name="theme-color" content="#154230">
<link rel="icon" type="image/png" href="/brand/logo/favicon-128.png">
<link rel="apple-touch-icon" href="/brand/logo/favicon-180.png">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/ClashDisplay-Semibold.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/montserrat-latin-400-normal.woff2">
<link rel="stylesheet" href="/src/styles/index.css">
</head>
<body>
<a class="skip" href="#o-nas">Přeskočit na obsah</a>
<header class="nav" id="nav">
  <div class="wrap nav__in">
    <a href="#top" class="brand" aria-label="Tamatcha — domů">
      <img src="/brand/logo/logotype-emerald.png" alt="tamatcha" height="30" width="W-from-task1">
    </a>
    <nav aria-label="Hlavní navigace">
      <ul class="nav__links">
        <li><a href="#o-nas">O nás</a></li>
        <li><a href="#menu">Menu</a></li>
        <li><a href="#galerie">Drinky</a></li>
        <li><a href="#navstiv">Kde nás najdeš</a></li>
        <li class="nav__ig-li"><a class="nav__ig" href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
          Instagram</a></li>
      </ul>
    </nav>
    <button class="burger" id="burger" aria-label="Otevřít menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<main id="top">
  <section class="hero" id="hero">
    <div class="wm hero__wm" aria-hidden="true"></div>
    <div class="wrap hero__grid">
      <div class="hero__copy">
        <span class="eyebrow reveal">První Matcha Bar v Ostravě</span>
        <h1 class="reveal" data-d="1">Prémiová matcha,<em>čerstvě našleháno.</em></h1>
        <p class="hero__sub reveal" data-d="2">Prémiová matcha té nejvyšší kvality z prefektury <b>Kagoshima</b> — v ledovém fizzu, nadýchaném cloudu i sametovém latté.</p>
        <div class="hero__cta reveal" data-d="3">
          <a href="#menu" class="btn btn--primary">Prohlédnout menu
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
          <a href="#navstiv" class="btn btn--ghost">Kde nás najdeš</a>
        </div>
        <div class="hero__meta reveal" data-d="4">
          <span><b>Po–Pá</b> 7:00–18:00</span><span class="dot"></span>
          <span><b>So–Ne</b> 9:00–18:00</span><span class="dot"></span>
          <span>Na Hradbách 1481/6, Ostrava</span>
        </div>
      </div>
      <div class="hero__trio reveal" data-d="2" aria-hidden="true">
        <img src="/brand/drinks/fizz-480.webp" srcset="/brand/drinks/fizz-480.webp 480w, /brand/drinks/fizz-880.webp 880w" sizes="(min-width:900px) 190px, 28vw" alt="" width="480" height="H-from-task1" fetchpriority="high">
        <img src="/brand/drinks/latte-iced-480.webp" srcset="/brand/drinks/latte-iced-480.webp 480w, /brand/drinks/latte-iced-880.webp 880w" sizes="(min-width:900px) 240px, 34vw" alt="" width="480" height="H-from-task1" fetchpriority="high">
        <img src="/brand/drinks/cloud-480.webp" srcset="/brand/drinks/cloud-480.webp 480w, /brand/drinks/cloud-880.webp 880w" sizes="(min-width:900px) 190px, 28vw" alt="" width="480" height="H-from-task1" fetchpriority="high">
      </div>
    </div>
  </section>

  <section class="section about" id="o-nas">
    <div class="wrap about__grid">
      <div class="about__copy">
        <div class="head">
          <span class="eyebrow reveal">O nás</span>
          <h2 class="reveal" data-d="1">Z Kagoshimy<br>rovnou do Ostravy.</h2>
        </div>
        <div class="reveal" data-d="2" style="margin-top:1.4rem">
          <p class="lead">Otevřeli jsme první matcha bar ve městě — kousek od Kuřího rynku, hned vedle OC Laso. Vozíme ceremoniální matchu té nejvyšší kvality přímo z japonské prefektury Kagoshima a připravujeme z ní nápoje, které mají grády i chuť.</p>
          <p style="margin-top:1rem">Žádný prášek z regálu. Jen sytě zelená, jemně nahořklá matcha, ovocná pyré a spousta ledu — přesně tak, jak ji máš rád.</p>
        </div>
        <div class="props reveal" data-d="3">
          <div class="prop">
            <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" stroke-linejoin="round"/></svg></span>
            <div><h3>Prémiová kvalita</h3><p>Matcha nejvyšší jakosti přímo z prefektury Kagoshima.</p></div>
          </div>
          <div class="prop">
            <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z" stroke-linejoin="round"/></svg></span>
            <div><h3>Energie bez propadu</h3><p>Přirozený kofein, který tě nabudí a nenechá spadnout.</p></div>
          </div>
          <div class="prop">
            <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3v4M18 3v4M4 8h16M6 8c0 6 2 9 6 9s6-3 6-9" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21h6" stroke-linecap="round"/></svg></span>
            <div><h3>Čerstvě připravená</h3><p>Každý drink šleháme na počkání, jen pro tebe.</p></div>
          </div>
        </div>
      </div>
      <div class="about__media reveal" data-d="2">
        <picture>
          <source type="image/avif" srcset="/img/post5_bar-480.avif 480w, /img/post5_bar-640.avif 640w" sizes="(min-width: 900px) 420px, 90vw">
          <source type="image/webp" srcset="/img/post5_bar-480.webp 480w, /img/post5_bar-640.webp 640w" sizes="(min-width: 900px) 420px, 90vw">
          <img src="/img/post5_bar-640.jpg" alt="Interiér matcha baru Tamatcha — barista podává ledovou matchu přes barový pult" width="420" height="560" loading="lazy">
        </picture>
        <span class="tag">📍 Ostrava-Centrum</span>
      </div>
    </div>
  </section>

  <section class="section ritual" id="ritual">
    <div class="wrap">
      <div class="head center reveal">
        <span class="eyebrow">Připraveno obřadně</span>
        <h2>Tři kroky k dokonalé matche</h2>
      </div>
      <div class="steps">
        <div class="step reveal" data-d="1">
          <span class="step__n" aria-hidden="true">01</span>
          <h3>Prosíváme</h3><p>Ceremoniální matchu nejdřív prosejeme přes jemné sítko, aby v ní nezůstala jediná hrudka.</p>
        </div>
        <div class="step reveal" data-d="2">
          <span class="step__n" aria-hidden="true">02</span>
          <h3>Šleháme</h3><p>Bambusovým chasenem ji našleháme s vodou o správné teplotě do sametově hladké pěny.</p>
        </div>
        <div class="step reveal" data-d="3">
          <span class="step__n" aria-hidden="true">03</span>
          <h3>Podáváme</h3><p>Ledově, nadýchaně nebo v latté — dolijeme, ozdobíme a podáme přesně podle tebe.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section menu" id="menu">
    <div class="wrap">
      <div class="head center reveal">
        <span class="eyebrow">Menu</span>
        <h2>Naše signature nápoje</h2>
        <p class="lead">Každý drink si sestavíš podle sebe — vyber si pyré nebo sirup. Vše 450 ml.</p>
      </div>
      <div class="menu__grid">
        <article class="mcard reveal" data-d="1">
          <div class="mcard__body">
            <h3>Matcha Fizz</h3>
            <p class="formula">( matcha, soda, pyré dle výběru )</p>
            <ul class="flavors"><li>Maracuja</li><li>Yuzu</li><li>Cherry</li><li>Grep</li><li>Mango</li><li>Jahoda</li></ul>
            <div class="mcard__meta"><b class="ml">450 ml</b><b class="price">119,- Kč</b></div>
          </div>
          <img class="mcard__drink" src="/brand/drinks/fizz-480.webp" srcset="/brand/drinks/fizz-480.webp 480w, /brand/drinks/fizz-880.webp 880w" sizes="(min-width:700px) 230px, 38vw" alt="Matcha Fizz s maracujou" loading="lazy" width="480" height="H-from-task1">
        </article>
        <article class="mcard reveal" data-d="2">
          <div class="mcard__body">
            <h3>Matcha Cloud</h3>
            <p class="formula">( matcha cloud, mléko, pyré dle výběru )</p>
            <ul class="flavors"><li>Jahoda</li><li>Kokos</li><li>Borůvka</li></ul>
            <div class="mcard__meta"><b class="ml">450 ml</b><b class="price">119,- Kč</b></div>
          </div>
          <img class="mcard__drink" src="/brand/drinks/cloud-480.webp" srcset="/brand/drinks/cloud-480.webp 480w, /brand/drinks/cloud-880.webp 880w" sizes="(min-width:700px) 230px, 38vw" alt="Matcha Cloud" loading="lazy" width="480" height="H-from-task1">
        </article>
        <article class="mcard reveal" data-d="1">
          <div class="mcard__body">
            <h3>Iced / Hot Matcha Latté</h3>
            <p class="formula">( matcha, mléko/ovesné mléko, sirup dle výběru, posyp )</p>
            <ul class="flavors"><li>Vanilka</li><li>Čokoláda</li><li>Jahoda</li><li>Lískooříšek</li><li>Karamel</li><li>Pistácie</li></ul>
            <div class="mcard__meta"><b class="ml">450 ml</b><b class="price">119,- Kč</b></div>
          </div>
          <img class="mcard__drink" src="/brand/drinks/latte-iced-480.webp" srcset="/brand/drinks/latte-iced-480.webp 480w, /brand/drinks/latte-iced-880.webp 880w" sizes="(min-width:700px) 230px, 38vw" alt="Iced Matcha Latté s jahodou" loading="lazy" width="480" height="H-from-task1">
        </article>
        <article class="mcard reveal" data-d="2">
          <div class="mcard__body">
            <h3>Iced Yerba Maté</h3>
            <p class="formula">( yerba maté, pyré dle výběru )</p>
            <ul class="flavors"><li>Ananas</li><li>Černý rybíz</li><li>Broskev</li><li>Bez pyré</li></ul>
            <div class="mcard__meta"><b class="ml">450 ml</b><b class="price">79,- Kč</b></div>
          </div>
          <img class="mcard__drink" src="/brand/drinks/yerba-480.webp" srcset="/brand/drinks/yerba-480.webp 480w, /brand/drinks/yerba-880.webp 880w" sizes="(min-width:700px) 230px, 38vw" alt="Iced Yerba Maté s citronem" loading="lazy" width="480" height="H-from-task1">
        </article>
      </div>
      <p class="menu__note reveal">Brzy přidáváme <b>speciální drinky</b> — ať ti neutečou, sleduj nás na <a href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">Instagramu</a>.</p>
    </div>
  </section>

  <section class="section lineup" id="galerie">
    <div class="wrap">
      <div class="head center reveal">
        <span class="eyebrow">Naše drinky</span>
        <h2>Celá sestava</h2>
        <p class="lead">Prémiová matcha té nejvyšší kvality z prefektury Kagoshima.</p>
      </div>
      <div class="lineup__strip">
        <figure class="lineup__item reveal"><img src="/brand/drinks/fizz-480.webp" alt="" loading="lazy" width="480" height="H-from-task1"><figcaption>Matcha Fizz</figcaption></figure>
        <figure class="lineup__item reveal" data-d="1"><img src="/brand/drinks/latte-iced-480.webp" alt="" loading="lazy" width="480" height="H-from-task1"><figcaption>Iced Matcha Latté</figcaption></figure>
        <figure class="lineup__item reveal" data-d="2"><img src="/brand/drinks/latte-hot-480.webp" alt="" loading="lazy" width="480" height="H-from-task1"><figcaption>Hot Matcha Latté</figcaption></figure>
        <figure class="lineup__item reveal" data-d="3"><img src="/brand/drinks/cloud-480.webp" alt="" loading="lazy" width="480" height="H-from-task1"><figcaption>Matcha Cloud</figcaption></figure>
        <figure class="lineup__item reveal" data-d="4"><img src="/brand/drinks/yerba-480.webp" alt="" loading="lazy" width="480" height="H-from-task1"><figcaption>Iced Yerba Maté</figcaption></figure>
      </div>
      <div class="lineup__foot reveal">
        <div class="freecard">
          <span class="gift"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S9 3 6.5 4 8 8 12 7zM12 7s3-4 5.5-3S16 8 12 7z" stroke-linejoin="round"/></svg></span>
          <div><b class="big">Drink zdarma?</b><p>Nasdílej svůj drink na Instagram a označ <b>@tamatcha_ova</b> — a máš ho od nás na účet.</p></div>
        </div>
        <a class="btn btn--primary" href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
          Sledovat @tamatcha_ova</a>
      </div>
    </div>
  </section>

  <section class="section visit" id="navstiv">
    <div class="wm visit__wm" aria-hidden="true"></div>
    <div class="wrap">
      <div class="head reveal">
        <span class="eyebrow">Kde nás najdeš</span>
        <h2>Zastav se na matchu.</h2>
      </div>
      <div class="visit__grid">
        <div class="vblock reveal" data-d="1">
          <h3>Adresa</h3>
          <p>Na Hradbách 1481/6<br>702 00 Ostrava-Centrum</p>
          <p class="vmuted">u Kuřího rynku · vedle OC Laso</p>
          <a class="btn btn--cream" href="https://www.google.com/maps/search/?api=1&query=Tamatcha+Na+Hradb%C3%A1ch+1481%2F6+Ostrava" target="_blank" rel="noopener">Otevřít v mapách
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="16" height="16" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        </div>
        <div class="vblock reveal" data-d="2">
          <h3>Otevírací doba</h3>
          <p class="tnum">Po–Pá&nbsp;&nbsp;7:00–18:00<br>So–Ne&nbsp;&nbsp;9:00–18:00</p>
        </div>
        <div class="vblock reveal" data-d="3">
          <h3>Kontakt</h3>
          <p><a href="tel:+420605000456" class="tnum">+420 605 000 456</a><br>
          <a href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">@tamatcha_ova</a></p>
        </div>
      </div>
    </div>
  </section>
</main>
<footer class="footer">
  <div class="wrap footer__in">
    <a href="#top" class="brand" aria-label="Tamatcha — nahoru">
      <img src="/brand/logo/logotype-cream.png" alt="tamatcha" height="26" width="W-from-task1">
    </a>
    <nav class="footer__nav" aria-label="Patička">
      <a href="#o-nas">O nás</a>
      <a href="#menu">Menu</a>
      <a href="#navstiv">Kde nás najdeš</a>
      <a href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">Instagram</a>
    </nav>
    <span class="footer__c">© 2026 Tamatcha · Ostrava — Matcha, poctivě. 🍵</span>
  </div>
</footer>
<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 13: Replace `src/styles/sections.css`**

```css
/* ===== primitives ===== */
.wrap{max-width:var(--wrap);margin-inline:auto;padding-inline:var(--pad)}
.section{position:relative;padding-block:var(--sp-section)}
.head{max-width:660px}
.head.center{margin-inline:auto;text-align:center}
.eyebrow{display:inline-block;font-weight:700;font-size:.76rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:1rem}
h1,h2,h3,h4{font-family:var(--display);font-weight:600;color:var(--emerald);line-height:1.06}
h1{font-size:clamp(2.7rem,6.4vw,4.6rem);letter-spacing:-.015em}
h1 em{display:block;font-style:normal}
h2{font-size:clamp(2rem,4.2vw,3rem);letter-spacing:-.01em}
h3{font-size:1.35rem}
.lead{font-size:1.08rem;color:var(--coal-60);margin-top:1.1rem}
.tnum{font-variant-numeric:tabular-nums}

/* watermark: giant pictogram, tinted via CSS mask (alpha of the PNG) */
.wm{position:absolute;z-index:0;pointer-events:none;background:var(--watermark);
  -webkit-mask:url('/brand/logo/piktogram-mask.png') center/contain no-repeat;
  mask:url('/brand/logo/piktogram-mask.png') center/contain no-repeat}
.section>.wrap,.hero>.wrap{position:relative;z-index:1}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:.55rem;font-weight:700;font-size:.95rem;padding:.85rem 1.6rem;border-radius:999px;border:1.5px solid transparent;transition:background .25s var(--ease),color .25s var(--ease),border-color .25s var(--ease)}
.btn svg{width:17px;height:17px;flex:none}
.btn--primary{background:var(--emerald);color:var(--cream)}
.btn--primary:hover{background:var(--emerald-2)}
.btn--ghost{border-color:var(--emerald);color:var(--emerald)}
.btn--ghost:hover{background:var(--emerald);color:var(--cream)}
.btn--cream{border-color:var(--cream-80);color:var(--cream)}
.btn--cream:hover{background:var(--cream);color:var(--burgundy)}

/* reveals (JS-gated so no-JS users see everything) */
.js .reveal{opacity:0;transform:translateY(22px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
.js .reveal.in{opacity:1;transform:none}
.js .reveal[data-d="1"]{transition-delay:.08s}
.js .reveal[data-d="2"]{transition-delay:.16s}
.js .reveal[data-d="3"]{transition-delay:.24s}
.js .reveal[data-d="4"]{transition-delay:.32s}
@media (prefers-reduced-motion:reduce){.js .reveal{opacity:1;transform:none;transition:none}}

/* ===== nav ===== */
.nav{position:fixed;inset:0 0 auto;z-index:50;background:var(--paper);border-bottom:1px solid var(--line)}
.nav--scrolled{box-shadow:0 10px 30px rgba(16,17,17,.07)}
.nav__in{display:flex;align-items:center;justify-content:space-between;height:72px}
.brand img{height:30px;width:auto}
.nav__links{display:flex;align-items:center;gap:2rem;font-weight:500;font-size:.95rem}
.nav__links a{position:relative;padding-block:.3rem}
.nav__links a:hover,.nav__links a.active{color:var(--emerald)}
.nav__links a.active::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--gold);border-radius:2px}
.nav__ig{display:inline-flex;align-items:center;gap:.45rem;border:1.5px solid var(--emerald);color:var(--emerald);border-radius:999px;padding:.5rem 1.1rem;font-weight:700}
.nav__ig:hover{background:var(--emerald);color:var(--cream)}
.nav__ig svg{width:16px;height:16px}
.nav__ig-li a.active::after{display:none}
.burger{display:none;flex-direction:column;gap:5px;background:none;border:0;padding:.5rem}
.burger span{width:24px;height:2px;background:var(--emerald);border-radius:2px}

/* ===== hero ===== */
.hero{position:relative;overflow:hidden;padding-top:calc(72px + clamp(3rem,7vw,5rem));padding-bottom:clamp(2rem,5vw,4rem);min-height:88vh;display:flex;align-items:center}
.hero__wm{width:min(88vw,940px);aspect-ratio:1;right:-14%;top:-8%}
.hero__grid{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(1.5rem,4vw,3.5rem);align-items:center;width:100%}
.hero__sub{margin-top:1.3rem;max-width:34rem;color:var(--coal-60);font-size:1.08rem}
.hero__cta{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:2rem}
.hero__meta{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;margin-top:2.4rem;font-size:.92rem;color:var(--coal-60)}
.hero__meta b{color:var(--coal)}
.hero__meta .dot{width:4px;height:4px;border-radius:50%;background:var(--gold)}
.hero__trio{display:flex;align-items:flex-end;justify-content:center}
.hero__trio img{width:32%;height:auto}
.hero__trio img:nth-child(2){width:42%;margin-inline:-5%;position:relative;z-index:1}

/* ===== about ===== */
.about__grid{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(2rem,5vw,4.5rem);align-items:center}
.props{display:grid;gap:1.1rem;margin-top:2.2rem}
.prop{display:flex;gap:1rem;align-items:flex-start}
.prop .ic{flex:none;width:42px;height:42px;display:grid;place-items:center;border:1.5px solid var(--gold);border-radius:12px;color:var(--gold)}
.prop .ic svg{width:20px;height:20px}
.prop h3{font-size:1.05rem}
.prop p{color:var(--coal-60);font-size:.95rem;margin-top:.15rem}
.about__media{position:relative;justify-self:center}
.about__media img{border-radius:var(--r)}
.about__media .tag{position:absolute;left:1rem;bottom:1rem;background:var(--paper);border-radius:999px;padding:.45rem 1rem;font-weight:700;font-size:.85rem}

/* ===== ritual ===== */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.5rem,3.5vw,3rem);margin-top:3.2rem}
.step{position:relative;padding-top:.6rem}
.step__n{display:block;font-family:var(--display);font-weight:600;font-size:clamp(3.4rem,7vw,4.8rem);line-height:1;color:var(--emerald);opacity:.14}
.step h3{margin-top:-.9rem}
.step p{color:var(--coal-60);margin-top:.55rem;font-size:.97rem}

/* ===== menu (white band, like the in-store screens) ===== */
.menu{background:#fff}
.menu__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.4rem;margin-top:3rem}
.mcard{display:grid;grid-template-columns:1.1fr .9fr;gap:1rem;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);padding:1.9rem;overflow:hidden}
.mcard__body{display:flex;flex-direction:column;min-width:0}
.mcard h3{font-size:clamp(1.45rem,2.4vw,1.85rem)}
.formula{color:var(--coal-60);font-size:.93rem;margin-top:.45rem}
.flavors{display:flex;flex-wrap:wrap;gap:.35rem .55rem;margin-top:1.1rem;font-weight:500;font-size:.93rem}
.flavors li{display:flex;align-items:center;gap:.55rem}
.flavors li+li::before{content:'';width:4px;height:4px;border-radius:50%;background:var(--gold)}
.mcard__meta{display:flex;gap:1.8rem;margin-top:auto;padding-top:1.4rem;font-size:1.02rem}
.mcard__meta .price{color:var(--emerald)}
.mcard__drink{align-self:end;justify-self:center;width:min(100%,230px);height:auto}
.menu__note{text-align:center;margin-top:2.6rem;color:var(--coal-60)}
.menu__note a{font-weight:700;color:var(--emerald);text-decoration:underline;text-underline-offset:3px}

/* ===== lineup (cream band, like screen 3) ===== */
.lineup{background:var(--cream)}
.lineup__strip{display:grid;grid-template-columns:repeat(5,1fr);gap:1.2rem;align-items:end;margin-top:3.2rem}
.lineup__item{text-align:center}
.lineup__item img{width:100%;height:auto}
.lineup__item figcaption{font-family:var(--display);font-weight:500;color:var(--emerald);margin-top:1rem;font-size:1rem}
.lineup__foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.5rem;margin-top:3.2rem;border-top:1px solid var(--line);padding-top:2.2rem}
.freecard{display:flex;gap:1rem;align-items:flex-start;max-width:34rem}
.freecard .gift{flex:none;width:44px;height:44px;display:grid;place-items:center;border:1.5px solid var(--gold);border-radius:12px;color:var(--gold)}
.freecard .gift svg{width:20px;height:20px}
.freecard .big{font-family:var(--display);font-weight:600;font-size:1.15rem;color:var(--emerald)}
.freecard p{color:var(--coal-60);font-size:.95rem;margin-top:.2rem}

/* ===== visit (burgundy band, like the flyer footer) ===== */
.visit{background:var(--burgundy);color:var(--cream);overflow:hidden}
.visit .eyebrow{color:var(--gold)}
.visit h2{color:var(--cream)}
.visit__wm{background:rgba(230,226,218,.05);width:min(70vw,760px);aspect-ratio:1;right:-10%;bottom:-24%}
.visit__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.5rem;margin-top:3rem}
.vblock h3{color:var(--cream);font-size:1.08rem;margin-bottom:.7rem}
.vblock p{color:var(--cream-80);line-height:1.85}
.vblock .vmuted{color:var(--cream-80);opacity:.75;font-size:.9rem;margin-top:.3rem}
.vblock a:hover{color:#fff;text-decoration:underline;text-underline-offset:3px}
.vblock .btn{margin-top:1.2rem}

/* ===== footer (continues the burgundy band) ===== */
.footer{background:var(--burgundy);color:var(--cream-80);border-top:1px solid var(--cream-16)}
.footer__in{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.2rem;padding-block:1.8rem}
.footer .brand img{height:26px;width:auto}
.footer__nav{display:flex;flex-wrap:wrap;gap:1.4rem;font-size:.92rem}
.footer__nav a:hover{color:#fff}
.footer__c{font-size:.88rem}

/* ===== responsive ===== */
@media (max-width:960px){
  .hero__grid,.about__grid{grid-template-columns:1fr}
  .hero{min-height:0}
  .hero__trio{margin-top:2.5rem}
  .about__media{order:-1;justify-self:start}
  .steps{grid-template-columns:1fr;gap:2rem}
  .menu__grid{grid-template-columns:1fr}
  .visit__grid{grid-template-columns:1fr;gap:2rem}
}
@media (max-width:860px){
  .lineup__strip{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:46%;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:1rem}
  .lineup__item{scroll-snap-align:center}
}
@media (max-width:760px){
  .burger{display:flex}
  .nav nav{display:none}
  .nav.mobile-open nav{display:block;position:absolute;top:72px;left:0;right:0;background:var(--paper);border-bottom:1px solid var(--line);padding:1rem var(--pad) 1.5rem}
  .nav.mobile-open .nav__links{flex-direction:column;align-items:flex-start;gap:1.1rem}
  .mcard{grid-template-columns:1fr}
  .mcard__drink{width:min(60%,220px);justify-self:start;order:-1}
  .lineup__foot{flex-direction:column;align-items:flex-start}
}
```

- [ ] **Step 14: Replace `src/main.ts`; trim `src/scroll.ts`; delete dead modules**

New `src/main.ts`:

```ts
document.documentElement.classList.add('js')

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

// Mobile nav toggle: synchronous and unconditional — basic navigation must
// keep working even if boot() below never resolves.
function initMobileNav(): void {
  const nav = document.getElementById('nav')
  const burger = document.getElementById('burger')
  if (!nav || !burger) return
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('mobile-open')
    burger.setAttribute('aria-expanded', open ? 'true' : 'false')
  })
  document.querySelectorAll<HTMLAnchorElement>('.nav__links a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('mobile-open')
      burger.setAttribute('aria-expanded', 'false')
    })
  })
}
initMobileNav()

async function boot() {
  try {
    const { initScroll } = await import('./scroll')
    initScroll(reduced)
  } catch (err) {
    // safety net: a failed chunk load must never leave content stuck at
    // opacity:0 (.js .reveal{opacity:0}) — force everything visible.
    console.error('boot() failed, revealing content as a safety net', err)
    document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => el.classList.add('in'))
  }
}
boot()
```

In `src/scroll.ts` replace both occurrences of `'.reveal, .draw'` with `'.reveal'` (the `.draw` SVG is gone). Everything else stays.

Delete dead code:

```bash
git rm -r src/fluid src/scenes
git rm src/tiers.ts src/tiers.test.ts src/debug.d.ts
```

In `package.json` set `"test": "vitest run --passWithNoTests"` (no unit tests remain).

- [ ] **Step 15: Build (type check) passes**

```bash
npm run build
```

Expected: PASS. If tsc complains about removed imports, the file with the stale import is listed — fix it (only `main.ts` and `scroll.ts` should reference anything).

- [ ] **Step 16: Full e2e green**

```bash
npm test && npm run e2e
```

Expected: vitest "no tests" exit 0; all Playwright specs pass (content, menu, lineup, nav, scroll, smoke, visual).

- [ ] **Step 17: Visual review**

Read `test-results/desktop-full.png` and `test-results/mobile-full.png` (written by visual.spec). Check: cream paper bg, emerald Clash Display headings render Czech glyphs (Tři, dokonalé, najdeš — no fallback-font mixing), watermark visible in hero, burgundy band at bottom, drink cutouts shadow-free. Fix CSS if anything is off, re-run e2e.

- [ ] **Step 18: Commit**

```bash
git add -A && git commit -m "feat: brand-match redesign — cream editorial look, Clash Display/Montserrat, real product photos

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Dead asset cleanup + budgets

**Files:**
- Delete: `public/ritual/` (frame sequences, ~4 MB), `public/fonts/bricolage-*.woff2` (2), `public/fonts/hanken-*.woff2` (8), `public/img/post{1,2,3,4,6}_*`, `public/img/ritual-*`, `public/img/logo-96.*`, `scripts/ritual-3d/`
- Modify: `scripts/optimize-images.mjs` (trim job list)

**Interfaces:**
- Consumes: DOM from Task 2 — the only `public/img` files still referenced are `post5_bar-{480,640}.{avif,webp,jpg}`.

- [ ] **Step 1: Verify nothing else references the doomed files**

```bash
grep -rE 'ritual/|bricolage|hanken|logo-96|post[12346]_|img/ritual-' index.html src e2e scripts --include='*' -l
```

Expected: only `scripts/optimize-images.mjs` (fixed next step). If anything else matches, fix it first.

- [ ] **Step 2: Delete**

```bash
git rm -r public/ritual scripts/ritual-3d
git rm public/fonts/bricolage-*.woff2 public/fonts/hanken-*.woff2
git rm public/img/post1_* public/img/post2_* public/img/post3_* public/img/post4_* public/img/post6_* public/img/ritual-* public/img/logo-96.*
```

- [ ] **Step 3: Trim `scripts/optimize-images.mjs` jobs to what's still used**

```js
const jobs = [
  { file: 'post5_bar.jpg', widths: [480, 640] },
]
```

- [ ] **Step 4: Build, budgets, e2e still green**

```bash
npm run build && npm run check:budgets && npm run e2e
```

Expected: build OK; `TOTAL JS` far below 120 kB gz (GSAP+Lenis only); all e2e pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove WebGL-era assets — ritual frames, old fonts, unused images

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: README + final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above; produces the final verified state ready to push.

- [ ] **Step 1: Update `README.md`**

- Replace the intro line: `Jednostránkový web pro **Tamatcha**, první matcha bar v Ostravě — postavený na oficiálním brand balíčku (Clash Display + Montserrat, emerald/cream/gold/burgundy paleta, reálné produktové fotografie).`
- Remove the `?tier=a|b|c` debug line.
- In „Struktura": drop `src/fluid/` and `src/scenes/` lines; add:
  - `` `public/brand/` — generované brand assety (drinky, logo, og) ``
  - `` `scripts/brand-assets.mjs` — regenerace z ~/projects/tamatcha-brand (BRAND_SRC přepíše cestu); zdroj: Výstupy.zip od grafika ``
- Keep deployment section as is.

- [ ] **Step 2: Full verification sweep**

```bash
npm run build && npm test && npm run e2e && npm run check:budgets
```

Expected: everything green. Then read `test-results/desktop-full.png` + `test-results/mobile-full.png` one final time.

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "docs: README for brand-match redesign

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Offer deploy**

Do NOT push. Report to the user: redesign complete on `main` locally, N commits ahead; pushing will auto-deploy to GitHub Pages via Actions. Ask whether to push.
