# Tamatcha v2 "Living Matcha" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Tamatcha one-pager as a wow-effect dynamic site — interactive WebGL liquid-matcha hero + scroll-driven story — per the approved spec at `docs/superpowers/specs/2026-07-09-tamatcha-v2-design.md`.

**Architecture:** Vite + vanilla TypeScript one-pager. All content lives as semantic HTML in `index.html` (fully readable without JS). JS layers on: a tier system (A = GPU fluid sim, B = noise shader, C = CSS gradient), GSAP ScrollTrigger + Lenis scroll choreography, a pinned canvas "Rituál" scene, CSS micro-animations on menu cards, and a draggable gallery strip. Deployed to GitHub Pages via Actions.

**Tech Stack:** Vite 6, TypeScript (strict), GSAP + ScrollTrigger, Lenis, custom WebGL2 fluid sim (no three.js), Vitest (unit), Playwright (e2e), sharp (image pipeline, dev-only), GitHub Actions + Pages.

## Global Constraints

- Node ≥ 20 required (`node --version` before starting; abort if older).
- **Czech copy is preserved verbatim** from `legacy/template.html` (moved there in Task 1; line numbers below refer to that file, which is byte-identical to the current `template.html`). Never retype Czech text by hand — copy it, diacritics break silently.
- **Palette tokens verbatim** from spec §4 / `legacy/template.html:3-30` (`--forest:#183A2C`, `--forest-2:#0E271C`, `--forest-3:#21503C`, `--matcha:#8FB94B`, `--matcha-deep:#5E8A34`, `--cream:#ECE6D7`, `--cream-2:#F4EFE4`, `--paper:#F8F4EB`, `--oxblood:#43201D`, `--ink:#1B241E`).
- Animate **only** `transform`, `opacity`, and canvas pixels. No layout-affecting properties.
- Every `<canvas>` gets `aria-hidden="true"` (they sit inside `aria-hidden` wrappers below — that satisfies this).
- JS budget: total gzipped JS in `dist/` ≤ 120 kB (checked by `scripts/check-budgets.mjs`).
- Vite `base` is `'/tamatcha/'` unless env `VITE_BASE` overrides — **the GitHub repo must be named `tamatcha`** or base must be changed to match.
- Debug hook `window.__tamatcha` (typed in `src/debug.d.ts`) is the e2e contract: `{ tier, frames, splats, ritualStep, ritualRange }`. Keep it updated — tests depend on it.
- Tuning constants (splat force, dissipations, particle counts) may be adjusted for feel, but stay within "slow, thick liquid" art direction (spec §3.1) and keep tests passing.
- Photo→content mapping (assets in v1 were re-encoded; this mapping is by alt text and elimination):
  | v1 token | source file | used for |
  |---|---|---|
  | LOGO | `source-photos/logo.jpg` | nav + footer brand |
  | HERO_FIZZ, IG_FIZZ | `source-photos/post4_fizz.jpg` | gallery tile 1 |
  | ABOUT_INTERIOR, IG_INTERIOR | `source-photos/post5_bar.jpg` | about photo + gallery tile 2 |
  | IG_OPENING | `source-photos/post6_free.jpg` | gallery tile 3 |
  | IG_FESTIVAL | `source-photos/post1_festival.jpg` | gallery tile 4 |
  | IG_LATTE | `source-photos/post3_latte.jpg` | gallery tile 5 |
  | IG_MENU | `source-photos/post2_menu.jpg` | gallery tile 6 |

---

### Task 1: Repo restructure + Vite/TS/test scaffold

**Files:**
- Move: `template.html`, `build.py`, `fonts.css`, `assets.json`, `index.html`, `artifact.html`, `README.md` → `legacy/`
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `index.html` (new stub), `src/main.ts`, `src/debug.d.ts`, `e2e/smoke.spec.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: working `npm run dev` / `build` / `preview` / `e2e`; `src/main.ts` as the boot entry every later task extends; `window.__tamatcha` debug type.

- [ ] **Step 1: Preflight + move v1 into legacy/**

```bash
node --version   # must print v20.x or newer — STOP if not
mkdir -p legacy
git mv template.html build.py fonts.css assets.json index.html artifact.html README.md legacy/
```

- [ ] **Step 2: Scaffold npm project**

Create `package.json`:

```json
{
  "name": "tamatcha",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "e2e": "playwright test",
    "assets:fonts": "python3 scripts/extract-fonts.py",
    "assets:img": "node scripts/optimize-images.mjs",
    "check:budgets": "node scripts/check-budgets.mjs"
  }
}
```

Then:

```bash
npm install --save-dev vite typescript vitest @playwright/test sharp
npm install gsap lenis
npx playwright install chromium
```

- [ ] **Step 3: Config files**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/tamatcha/',
})
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "types": ["vite/client"],
    "skipLibCheck": true
  },
  "include": ["src", "e2e", "scripts", "vite.config.ts", "playwright.config.ts"]
}
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/tamatcha/',
    viewport: { width: 1280, height: 800 },
    // software WebGL so tier A/B run in headless CI
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/tamatcha/',
    reuseExistingServer: !process.env.CI,
  },
})
```

Append to `.gitignore`:

```
test-results/
playwright-report/
```

- [ ] **Step 4: Stub entry + debug typing**

Create `index.html` (temporary stub — Task 3 replaces the body):

```html
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tamatcha — první matcha bar v Ostravě</title>
</head>
<body>
<h1>Tamatcha v2 scaffold</h1>
<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Create `src/debug.d.ts`:

```ts
export {}

declare global {
  interface Window {
    __tamatcha: {
      tier: 'a' | 'b' | 'c'
      frames: number
      splats: number
      ritualStep: number
      ritualRange: [number, number] | null
    }
  }
}
```

Create `src/main.ts`:

```ts
document.documentElement.classList.add('js')
window.__tamatcha = { tier: 'c', frames: 0, splats: 0, ritualStep: -1, ritualRange: null }
```

- [ ] **Step 5: Write smoke e2e test**

Create `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('site builds and boots', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('html.js')).toHaveCount(1)
  const dbg = await page.evaluate(() => window.__tamatcha)
  expect(dbg).toBeTruthy()
})
```

- [ ] **Step 6: Build + run e2e, verify pass**

```bash
npm run build
npm run e2e
```

Expected: build emits `dist/`; `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: move v1 to legacy/, scaffold Vite+TS+Playwright"
```

---

### Task 2: Asset pipeline — fonts out of data-URIs, photos optimized

**Files:**
- Create: `scripts/extract-fonts.py`, `scripts/optimize-images.mjs`, `src/styles/fonts.css` (generated), `public/fonts/*.woff2` (generated), `public/img/*` (generated)

**Interfaces:**
- Consumes: `legacy/fonts.css` (10 `@font-face` blocks, woff2 data-URIs), `source-photos/*.jpg`.
- Produces: `public/fonts/<slug>.woff2` files; `src/styles/fonts.css` with `@font-face` rules using `url('/fonts/<slug>.woff2')`; `public/img/<name>-<w>.{avif,webp,jpg}` for each source photo at widths 480 and 960 (logo only 96). Task 3 references these exact paths.

- [ ] **Step 1: Write font extraction script**

Create `scripts/extract-fonts.py`:

```python
import base64, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
css = (ROOT / "legacy" / "fonts.css").read_text()
out_fonts = ROOT / "public" / "fonts"
out_fonts.mkdir(parents=True, exist_ok=True)

blocks = re.findall(r"@font-face\s*{(.*?)}", css, re.S)
assert len(blocks) == 10, f"expected 10 @font-face blocks, got {len(blocks)}"

rules = []
for b in blocks:
    family = re.search(r"font-family:\s*'([^']+)'", b).group(1)
    weight = re.search(r"font-weight:\s*([\d ]+)", b).group(1).strip()
    urange = re.search(r"unicode-range:\s*([^;]+);", b).group(1).strip()
    subset = "latin-ext" if "U+0100" in urange else "latin"
    b64 = re.search(r"base64,([A-Za-z0-9+/=]+)", b).group(1)
    slug = f"{family.lower().replace(' ', '-')}-{weight.replace(' ', '-')}-{subset}"
    (out_fonts / f"{slug}.woff2").write_bytes(base64.b64decode(b64))
    rules.append(
        "@font-face{font-family:'%s';font-style:normal;font-weight:%s;"
        "font-display:swap;src:url('/fonts/%s.woff2') format('woff2');"
        "unicode-range:%s}" % (family, weight, slug, urange)
    )

out_css = ROOT / "src" / "styles"
out_css.mkdir(parents=True, exist_ok=True)
(out_css / "fonts.css").write_text("\n".join(rules) + "\n")
print(f"wrote {len(blocks)} fonts -> public/fonts/, src/styles/fonts.css")
```

- [ ] **Step 2: Run it, verify output**

```bash
python3 scripts/extract-fonts.py
ls public/fonts   # expect 10 .woff2 files, names like bricolage-grotesque-400-800-latin.woff2
```

- [ ] **Step 3: Write image optimizer**

Create `scripts/optimize-images.mjs`:

```js
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'source-photos'
const OUT = 'public/img'
const jobs = [
  { file: 'logo.jpg', widths: [96] },
  { file: 'post1_festival.jpg', widths: [480, 960] },
  { file: 'post2_menu.jpg', widths: [480, 960] },
  { file: 'post3_latte.jpg', widths: [480, 960] },
  { file: 'post4_fizz.jpg', widths: [480, 960] },
  { file: 'post5_bar.jpg', widths: [480, 960] },
  { file: 'post6_free.jpg', widths: [480, 960] },
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
```

- [ ] **Step 4: Run it, verify output**

```bash
node scripts/optimize-images.mjs
ls public/img | wc -l   # expect 39 files (6 photos × 2 widths × 3 formats + logo × 1 width × 3)
```

- [ ] **Step 5: Commit** (generated assets are committed — CI build must not need sharp/python)

```bash
git add scripts public/fonts public/img src/styles/fonts.css
git commit -m "feat: extract self-hosted fonts, add optimized AVIF/WebP/JPEG photos"
```

---

### Task 3: Full semantic index.html + tokens/base CSS (no-JS-complete page)

**Files:**
- Modify: `index.html` (replace stub with full content)
- Create: `src/styles/index.css`, `src/styles/tokens.css`, `src/styles/base.css`
- Test: `e2e/content.spec.ts`

**Interfaces:**
- Consumes: `public/img/*`, `src/styles/fonts.css` (Task 2); Czech copy from `legacy/template.html`.
- Produces: the DOM contract every later task hooks into. Class/ID hooks that later tasks rely on: `.hero` `#hero`, `.hero__canvas`, `.hero__content`, `#o-nas`, `.about__journey` (SVG), `.about__leaf` (×3), `#ritual .ritual__stage .ritual__canvas`, `#ritual .step[data-step="0|1|2"]`, `#menu .mcard .mcard__fx` (variants `fx-fizz|fx-cloud|fx-latte|fx-yerba`), `#galerie .ig__strip .ig__tile`, `#navstiv .mapcard .grid-lines`, `.reveal` / `data-d` reveal hooks, `.nav` `#nav`.

- [ ] **Step 1: Write head + hero + about markup**

Replace `index.html` entirely. Head (meta copied from v1 spirit — see `legacy/build.py:17-30` for exact strings):

```html
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tamatcha — první matcha bar v Ostravě</title>
<meta name="description" content="První matcha bar v Ostravě. Prémiová ceremoniální matcha z prefektury Kagošima — Matcha Fizz, Cloud, latté i Yerba Maté. Na Hradbách 1481/6, Ostrava-Centrum.">
<meta property="og:type" content="website">
<meta property="og:title" content="Tamatcha — první matcha bar v Ostravě">
<meta property="og:description" content="Prémiová matcha nejvyšší kvality z prefektury Kagošima, čerstvě našleháno v centru Ostravy.">
<meta property="og:locale" content="cs_CZ">
<meta name="theme-color" content="#183A2C">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23183A2C'/%3E%3Cg fill='none' stroke='%23ECE6D7' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M16 9c-4 2-6 6-6 12'/%3E%3Cpath d='M16 9c0 6 0 9 0 12'/%3E%3Cpath d='M16 9c4 2 6 6 6 12'/%3E%3Cpath d='M15 8l6-2'/%3E%3C/g%3E%3C/svg%3E">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/bricolage-grotesque-400-800-latin.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/hanken-grotesk-400-latin.woff2">
<link rel="stylesheet" href="/src/styles/index.css">
</head>
<body>
```

Immediately after `<body>`, a skip link (spec §9 keyboard row):

```html
<a class="skip" href="#o-nas">Přeskočit na obsah</a>
```

with this rule added to `src/styles/base.css`:

```css
.skip{position:absolute;left:-999px;top:0;z-index:100;background:var(--matcha);color:var(--ink);padding:.6rem 1rem;border-radius:0 0 8px 0}
.skip:focus{left:0}
```

Then nav + hero. Nav: copy `legacy/template.html:323-344` unchanged, except replace `src="{{LOGO}}"` with:

```html
<img src="/img/logo-96.jpg" alt="" width="38" height="38">
```

Hero (new structure; all text nodes copied verbatim from `legacy/template.html:356-368,381`):

```html
<main id="top">
  <section class="hero" id="hero">
    <div class="hero__bg" aria-hidden="true"><canvas class="hero__canvas"></canvas></div>
    <div class="hero__scrim" aria-hidden="true"></div>
    <div class="wrap hero__content">
      <span class="eyebrow hero__eyebrow reveal">První matcha bar v Ostravě</span>
      <h1 class="reveal" data-d="1">Prémiová matcha<em>čerstvě našleháno.</em></h1>
      <p class="hero__sub reveal" data-d="2"><!-- verbatim legacy/template.html:358 --></p>
      <div class="hero__cta reveal" data-d="3"><!-- verbatim legacy/template.html:359-363 (both buttons incl. svg) --></div>
      <div class="hero__meta reveal" data-d="4"><!-- verbatim legacy/template.html:364-368 --></div>
    </div>
    <a href="#o-nas" class="scrollcue" aria-hidden="true"><span class="mouse"></span>scroll</a>
  </section>
```

(The `<!-- verbatim -->` comments above are instructions to YOU, the implementer — paste the actual v1 lines there; the committed file must contain the real Czech content, no comments. The v1 hero photo card, flag and price badge — `legacy/template.html:370-379` — are intentionally dropped in v2.)

About: copy `legacy/template.html:385-420` as the base, with these changes:
1. Replace `{{ABOUT_INTERIOR}}` img with a `<picture>`:

```html
<picture>
  <source type="image/avif" srcset="/img/post5_bar-480.avif 480w, /img/post5_bar-960.avif 960w" sizes="(min-width: 900px) 420px, 90vw">
  <source type="image/webp" srcset="/img/post5_bar-480.webp 480w, /img/post5_bar-960.webp 960w" sizes="(min-width: 900px) 420px, 90vw">
  <img src="/img/post5_bar-960.jpg" alt="Interiér matcha baru Tamatcha — barista podává ledovou matchu přes barový pult" width="420" height="560" loading="lazy">
</picture>
```

2. Replace the decorative `stroke-bg` SVG in `.about__media` (v1 lines 412-415) with the journey-line + leaves (new, complete):

```html
<svg class="about__journey draw" viewBox="0 0 400 400" fill="none" aria-hidden="true">
  <path d="M370 40 C 300 90 250 130 220 190 C 190 250 120 300 40 360" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="620" stroke-dashoffset="620" style="--len:620"/>
  <circle cx="370" cy="40" r="6" fill="currentColor"/>
  <circle cx="40" cy="360" r="6" fill="currentColor"/>
  <text x="330" y="26" fill="currentColor" font-size="14">Kagošima</text>
  <text x="52" y="384" fill="currentColor" font-size="14">Ostrava</text>
</svg>
<svg class="about__leaf" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22C10 6 26 2 38 2 34 14 20 24 2 22Z" fill="currentColor"/></svg>
<svg class="about__leaf" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22C10 6 26 2 38 2 34 14 20 24 2 22Z" fill="currentColor"/></svg>
<svg class="about__leaf" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22C10 6 26 2 38 2 34 14 20 24 2 22Z" fill="currentColor"/></svg>
```

- [ ] **Step 2: Write ritual + menu + gallery + visit + footer markup**

Ritual (new structure; heading and all step texts verbatim from `legacy/template.html:429-437`):

```html
<section class="section ritual" id="ritual">
  <div class="wrap">
    <div class="head reveal">
      <span class="eyebrow">Připraveno obřadně</span>
      <h2>Tři kroky k dokonalé matche</h2>
    </div>
    <div class="ritual__stage" aria-hidden="true"><canvas class="ritual__canvas"></canvas></div>
    <div class="steps">
      <div class="step reveal" data-step="0" data-d="1">
        <svg class="step__art" viewBox="0 0 120 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><ellipse cx="60" cy="28" rx="34" ry="8"/><path d="M26 28v6M94 28v6"/><g stroke-width="2" opacity=".7"><path d="M44 44v4M60 42v6M76 44v4M52 52v4M68 52v4"/></g><path d="M34 78q26 10 52 0" stroke-width="5"/></g></svg>
        <span class="step__n">Krok 01</span><h3>Prosíváme</h3><p><!-- verbatim legacy/template.html:434 --></p>
      </div>
      <div class="step reveal" data-step="1" data-d="2">
        <svg class="step__art" viewBox="0 0 120 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M60 8v22"/><path d="M48 30q12 26 0 44M60 30q4 26 0 44M72 30q-12 26 0 44" stroke-width="2"/><path d="M24 66q36 18 72 0" stroke-width="5"/><circle cx="44" cy="60" r="2.4" fill="currentColor"/><circle cx="70" cy="58" r="2.4" fill="currentColor"/><circle cx="58" cy="64" r="2.4" fill="currentColor"/></g></svg>
        <span class="step__n">Krok 02</span><h3>Šleháme</h3><p><!-- verbatim legacy/template.html:435 --></p>
      </div>
      <div class="step reveal" data-step="2" data-d="3">
        <svg class="step__art" viewBox="0 0 120 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M42 10h36l-4 70H46z"/><path d="M46 34h28" stroke-width="2"/><rect x="52" y="42" width="10" height="10" rx="2" stroke-width="2"/><rect x="60" y="56" width="10" height="10" rx="2" stroke-width="2"/><path d="M78 16q10-8 16-4" stroke-width="2"/></g></svg>
        <span class="step__n">Krok 03</span><h3>Podáváme</h3><p><!-- verbatim legacy/template.html:436 --></p>
      </div>
    </div>
  </div>
</section>
```

Menu: copy `legacy/template.html:442-489` unchanged, then insert as the FIRST child of each `<article class="mcard">` an fx layer (fizz/cloud/latte/yerba in v1 card order):

```html
<div class="mcard__fx fx-fizz" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
<div class="mcard__fx fx-cloud" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="mcard__fx fx-latte" aria-hidden="true"></div>
<div class="mcard__fx fx-yerba" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
```

Gallery: copy `legacy/template.html:492-513`, change the wrapper `<div class="ig__grid">` to `<div class="ig__strip" tabindex="0" aria-label="Galerie — posouvej šipkami">` (focusable so the strip is keyboard-scrollable, spec §9), and replace each `{{IG_*}}` img with a `<picture>` (same pattern as about; files per the Global Constraints mapping table; keep v1 alt texts; `sizes="(min-width: 700px) 340px, 72vw"`; width/height 340/340).

Visit + footer: copy `legacy/template.html:516-561` and `565-594` unchanged, replacing `{{LOGO}}` as in nav. Close `</main>` before the footer as v1 does. End body with:

```html
<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Write tokens.css and base.css**

Create `src/styles/index.css`:

```css
@import './fonts.css';
@import './tokens.css';
@import './base.css';
@import './sections.css';
```

Create `src/styles/tokens.css` — copy the entire `:root{...}` block verbatim from `legacy/template.html:3-30`.

Create `src/styles/base.css` — copy from `legacy/template.html` these blocks verbatim (they are between lines 31 and 318; find each by selector): the reset (`*,*::before,*::after`, `html`, `body`), `.wrap`, `.eyebrow`, `.head`, heading typography (`h1,h2,h3` rules), `.btn`/`.btn--primary`/`.btn--ghost`/`.btn--dark`, `.tnum`, `.pill`, `.reveal` + `.js .reveal` + `.reveal.in` + `data-d` delay rules, `.draw` stroke-dashoffset rules, and the `@media (prefers-reduced-motion: reduce)` block. Then append:

```css
/* v2: content must never be hidden before JS confirms itself */
html:not(.js) .reveal { opacity: 1; transform: none; }
```

- [ ] **Step 4: Build; write and run content e2e (JS on + JS off)**

Create `e2e/content.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

const MUST_HAVE = [
  'Prémiová matcha', 'čerstvě našleháno.', 'První matcha bar v Ostravě',
  'Z Kagošimy', 'Prosíváme', 'Šleháme', 'Podáváme',
  'Matcha Fizz', 'Matcha Cloud', 'Iced / Hot Matcha Latté', 'Iced Yerba Maté',
  'Na Hradbách 1481/6', '+420 605 000 456', 'Drink zdarma?',
  '© 2026 Tamatcha · Ostrava',
]

test('all v1 content present with JS', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('body').innerText()
  for (const s of MUST_HAVE) expect(text, `missing: ${s}`).toContain(s)
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.ig__tile')).toHaveCount(6)
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

`sections.css` doesn't exist yet — create an empty `src/styles/sections.css` so the import resolves. Run:

```bash
npm run build && npm run e2e
```

Expected: all tests pass (page is unstyled-ish but complete).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: full semantic index.html with v1 content, tokens+base styles, no-JS e2e"
```

---

### Task 4: Section CSS — styled static site (Tier C look)

**Files:**
- Modify: `src/styles/sections.css` (fill in), `src/styles/base.css` (only if a copied block was missed)
- Test: `e2e/visual.spec.ts`

**Interfaces:**
- Consumes: DOM from Task 3.
- Produces: fully styled static page; hero Tier C gradient (`.hero__bg`); `.hero--gl` canvas-fade hook and `.ritual--live` mode hooks that Tasks 7/9 toggle; `.ig__strip` (JS) vs grid (no-JS) layouts.

- [ ] **Step 1: Port v1 section styles**

Into `src/styles/sections.css`, copy verbatim from `legacy/template.html` (between lines 31–318) the style blocks for: `.nav` (all nav/burger rules), `.hero__text/.hero__sub/.hero__cta/.hero__meta/.scrollcue/.mouse` (skip `.hero__photo/.hero__flag/.hero__badge` — dropped), `.about` blocks, `.ritual/.steps/.step` blocks, `.menu/.mcard/.formula/.desc/.chips/.chip/.price/.menu__note`, `.ig` blocks (`.ig__tile`, `.glyph`, `.ig__foot`), `.visit/.info/.freecard/.mapcard/.grid-lines/.hours`, `.footer` blocks, and the responsive `@media` blocks that go with them.

- [ ] **Step 2: Add v2 hero + new-layout CSS**

Append to `sections.css`:

```css
/* ===== v2 hero: full-viewport liquid ===== */
.hero{position:relative;min-height:100svh;display:grid;align-items:center;overflow:hidden;color:var(--cream);background:var(--forest-2)}
.hero__bg{position:absolute;inset:0;background:
  radial-gradient(120% 90% at 18% 8%, var(--forest-3) 0%, transparent 60%),
  radial-gradient(90% 80% at 82% 92%, var(--matcha-deep) 0%, transparent 55%),
  radial-gradient(140% 120% at 60% 40%, var(--forest) 0%, var(--forest-2) 100%);
  background-size:180% 180%;animation:heroDrift 26s ease-in-out infinite alternate}
@keyframes heroDrift{to{background-position:100% 100%}}
.hero__canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .9s var(--ease)}
.hero--gl .hero__canvas{opacity:1}
.hero__scrim{position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 75% at 38% 55%, rgba(14,39,28,.6), rgba(14,39,28,.18) 62%, transparent)}
.hero__content{position:relative;z-index:2;padding-block:7rem 5rem;max-width:640px}
.hero__content .eyebrow{color:var(--matcha)}
.hero__content h1{color:var(--cream)}
.hero__content h1 em{display:block;font-style:normal;color:var(--matcha)}
.hero__sub{color:var(--cream-70)}
.hero__meta{color:var(--cream-70)}

/* ===== ritual: static art + live-mode stage ===== */
.step__art{width:96px;height:72px;color:var(--matcha-deep);margin-bottom:.6rem}
.ritual__stage{display:none}
.ritual--live .ritual__stage{display:block;position:relative;height:min(52vh,460px);border-radius:var(--r);overflow:hidden;background:var(--cream-2)}
.ritual--live .ritual__canvas{position:absolute;inset:0;width:100%;height:100%}
.ritual--live .step__art{display:none}
.ritual--live .steps{margin-top:1.2rem}
.ritual--live .step{opacity:.35;transition:opacity .3s var(--ease)}
.ritual--live .step.active{opacity:1}

/* ===== gallery: strip with JS, grid without ===== */
.js .ig__strip{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:1rem;cursor:grab;-webkit-overflow-scrolling:touch}
.js .ig__strip.dragging{cursor:grabbing;scroll-snap-type:none}
.js .ig__strip .ig__tile{flex:0 0 min(72vw,340px);scroll-snap-align:center}
html:not(.js) .ig__strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.ig__tile{border-radius:var(--r);overflow:hidden;display:block;position:relative}
.ig__tile img{width:100%;height:100%;aspect-ratio:1;object-fit:cover;display:block}

@media (prefers-reduced-motion: reduce){
  .hero__bg{animation:none}
}
```

(If a class used here duplicates a ported v1 rule, the v2 rule wins — keep v2 rules after the ported block, as written.)

- [ ] **Step 3: Screenshot e2e**

Create `e2e/visual.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

for (const vp of [{ w: 1280, h: 800, name: 'desktop' }, { w: 390, h: 844, name: 'mobile' }]) {
  test(`layout sane at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.goto('./?tier=c')
    // no horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.locator('.hero')).toBeVisible()
    await page.screenshot({ path: `test-results/${vp.name}-full.png`, fullPage: true })
  })
}
```

- [ ] **Step 4: Build, run e2e, eyeball screenshots**

```bash
npm run build && npm run e2e
```

Expected: pass. Open `test-results/desktop-full.png` and `mobile-full.png` — hero gradient in brand greens, all sections styled, footer oxblood bar present. Fix ported-CSS gaps if any section looks unstyled.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: full section styling, tier-C hero gradient, gallery strip/grid layouts"
```

---

### Task 5: Tier detection (`tiers.ts`) with unit tests

**Files:**
- Create: `src/tiers.ts`
- Test: `src/tiers.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Tier = 'a'|'b'|'c'`; `interface Caps { reducedMotion: boolean; webgl2: boolean; forcedTier: Tier | null }`; `readCaps(win: Window): Caps`; `decideTier(caps: Caps): Tier`. `main.ts` sets `document.documentElement.dataset.tier` and `window.__tamatcha.tier`.

- [ ] **Step 1: Write the failing unit tests**

Create `src/tiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { decideTier, type Caps } from './tiers'

const base: Caps = { reducedMotion: false, webgl2: true, forcedTier: null }

describe('decideTier', () => {
  it('defaults to tier a on capable devices', () => {
    expect(decideTier(base)).toBe('a')
  })
  it('reduced motion forces c', () => {
    expect(decideTier({ ...base, reducedMotion: true })).toBe('c')
  })
  it('no webgl2 forces c', () => {
    expect(decideTier({ ...base, webgl2: false })).toBe('c')
  })
  it('forced tier wins over everything', () => {
    expect(decideTier({ ...base, reducedMotion: true, forcedTier: 'b' })).toBe('b')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./tiers`.

- [ ] **Step 3: Implement**

Create `src/tiers.ts`:

```ts
export type Tier = 'a' | 'b' | 'c'

export interface Caps {
  reducedMotion: boolean
  webgl2: boolean
  forcedTier: Tier | null
}

export function readCaps(win: Window): Caps {
  const q = new URLSearchParams(win.location.search).get('tier')
  const canvas = win.document.createElement('canvas')
  return {
    reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
    webgl2: !!canvas.getContext('webgl2'),
    forcedTier: q === 'a' || q === 'b' || q === 'c' ? q : null,
  }
}

export function decideTier(caps: Caps): Tier {
  if (caps.forcedTier) return caps.forcedTier
  if (caps.reducedMotion || !caps.webgl2) return 'c'
  return 'a'
}
```

Replace `src/main.ts` with:

```ts
import { readCaps, decideTier } from './tiers'

document.documentElement.classList.add('js')

const caps = readCaps(window)
const tier = decideTier(caps)
document.documentElement.dataset.tier = tier
window.__tamatcha = { tier, frames: 0, splats: 0, ritualStep: -1, ritualRange: null }

export const reduced = caps.reducedMotion
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test` → 4 passed. Then `npm run build && npm run e2e` → still green.

- [ ] **Step 5: Commit**

```bash
git add src/tiers.ts src/tiers.test.ts src/main.ts
git commit -m "feat: tier detection with query override and unit tests"
```

---

### Task 6: Scroll system — Lenis + GSAP reveals, nav state, anchors

**Files:**
- Create: `src/scroll.ts`
- Modify: `src/main.ts`, `src/styles/sections.css`
- Test: `e2e/scroll.spec.ts`

**Interfaces:**
- Consumes: `reduced` flag pattern from Task 5; `.reveal`/`.draw`/`.nav` hooks from Tasks 3–4.
- Produces: `initScroll(reduced: boolean): void` — registers ScrollTrigger (all later modules may `import gsap from 'gsap'` + `import { ScrollTrigger } from 'gsap/ScrollTrigger'` and use it, plugin registration is idempotent); Lenis instance handles anchor clicks; `.reveal` elements get `.in` when scrolled into view; `.nav` gets `.nav--scrolled` past 80px.

- [ ] **Step 1: Implement scroll.ts**

Create `src/scroll.ts`:

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

export function initScroll(reduced: boolean): void {
  gsap.registerPlugin(ScrollTrigger)

  const reveals = gsap.utils.toArray<HTMLElement>('.reveal, .draw')

  if (reduced) {
    reveals.forEach((el) => el.classList.add('in'))
    return
  }

  const lenis = new Lenis({ lerp: 0.12 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href')!)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: -72 })
    })
  })

  reveals.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => el.classList.add('in'),
    })
  })

  const nav = document.getElementById('nav')
  if (nav) {
    ScrollTrigger.create({
      start: 80,
      end: 'max',
      onToggle: (self) => nav.classList.toggle('nav--scrolled', self.isActive),
    })
  }

  // active-section highlight in nav
  document.querySelectorAll<HTMLElement>('main section[id]').forEach((section) => {
    const link = document.querySelector(`.nav__links a[href="#${section.id}"]`)
    if (!link) return
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => link.classList.toggle('active', self.isActive),
    })
  })
}
```

Append to `src/main.ts`:

```ts
async function boot() {
  const { initScroll } = await import('./scroll')
  initScroll(reduced)
}
boot()
```

Append to `src/styles/sections.css`:

```css
.nav--scrolled{background:rgba(14,39,28,.82);backdrop-filter:blur(10px)}
.nav__links a.active{color:var(--matcha)}
/* about copy: mask reveal (clip sweep) instead of plain fade */
.about__copy .reveal{clip-path:inset(0 0 100% 0)}
.about__copy .reveal.in{clip-path:inset(0 0 -8% 0);transition:clip-path 1s var(--ease),opacity .6s var(--ease),transform .8s var(--ease)}
html:not(.js) .about__copy .reveal{clip-path:none}
@media (prefers-reduced-motion: reduce){.about__copy .reveal{clip-path:none}}
```

(If the ported v1 nav already has a scrolled treatment under a different class, replace its class name with `nav--scrolled`.)

- [ ] **Step 2: e2e**

Create `e2e/scroll.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('reveals appear on scroll', async ({ page }) => {
  await page.goto('./?tier=c')
  const step = page.locator('.step[data-step="2"]')
  await expect(step).not.toHaveClass(/\bin\b/)
  await step.scrollIntoViewIfNeeded()
  await expect(step).toHaveClass(/\bin\b/)
})

test('reduced motion: everything visible immediately, native scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'c')
  const notIn = await page.locator('.reveal:not(.in)').count()
  expect(notIn).toBe(0)
})

test('nav gains scrolled state', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.evaluate(() => window.scrollTo(0, 600))
  await expect(page.locator('#nav')).toHaveClass(/nav--scrolled/)
})
```

- [ ] **Step 3: Build + run, verify pass**

```bash
npm run build && npm run e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Lenis+ScrollTrigger scroll system, reveals, nav state, anchor smoothing"
```

---

### Task 7: WebGL2 fluid simulation (Tier A core)

**Files:**
- Create: `src/fluid/shaders.ts`, `src/fluid/sim.ts`
- Test: `e2e/hero.spec.ts` (first half)
- Modify: `src/main.ts` (hero wiring comes in Task 8 — this task only exposes the classes; a temporary boot hook proves it renders)

**Interfaces:**
- Consumes: nothing outside `src/fluid/`.
- Produces:
  - `shaders.ts`: `export const VERT, ADVECTION, DIVERGENCE, CURL, VORTICITY, PRESSURE, GRADIENT_SUBTRACT, SPLAT, CLEAR, DISPLAY, RAMP_GLSL: string`
  - `sim.ts`: `export interface Quality { simRes: number; dyeRes: number }`, `export const HIGH: Quality = { simRes: 144, dyeRes: 512 }`, `export const LOW: Quality = { simRes: 96, dyeRes: 384 }`, and
    `export class FluidSim { constructor(canvas: HTMLCanvasElement, quality?: Quality); splat(x: number, y: number, dx: number, dy: number, amount: number): void; frame(dtMs: number): void; setQuality(q: Quality): void; resize(): void; destroy(): void }`
    — `x,y` in [0,1] with origin bottom-left; `dx,dy` in velocity units (~hundreds); `amount` is dye density (0.05–0.5). Constructor **throws** if WebGL2 or `EXT_color_buffer_float` is unavailable (Task 8 catches this to fall back).

- [ ] **Step 1: Write shaders.ts**

Create `src/fluid/shaders.ts`:

```ts
export const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const HEADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 texelSize;`

export const ADVECTION = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  fragColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`

export const DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, texelSize.y)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`

export const CURL = `${HEADER}
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vUv - vec2(texelSize.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(texelSize.x, 0.0)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, texelSize.y)).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`

export const VORTICITY = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture(uCurl, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uCurl, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uCurl, vUv + vec2(0.0, texelSize.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force = force / (length(force) + 0.0001) * curl * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy + force * dt;
  fragColor = vec4(velocity, 0.0, 1.0);
}`

export const PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, texelSize.y)).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`

export const GRADIENT_SUBTRACT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, texelSize.y)).x;
  vec2 velocity = texture(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`

export const SPLAT = `${HEADER}
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`

export const CLEAR = `${HEADER}
uniform sampler2D uTexture;
uniform float value;
void main () {
  fragColor = value * texture(uTexture, vUv);
}`

// brand color ramp: forest-2 -> forest -> matcha-deep -> matcha -> cream
export const RAMP_GLSL = `
vec3 matchaRamp (float t) {
  vec3 c0 = vec3(0.055, 0.153, 0.110);
  vec3 c1 = vec3(0.094, 0.227, 0.173);
  vec3 c2 = vec3(0.369, 0.541, 0.204);
  vec3 c3 = vec3(0.561, 0.725, 0.294);
  vec3 c4 = vec3(0.925, 0.902, 0.843);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.55) return mix(c1, c2, (t - 0.25) / 0.30);
  if (t < 0.85) return mix(c2, c3, (t - 0.55) / 0.30);
  return mix(c3, c4, (t - 0.85) / 0.15);
}`

export const DISPLAY = `${HEADER}
uniform sampler2D uDye;
${RAMP_GLSL}
float grain (vec2 p) {
  return fract(sin(dot(p * 913.0, vec2(12.9898, 78.233))) * 43758.5453);
}
void main () {
  float d = clamp(texture(uDye, vUv).x, 0.0, 1.0);
  vec3 col = matchaRamp(d);
  fragColor = vec4(col + (grain(vUv) - 0.5) * 0.03, 1.0);
}`
```

- [ ] **Step 2: Write sim.ts**

Create `src/fluid/sim.ts`:

```ts
import * as S from './shaders'

export interface Quality { simRes: number; dyeRes: number }
export const HIGH: Quality = { simRes: 144, dyeRes: 512 }
export const LOW: Quality = { simRes: 96, dyeRes: 384 }

const VELOCITY_DISSIPATION = 0.6 // thick liquid: swirls slow down
const DYE_DISSIPATION = 0.12     // color lingers
const CURL_STRENGTH = 14
const PRESSURE_DECAY = 0.8
const PRESSURE_ITERATIONS = 20
const SPLAT_RADIUS = 0.0035

interface FBO {
  fb: WebGLFramebuffer; tex: WebGLTexture
  w: number; h: number; texelX: number; texelY: number
}
interface DoubleFBO { read: FBO; write: FBO; swap(): void }

class Program {
  prog: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null> = {}
  constructor(private gl: WebGL2RenderingContext, frag: string) {
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed')
      return sh
    }
    this.prog = gl.createProgram()!
    gl.attachShader(this.prog, compile(gl.VERTEX_SHADER, S.VERT))
    gl.attachShader(this.prog, compile(gl.FRAGMENT_SHADER, frag))
    gl.linkProgram(this.prog)
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(this.prog) ?? 'link failed')
    const n = gl.getProgramParameter(this.prog, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(this.prog, i)!.name
      this.uniforms[name] = gl.getUniformLocation(this.prog, name)
    }
  }
  use() { this.gl.useProgram(this.prog) }
}

export class FluidSim {
  private gl: WebGL2RenderingContext
  private quality: Quality
  private velocity!: DoubleFBO
  private dye!: DoubleFBO
  private pressure!: DoubleFBO
  private divergence!: FBO
  private curl!: FBO
  private p: Record<string, Program>
  private vao: WebGLVertexArrayObject
  private destroyed = false

  constructor(private canvas: HTMLCanvasElement, quality: Quality = HIGH) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, depth: false, stencil: false, antialias: false,
    })
    if (!gl) throw new Error('no webgl2')
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float render targets')
    this.gl = gl
    this.quality = quality

    // fullscreen quad
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    this.p = {
      advection: new Program(gl, S.ADVECTION),
      divergence: new Program(gl, S.DIVERGENCE),
      curl: new Program(gl, S.CURL),
      vorticity: new Program(gl, S.VORTICITY),
      pressure: new Program(gl, S.PRESSURE),
      gradient: new Program(gl, S.GRADIENT_SUBTRACT),
      splat: new Program(gl, S.SPLAT),
      clear: new Program(gl, S.CLEAR),
      display: new Program(gl, S.DISPLAY),
    }
    this.resize()
  }

  private createFBO(w: number, h: number, internal: number, format: number): FBO {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { fb, tex, w, h, texelX: 1 / w, texelY: 1 / h }
  }

  private createDouble(w: number, h: number, internal: number, format: number): DoubleFBO {
    let a = this.createFBO(w, h, internal, format)
    let b = this.createFBO(w, h, internal, format)
    return {
      get read() { return a }, get write() { return b },
      swap() { const t = a; a = b; b = t },
    } as DoubleFBO
  }

  resize(): void {
    const gl = this.gl
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    const aspect = w / h
    const simH = this.quality.simRes
    const simW = Math.round(simH * aspect)
    const dyeH = this.quality.dyeRes
    const dyeW = Math.round(dyeH * aspect)
    this.velocity = this.createDouble(simW, simH, gl.RG16F, gl.RG)
    this.pressure = this.createDouble(simW, simH, gl.R16F, gl.RED)
    this.divergence = this.createFBO(simW, simH, gl.R16F, gl.RED)
    this.curl = this.createFBO(simW, simH, gl.R16F, gl.RED)
    this.dye = this.createDouble(dyeW, dyeH, gl.R16F, gl.RED)
  }

  setQuality(q: Quality): void {
    this.quality = q
    this.resize()
  }

  private blit(target: FBO | null): void {
    const gl = this.gl
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb)
      gl.viewport(0, 0, target.w, target.h)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private bindTex(unit: number, tex: WebGLTexture): number {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    return unit
  }

  splat(x: number, y: number, dx: number, dy: number, amount: number): void {
    if (this.destroyed) return
    const gl = this.gl
    const aspect = this.canvas.width / this.canvas.height
    const sp = this.p.splat
    sp.use()
    gl.uniform1f(sp.uniforms.aspectRatio, aspect)
    gl.uniform2f(sp.uniforms.point, x, y)
    gl.uniform1f(sp.uniforms.radius, SPLAT_RADIUS)
    // velocity splat
    gl.uniform1i(sp.uniforms.uTarget, this.bindTex(0, this.velocity.read.tex))
    gl.uniform2f(sp.uniforms.texelSize, this.velocity.read.texelX, this.velocity.read.texelY)
    gl.uniform3f(sp.uniforms.color, dx, dy, 0)
    this.blit(this.velocity.write); this.velocity.swap()
    // dye splat (density in red channel)
    gl.uniform1i(sp.uniforms.uTarget, this.bindTex(0, this.dye.read.tex))
    gl.uniform2f(sp.uniforms.texelSize, this.dye.read.texelX, this.dye.read.texelY)
    gl.uniform3f(sp.uniforms.color, amount, 0, 0)
    this.blit(this.dye.write); this.dye.swap()
    window.__tamatcha.splats++
  }

  frame(dtMs: number): void {
    if (this.destroyed) return
    const gl = this.gl
    const dt = Math.min(Math.max(dtMs / 1000, 0.008), 0.033)
    const v = this.velocity

    // curl + vorticity confinement
    this.p.curl.use()
    gl.uniform2f(this.p.curl.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.curl.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    this.blit(this.curl)

    this.p.vorticity.use()
    gl.uniform2f(this.p.vorticity.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.vorticity.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    gl.uniform1i(this.p.vorticity.uniforms.uCurl, this.bindTex(1, this.curl.tex))
    gl.uniform1f(this.p.vorticity.uniforms.curl, CURL_STRENGTH)
    gl.uniform1f(this.p.vorticity.uniforms.dt, dt)
    this.blit(v.write); v.swap()

    // divergence + pressure solve
    this.p.divergence.use()
    gl.uniform2f(this.p.divergence.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.divergence.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    this.blit(this.divergence)

    this.p.clear.use()
    gl.uniform2f(this.p.clear.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.clear.uniforms.uTexture, this.bindTex(0, this.pressure.read.tex))
    gl.uniform1f(this.p.clear.uniforms.value, PRESSURE_DECAY)
    this.blit(this.pressure.write); this.pressure.swap()

    this.p.pressure.use()
    gl.uniform2f(this.p.pressure.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.pressure.uniforms.uDivergence, this.bindTex(1, this.divergence.tex))
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(this.p.pressure.uniforms.uPressure, this.bindTex(0, this.pressure.read.tex))
      this.blit(this.pressure.write); this.pressure.swap()
    }

    this.p.gradient.use()
    gl.uniform2f(this.p.gradient.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.gradient.uniforms.uPressure, this.bindTex(0, this.pressure.read.tex))
    gl.uniform1i(this.p.gradient.uniforms.uVelocity, this.bindTex(1, v.read.tex))
    this.blit(v.write); v.swap()

    // advect velocity, then dye
    this.p.advection.use()
    gl.uniform2f(this.p.advection.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1f(this.p.advection.uniforms.dt, dt)
    gl.uniform1i(this.p.advection.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    gl.uniform1i(this.p.advection.uniforms.uSource, this.bindTex(0, v.read.tex))
    gl.uniform1f(this.p.advection.uniforms.dissipation, VELOCITY_DISSIPATION)
    this.blit(v.write); v.swap()

    gl.uniform1i(this.p.advection.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    gl.uniform1i(this.p.advection.uniforms.uSource, this.bindTex(1, this.dye.read.tex))
    gl.uniform1f(this.p.advection.uniforms.dissipation, DYE_DISSIPATION)
    this.blit(this.dye.write); this.dye.swap()

    // composite to screen through the matcha ramp
    // (texelSize is unused in DISPLAY and may be optimized out — do not set it)
    this.p.display.use()
    gl.uniform1i(this.p.display.uniforms.uDye, this.bindTex(0, this.dye.read.tex))
    this.blit(null)
    window.__tamatcha.frames++
  }

  destroy(): void {
    this.destroyed = true
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
```

Note: the advection of velocity samples `uVelocity` and `uSource` from the same texture unit — that is intentional (both uniforms bound to unit 0 holding velocity).

- [ ] **Step 3: Temporary boot hook to see it live**

Append to `src/main.ts` `boot()` (temporary, replaced in Task 8):

```ts
if (tier === 'a') {
  const { FluidSim } = await import('./fluid/sim')
  const canvas = document.querySelector<HTMLCanvasElement>('.hero__canvas')!
  try {
    const sim = new FluidSim(canvas)
    document.querySelector('.hero')!.classList.add('hero--gl')
    let last = performance.now()
    let t = 0
    const loop = (now: number) => {
      const dt = now - last; last = now; t += dt / 1000
      const a = t * 0.5
      sim.splat(0.5 + Math.cos(a) * 0.25, 0.5 + Math.sin(a * 0.9) * 0.2,
        -Math.sin(a) * 220, Math.cos(a * 0.9) * 200, 0.14)
      sim.frame(dt)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  } catch { /* tier b/c handled in Task 8 */ }
}
```

- [ ] **Step 4: e2e — fluid renders and advances**

Create `e2e/hero.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('tier a: fluid sim runs and advances frames', async ({ page }) => {
  await page.goto('./?tier=a')
  await expect(page.locator('.hero--gl')).toHaveCount(1)
  await page.waitForFunction(() => window.__tamatcha.frames > 10)
  const f1 = await page.evaluate(() => window.__tamatcha.frames)
  await page.waitForTimeout(400)
  const f2 = await page.evaluate(() => window.__tamatcha.frames)
  expect(f2).toBeGreaterThan(f1)
  await page.locator('.hero').screenshot({ path: 'test-results/hero-tier-a.png' })
})

test('tier c: no GL canvas activated', async ({ page }) => {
  await page.goto('./?tier=c')
  await expect(page.locator('.hero--gl')).toHaveCount(0)
})
```

- [ ] **Step 5: Verify visually + run tests**

```bash
npm run dev   # open http://localhost:5173/tamatcha/?tier=a — green liquid slowly swirling in hero
npm run build && npm run e2e
```

Expected: swirling matcha-colored fluid; all e2e pass. If headless WebGL fails in your environment, run `npm run e2e -- --headed` to confirm, and note it — do not delete the test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: WebGL2 Navier-Stokes fluid sim with matcha color ramp"
```

---

### Task 8: Hero orchestration — whisk idle, pointer stir, benchmark fallback, Tier B shader

**Files:**
- Create: `src/fluid/hero.ts`, `src/fluid/noise.ts`
- Modify: `src/main.ts` (replace Task 7 temporary hook)
- Test: `e2e/hero.spec.ts` (extend)

**Interfaces:**
- Consumes: `FluidSim`, `HIGH`, `LOW` from `src/fluid/sim` (Task 7); `RAMP_GLSL`, `VERT` from `src/fluid/shaders`; `Tier` from `src/tiers`; gsap/ScrollTrigger (registered by Task 6).
- Produces: `initHero(tier: Tier): void` in `src/fluid/hero.ts` — mounts fluid (a) or noise (b), or does nothing (c); on any GL failure downgrades `document.documentElement.dataset.tier` and falls through a→b→c. `src/fluid/noise.ts` exports `startNoise(hero: HTMLElement, canvas: HTMLCanvasElement): () => void` (returns teardown; throws if GL unavailable; increments `window.__tamatcha.frames`).

- [ ] **Step 1: Tier B noise shader**

Create `src/fluid/noise.ts`:

```ts
import { VERT, RAMP_GLSL } from './shaders'

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uPointer;
uniform float uAspect;
${RAMP_GLSL}
float hash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise (vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm (vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void main () {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 q = vec2(fbm(p * 2.6 + uTime * 0.05), fbm(p * 2.6 - uTime * 0.04));
  vec2 pd = (uPointer - vUv) * vec2(uAspect, 1.0);
  float ripple = exp(-dot(pd, pd) * 26.0) * 0.30;
  float d = fbm(p * 2.0 + q * 1.7 + uTime * 0.02) * 0.9 + ripple;
  fragColor = vec4(matchaRamp(clamp(d, 0.0, 1.0)), 1.0);
}`

export function startNoise(hero: HTMLElement, canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false })
  if (!gl) throw new Error('no webgl2')

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src); gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('compile failed')
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed')
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const uTime = gl.getUniformLocation(prog, 'uTime')
  const uPointer = gl.getUniformLocation(prog, 'uPointer')
  const uAspect = gl.getUniformLocation(prog, 'uAspect')

  let px = 0.5, py = 0.5, tx = 0.5, ty = 0.5
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    tx = (e.clientX - r.left) / r.width
    ty = 1 - (e.clientY - r.top) / r.height
  }
  hero.addEventListener('pointermove', onMove)

  let running = true
  let raf = 0
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  resize()
  window.addEventListener('resize', resize)

  const t0 = performance.now()
  const loop = (now: number) => {
    if (!running) return
    px += (tx - px) * 0.06; py += (ty - py) * 0.06
    gl.uniform1f(uTime, (now - t0) / 1000)
    gl.uniform2f(uPointer, px, py)
    gl.uniform1f(uAspect, canvas.width / Math.max(canvas.height, 1))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    window.__tamatcha.frames++
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    hero.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', resize)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
```

- [ ] **Step 2: Hero orchestrator**

Create `src/fluid/hero.ts`:

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Tier } from '../tiers'
import { startNoise } from './noise'

const WARMUP_FRAMES = 30
const SAMPLE_FRAMES = 40
const BAD_FRAME_MS = 22

export function initHero(tier: Tier): void {
  gsap.registerPlugin(ScrollTrigger)
  const hero = document.querySelector<HTMLElement>('.hero')
  const canvas = hero?.querySelector<HTMLCanvasElement>('.hero__canvas')
  if (!hero || !canvas || tier === 'c') return

  const setTier = (t: Tier) => {
    document.documentElement.dataset.tier = t
    window.__tamatcha.tier = t
  }

  const mountNoise = () => {
    try {
      startNoise(hero, canvas)
      hero.classList.add('hero--gl')
      setTier('b')
      fadeOnScroll(hero, canvas)
    } catch {
      setTier('c')
      hero.classList.remove('hero--gl')
    }
  }

  if (tier === 'b') { mountNoise(); return }
  startFluid(hero, canvas, mountNoise, setTier)
}

function fadeOnScroll(hero: HTMLElement, canvas: HTMLCanvasElement): void {
  gsap.to(canvas, {
    opacity: 0.12, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  })
}

async function startFluid(
  hero: HTMLElement, canvas: HTMLCanvasElement,
  fallback: () => void, setTier: (t: Tier) => void,
): Promise<void> {
  let quality: 'high' | 'low' = 'high'
  const mod = await import('./sim')
  const sim = (() => {
    try { return new mod.FluidSim(canvas, mod.HIGH) } catch { return null }
  })()
  if (!sim) {
    fallback()
    return
  }
  hero.classList.add('hero--gl')
  setTier('a')
  fadeOnScroll(hero, canvas)

  // pointer stir: listener on the SECTION so text overlay doesn't block it
  let lastX = 0, lastY = 0, hasLast = false
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = 1 - (e.clientY - r.top) / r.height
    if (hasLast) {
      const dx = (x - lastX) * 900
      const dy = (y - lastY) * 900
      if (Math.abs(dx) + Math.abs(dy) > 0.5) sim.splat(x, y, dx, dy, 0.22)
    }
    lastX = x; lastY = y; hasLast = true
  })
  hero.addEventListener('pointerleave', () => { hasLast = false })

  // pause when hero off-screen or tab hidden
  let visible = true, pageVisible = true
  new IntersectionObserver((ents) => { visible = ents[0].isIntersecting }).observe(hero)
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden })
  window.addEventListener('resize', () => sim.resize())

  // benchmark state
  let frameCount = 0
  let sampleSum = 0
  let downgraded = false

  let last = performance.now()
  let t = 0
  const loop = (now: number) => {
    const dt = now - last; last = now
    if (!visible || !pageVisible) { requestAnimationFrame(loop); return }
    t += dt / 1000

    // idle whisk: slow precessing stir
    const a = t * 0.45
    const cx = 0.5 + Math.cos(a) * 0.26
    const cy = 0.5 + Math.sin(a * 0.83) * 0.2
    sim.splat(cx, cy, -Math.sin(a) * 190, Math.cos(a * 0.83) * 170, 0.1)

    sim.frame(dt)

    // benchmark: after warmup, average SAMPLE_FRAMES frame times
    frameCount++
    if (frameCount > WARMUP_FRAMES && frameCount <= WARMUP_FRAMES + SAMPLE_FRAMES) {
      sampleSum += dt
      if (frameCount === WARMUP_FRAMES + SAMPLE_FRAMES) {
        const avg = sampleSum / SAMPLE_FRAMES
        if (avg > BAD_FRAME_MS) {
          if (quality === 'high' && !downgraded) {
            quality = 'low'; downgraded = true
            sim.setQuality(mod.LOW)
            frameCount = 0; sampleSum = 0 // re-benchmark at low quality
          } else {
            sim.destroy()
            fallback()
            return
          }
        }
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
```

- [ ] **Step 3: Replace the temporary hook in main.ts**

In `src/main.ts`, delete the Task 7 temporary `if (tier === 'a') {...}` block and make `boot()`:

```ts
async function boot() {
  const { initScroll } = await import('./scroll')
  initScroll(reduced)
  const { initHero } = await import('./fluid/hero')
  initHero(tier)
}
boot()
```

- [ ] **Step 4: Extend hero e2e**

Append to `e2e/hero.spec.ts`:

```ts
test('tier b: noise shader runs', async ({ page }) => {
  await page.goto('./?tier=b')
  await expect(page.locator('.hero--gl')).toHaveCount(1)
  await page.waitForFunction(() => window.__tamatcha.frames > 10)
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'b')
  await page.locator('.hero').screenshot({ path: 'test-results/hero-tier-b.png' })
})

test('tier a: pointer movement stirs (splats increase)', async ({ page }) => {
  await page.goto('./?tier=a')
  await page.waitForFunction(() => window.__tamatcha.frames > 10)
  const s1 = await page.evaluate(() => window.__tamatcha.splats)
  await page.mouse.move(300, 300)
  await page.mouse.move(600, 400, { steps: 20 })
  const s2 = await page.evaluate(() => window.__tamatcha.splats)
  expect(s2).toBeGreaterThan(s1)
})
```

- [ ] **Step 5: Verify + run**

```bash
npm run dev   # check: idle whisk swirl; mouse drag stirs; scroll fades canvas
npm run build && npm run e2e
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: hero orchestration — idle whisk, pointer stir, benchmark fallback, tier-B noise"
```

---

### Task 9: Rituál — pinned scroll-scrubbed canvas scene

**Files:**
- Create: `src/scenes/ritual.ts`
- Modify: `src/main.ts`
- Test: `e2e/ritual.spec.ts`

**Interfaces:**
- Consumes: `#ritual` DOM from Task 3, `.ritual--live` CSS from Task 4, gsap/ScrollTrigger.
- Produces: `initRitual(reduced: boolean): void`. Updates `window.__tamatcha.ritualStep` (0/1/2 = active chapter, -1 = not initialized) and `window.__tamatcha.ritualRange = [start, end]` scroll positions of the pin (for tests).

- [ ] **Step 1: Implement the scene**

Create `src/scenes/ritual.ts`:

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const C = {
  forest: '#183A2C', forest2: '#0E271C', forest3: '#21503C',
  matcha: '#8FB94B', matchaDeep: '#5E8A34',
  cream: '#ECE6D7', cream2: '#F4EFE4', ink: '#1B241E',
}

interface Particle { x: number; y: number; r: number; speed: number; drift: number }

function makeParticles(n: number, seed: number): Particle[] {
  // deterministic pseudo-random so scrubbing backwards looks identical
  let s = seed
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  return Array.from({ length: n }, () => ({
    x: rnd(), y: rnd(), r: 1 + rnd() * 2.2, speed: 0.6 + rnd() * 0.8, drift: (rnd() - 0.5) * 0.2,
  }))
}

export function createRitualRenderer(canvas: HTMLCanvasElement): (progress: number) => void {
  const ctx = canvas.getContext('2d')!
  const powder = makeParticles(90, 7)
  const foam = makeParticles(40, 13)

  return (progress: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = C.cream2
    ctx.fillRect(0, 0, w, h)

    const chapter = Math.min(Math.floor(progress), 2)
    const local = progress - chapter
    const cx = w / 2

    if (chapter === 0) drawSift(ctx, w, h, cx, local, powder)
    else if (chapter === 1) drawWhisk(ctx, w, h, cx, local, foam)
    else drawServe(ctx, w, h, cx, local)

    window.__tamatcha.ritualStep = chapter
  }

  function drawBowl(ctx: CanvasRenderingContext2D, cx: number, by: number, bw: number, bh: number) {
    ctx.strokeStyle = C.forest; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - bw / 2, by)
    ctx.quadraticCurveTo(cx, by + bh, cx + bw / 2, by)
    ctx.stroke()
  }

  function drawSift(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, t: number, ps: Particle[]) {
    // sieve
    ctx.strokeStyle = C.forest; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.ellipse(cx, h * 0.2, w * 0.14, h * 0.035, 0, 0, Math.PI * 2); ctx.stroke()
    // falling powder: each particle falls once, staggered by its x as delay
    ctx.fillStyle = C.matchaDeep
    for (const p of ps) {
      const delay = p.x * 0.55
      const fall = Math.min(Math.max((t - delay) / 0.45, 0), 1)
      if (fall <= 0) continue
      const px = cx + (p.y - 0.5) * w * 0.24 + p.drift * 40 * fall
      const py = h * 0.24 + fall * (h * 0.5)
      ctx.globalAlpha = 1 - fall * 0.25
      ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    // accumulating pile
    const pile = t * h * 0.045
    ctx.fillStyle = C.matchaDeep
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.76, w * 0.12 * Math.min(t * 1.6, 1), pile, 0, Math.PI, 0)
    ctx.fill()
    drawBowl(ctx, cx, h * 0.76, w * 0.34, h * 0.16)
  }

  function drawWhisk(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, t: number, foam: Particle[]) {
    // liquid rises with t
    const level = h * (0.76 - t * 0.1)
    ctx.fillStyle = C.matcha
    ctx.beginPath()
    ctx.ellipse(cx, (level + h * 0.78) / 2, w * 0.15, (h * 0.78 - level) / 2 + 8, 0, 0, Math.PI * 2)
    ctx.fill()
    // swirl lines rotating with t
    ctx.strokeStyle = C.matchaDeep; ctx.lineWidth = 2.5
    const spin = t * Math.PI * 14
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(cx, (level + h * 0.78) / 2, w * (0.05 + i * 0.035), h * 0.02,
        spin + (i * Math.PI) / 3, 0, Math.PI * 1.4)
      ctx.stroke()
    }
    // chasen whisk: handle + tines, oscillating horizontally
    const wx = cx + Math.sin(spin) * w * 0.05
    ctx.strokeStyle = C.forest; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(wx, h * 0.12); ctx.lineTo(wx, h * 0.42); ctx.stroke()
    ctx.lineWidth = 2
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(wx, h * 0.42)
      ctx.quadraticCurveTo(wx + i * 9, h * 0.52, wx + i * 7, level - 4)
      ctx.stroke()
    }
    // foam bubbles appear near surface as t grows
    ctx.fillStyle = C.cream
    for (const f of foam) {
      if (f.x > t) continue
      const fx = cx + (f.y - 0.5) * w * 0.24
      const fy = level - 4 - f.drift * 30
      ctx.globalAlpha = 0.85
      ctx.beginPath(); ctx.arc(fx, fy, f.r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    drawBowl(ctx, cx, h * 0.78, w * 0.34, h * 0.16)
  }

  function drawServe(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, t: number) {
    const gx = cx + w * 0.12
    // glass
    ctx.strokeStyle = C.forest; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.strokeRect(gx - w * 0.07, h * 0.3, w * 0.14, h * 0.46)
    // tilting bowl pouring (fades out as glass fills)
    const bowlA = Math.min(t * 2, 1)
    ctx.save()
    ctx.translate(cx - w * 0.14, h * 0.28)
    ctx.rotate(0.5 + bowlA * 0.35)
    ctx.globalAlpha = 1 - Math.max(t - 0.7, 0) / 0.3
    drawBowl(ctx, 0, 0, w * 0.2, h * 0.1)
    ctx.restore()
    // pour stream
    if (t < 0.85) {
      ctx.strokeStyle = C.matcha; ctx.lineWidth = 5
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.06, h * 0.3)
      ctx.quadraticCurveTo(gx - w * 0.02, h * 0.34, gx, h * 0.42)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // fill level
    const fill = t * h * 0.4
    ctx.fillStyle = C.matcha
    ctx.fillRect(gx - w * 0.07 + 3, h * 0.76 - fill, w * 0.14 - 6, fill)
    // ice cubes bobbing in the filled part
    ctx.strokeStyle = C.cream; ctx.lineWidth = 3
    if (fill > 30) {
      ctx.strokeRect(gx - w * 0.03, h * 0.76 - fill + 10, 16, 16)
      ctx.strokeRect(gx + w * 0.01, h * 0.76 - fill + 34, 14, 14)
    }
    // garnish leaf at the very end
    if (t > 0.9) {
      ctx.fillStyle = C.matchaDeep
      ctx.beginPath()
      ctx.ellipse(gx, h * 0.27, 14, 6, -0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function initRitual(reduced: boolean): void {
  const section = document.querySelector<HTMLElement>('#ritual')
  const canvas = section?.querySelector<HTMLCanvasElement>('.ritual__canvas')
  if (!section || !canvas || reduced) return // reduced: keep static step cards + SVGs

  gsap.registerPlugin(ScrollTrigger)
  section.classList.add('ritual--live')
  const draw = createRitualRenderer(canvas)
  const steps = Array.from(section.querySelectorAll<HTMLElement>('.step'))
  steps.forEach((s) => s.classList.add('in')) // captions handled by active state, not reveal

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: 0.4,
    onRefresh: (self) => { window.__tamatcha.ritualRange = [self.start, self.end] },
    onUpdate: (self) => {
      const progress = self.progress * 3
      draw(Math.min(progress, 2.999))
      const chapter = Math.min(Math.floor(progress), 2)
      steps.forEach((s, i) => s.classList.toggle('active', i === chapter))
    },
  })
  draw(0)
  window.__tamatcha.ritualRange = [st.start, st.end]
}
```

- [ ] **Step 2: Wire into boot**

Append inside `boot()` in `src/main.ts`:

```ts
const { initRitual } = await import('./scenes/ritual')
initRitual(reduced)
```

- [ ] **Step 3: e2e — scrub forward and back**

Create `e2e/ritual.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

async function scrollToRitual(page: import('@playwright/test').Page, frac: number) {
  await page.evaluate((f) => {
    const [start, end] = window.__tamatcha.ritualRange!
    window.scrollTo(0, start + (end - start) * f)
  }, frac)
  await page.waitForTimeout(600) // let Lenis/ScrollTrigger settle
}

test('ritual scene scrubs through chapters both directions', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.waitForFunction(() => window.__tamatcha.ritualRange !== null)
  await scrollToRitual(page, 0.5) // middle => chapter 1 (Šleháme)
  expect(await page.evaluate(() => window.__tamatcha.ritualStep)).toBe(1)
  await expect(page.locator('.step[data-step="1"]')).toHaveClass(/active/)
  await scrollToRitual(page, 0.9) // => chapter 2
  expect(await page.evaluate(() => window.__tamatcha.ritualStep)).toBe(2)
  await scrollToRitual(page, 0.1) // back => chapter 0
  expect(await page.evaluate(() => window.__tamatcha.ritualStep)).toBe(0)
})

test('reduced motion: no pin, static art visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await expect(page.locator('.ritual--live')).toHaveCount(0)
  await page.locator('#ritual').scrollIntoViewIfNeeded()
  await expect(page.locator('.step__art').first()).toBeVisible()
})
```

- [ ] **Step 4: Verify + run**

```bash
npm run dev   # scroll through Rituál: pinned, powder→whisk→pour, captions highlight, reverse works
npm run build && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pinned scroll-scrubbed ritual scene (sift/whisk/serve) with reduced-motion fallback"
```

---

### Task 10: Menu card micro-animations (CSS)

**Files:**
- Modify: `src/styles/sections.css`
- Test: `e2e/menu.spec.ts`

**Interfaces:**
- Consumes: `.mcard__fx` markup from Task 3; `.reveal`→`.in` mechanism from Task 6 (the `.mcard` itself has class `reveal`, gaining `.in` on scroll).
- Produces: pure-CSS animations, paused until card is `.in`, disabled under reduced motion.

- [ ] **Step 1: CSS**

Append to `src/styles/sections.css`:

```css
/* ===== menu card fx ===== */
.mcard{position:relative;overflow:hidden}
.mcard > :not(.mcard__fx){position:relative;z-index:1}
.mcard__fx{position:absolute;inset:0;pointer-events:none;opacity:.55}
.mcard__fx span{position:absolute;display:block}

.fx-fizz span{bottom:-14px;border-radius:50%;background:rgba(143,185,75,.34);width:10px;height:10px;animation:fxBubble 6s linear infinite}
.fx-fizz span:nth-child(1){left:12%}
.fx-fizz span:nth-child(2){left:32%;width:6px;height:6px;animation-delay:1.4s;animation-duration:4.6s}
.fx-fizz span:nth-child(3){left:55%;animation-delay:.7s}
.fx-fizz span:nth-child(4){left:72%;width:7px;height:7px;animation-delay:2.2s;animation-duration:5.2s}
.fx-fizz span:nth-child(5){left:88%;width:5px;height:5px;animation-delay:3.1s;animation-duration:4.2s}
@keyframes fxBubble{to{transform:translateY(-360px);opacity:0}}

.fx-cloud span{border-radius:50%;background:rgba(236,230,215,.5);filter:blur(16px);width:120px;height:56px;animation:fxDrift 9s ease-in-out infinite alternate}
.fx-cloud span:nth-child(1){top:14%;left:-6%}
.fx-cloud span:nth-child(2){top:44%;right:-8%;animation-delay:1.8s}
.fx-cloud span:nth-child(3){bottom:8%;left:22%;animation-delay:3.4s}
@keyframes fxDrift{to{transform:translateX(36px)}}

.fx-latte{inset:-45%;background:conic-gradient(from 0deg at 55% 45%,
  rgba(143,185,75,.16), rgba(244,239,228,.30), rgba(94,138,52,.16),
  rgba(244,239,228,.30), rgba(143,185,75,.16));
  animation:fxSwirl 16s linear infinite}
@keyframes fxSwirl{to{transform:rotate(1turn)}}

.fx-yerba span{width:26px;height:12px;border-radius:12px 0;background:rgba(94,138,52,.24);animation:fxSway 7s ease-in-out infinite alternate}
.fx-yerba span:nth-child(1){top:18%;left:10%}
.fx-yerba span:nth-child(2){top:38%;right:14%;animation-delay:1.2s}
.fx-yerba span:nth-child(3){bottom:26%;left:30%;animation-delay:2.6s}
.fx-yerba span:nth-child(4){bottom:10%;right:32%;animation-delay:3.8s}
@keyframes fxSway{to{transform:translate(14px,10px) rotate(24deg)}}

/* run only when the card has revealed; JS-less users get static (paused at first frame) */
.js .mcard__fx, .js .mcard__fx span{animation-play-state:paused}
.js .mcard.in .mcard__fx, .js .mcard.in .mcard__fx span{animation-play-state:running}
@media (prefers-reduced-motion: reduce){
  .mcard__fx, .mcard__fx span{animation:none}
}
```

- [ ] **Step 2: e2e**

Create `e2e/menu.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('menu fx layers present, decorative, and text stays readable', async ({ page }) => {
  await page.goto('./?tier=c')
  await expect(page.locator('.mcard__fx')).toHaveCount(4)
  for (const fx of await page.locator('.mcard__fx').all()) {
    await expect(fx).toHaveAttribute('aria-hidden', 'true')
  }
  // text container sits above fx layer (.mcard > :not(.mcard__fx) { z-index: 1 })
  const z = await page.locator('.mcard__top').first().evaluate(
    (el) => getComputedStyle(el).zIndex)
  expect(z).toBe('1')
  await expect(page.locator('.mcard h3').first()).toBeVisible()
})
```

- [ ] **Step 3: Build + run + eyeball**

```bash
npm run build && npm run e2e
npm run dev   # scroll to menu: bubbles rise in Fizz, clouds drift, latte swirls, leaves sway
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: menu card micro-animations (fizz/cloud/latte/yerba), reveal-gated"
```

---

### Task 11: Gallery — draggable strip with momentum + parallax

**Files:**
- Create: `src/scenes/gallery.ts`
- Modify: `src/main.ts`
- Test: `e2e/gallery.spec.ts`

**Interfaces:**
- Consumes: `.ig__strip`/`.ig__tile` DOM (Task 3) + strip CSS (Task 4); gsap/ScrollTrigger.
- Produces: `initGallery(reduced: boolean): void` — drag-to-scroll with momentum on the strip, click suppression after drags > 5px, vertical-scroll parallax on tile images unless reduced.

- [ ] **Step 1: Implement**

Create `src/scenes/gallery.ts`:

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initGallery(reduced: boolean): void {
  const strip = document.querySelector<HTMLElement>('.ig__strip')
  if (!strip) return
  gsap.registerPlugin(ScrollTrigger)

  let down = false, moved = 0, startX = 0, startLeft = 0, vel = 0, lastX = 0, raf = 0

  strip.addEventListener('pointerdown', (e) => {
    down = true; moved = 0
    startX = e.clientX; startLeft = strip.scrollLeft; lastX = e.clientX; vel = 0
    cancelAnimationFrame(raf)
    strip.classList.add('dragging')
  })
  window.addEventListener('pointermove', (e) => {
    if (!down) return
    const dx = e.clientX - startX
    moved = Math.max(moved, Math.abs(dx))
    strip.scrollLeft = startLeft - dx
    vel = lastX - e.clientX
    lastX = e.clientX
  })
  window.addEventListener('pointerup', () => {
    if (!down) return
    down = false
    strip.classList.remove('dragging')
    const glide = () => {
      if (Math.abs(vel) < 0.4) return
      strip.scrollLeft += vel
      vel *= 0.94
      raf = requestAnimationFrame(glide)
    }
    glide()
  })
  // a drag must not trigger the link click underneath
  strip.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation() } }, true)

  if (!reduced) {
    gsap.utils.toArray<HTMLElement>('.ig__tile img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })
  }
}
```

Append inside `boot()` in `src/main.ts`:

```ts
const { initGallery } = await import('./scenes/gallery')
initGallery(reduced)
```

- [ ] **Step 2: e2e**

Create `e2e/gallery.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('gallery drags horizontally and suppresses click after drag', async ({ page }) => {
  await page.goto('./?tier=c')
  const strip = page.locator('.ig__strip')
  await strip.scrollIntoViewIfNeeded()
  const before = await strip.evaluate((el) => el.scrollLeft)
  const box = (await strip.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 15 })
  await page.mouse.up()
  const after = await strip.evaluate((el) => el.scrollLeft)
  expect(after).toBeGreaterThan(before)
  expect(page.url()).not.toContain('instagram.com') // click suppressed, no navigation
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('gallery falls back to grid', async ({ page }) => {
    await page.goto('./')
    const display = await page.locator('.ig__strip').evaluate((el) => getComputedStyle(el).display)
    expect(display).toBe('grid')
  })
})
```

- [ ] **Step 3: Build + run**

```bash
npm run build && npm run e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: draggable gallery strip with momentum, parallax, no-JS grid fallback"
```

---

### Task 12: Section accents — journey line, drifting leaves, map route draw

**Files:**
- Create: `src/scenes/accents.ts`
- Modify: `src/main.ts`, `src/styles/sections.css`
- Test: `e2e/accents.spec.ts`

**Interfaces:**
- Consumes: `.about__journey`, `.about__leaf`, `.mapcard .grid-lines` DOM (Task 3); `.draw`/`.in` CSS from base.css (v1 stroke-dashoffset animation); gsap.
- Produces: `initAccents(reduced: boolean): void` — leaf parallax; journey-line and map-route draw-on-reveal (the `.draw`→`.in` mechanism from Task 6 already handles these — this module only adds parallax and the map path's dash setup).

- [ ] **Step 1: CSS + implementation**

Append to `src/styles/sections.css`:

```css
.about__media{position:relative}
.about__journey{position:absolute;inset:auto -8% -6% auto;width:70%;color:var(--matcha-deep);opacity:.5;z-index:0}
.about__journey path{transition:stroke-dashoffset 1.6s var(--ease)}
.about__journey.in path{stroke-dashoffset:0}
.about__leaf{position:absolute;width:38px;color:var(--matcha-deep);opacity:.4;z-index:0}
.about__leaf:nth-of-type(2){top:6%;left:-4%}
.about__leaf:nth-of-type(3){top:40%;right:-6%;transform:rotate(40deg)}
.about__leaf:nth-of-type(4){bottom:12%;left:8%;transform:rotate(-30deg)}
.grid-lines .route{stroke-dasharray:520;stroke-dashoffset:520;transition:stroke-dashoffset 1.8s var(--ease)}
.mapcard.in .grid-lines .route{stroke-dashoffset:0}
```

In `index.html`, add class `route` to the accent path inside `.grid-lines` (the one with `stroke="rgba(143,185,75,.28)"`, copied from `legacy/template.html:550`).

Create `src/scenes/accents.ts`:

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initAccents(reduced: boolean): void {
  if (reduced) return
  gsap.registerPlugin(ScrollTrigger)
  gsap.utils.toArray<HTMLElement>('.about__leaf').forEach((leaf, i) => {
    gsap.to(leaf, {
      y: (i + 1) * -34, rotation: i % 2 ? 18 : -14, ease: 'none',
      scrollTrigger: { trigger: '#o-nas', start: 'top bottom', end: 'bottom top', scrub: true },
    })
  })
}
```

Append inside `boot()` in `src/main.ts`:

```ts
const { initAccents } = await import('./scenes/accents')
initAccents(reduced)
```

- [ ] **Step 2: e2e**

Create `e2e/accents.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('journey line draws on reveal', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.locator('#o-nas').scrollIntoViewIfNeeded()
  await expect(page.locator('.about__journey')).toHaveClass(/\bin\b/)
})

test('map route draws on reveal', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.locator('.mapcard').scrollIntoViewIfNeeded()
  await expect(page.locator('.mapcard')).toHaveClass(/\bin\b/)
})
```

- [ ] **Step 3: Build + run**

```bash
npm run build && npm run e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: about journey-line, leaf parallax, map route draw accents"
```

---

### Task 13: Performance + accessibility pass

**Files:**
- Create: `scripts/check-budgets.mjs`
- Modify: whatever the audits flag (likely `index.html`, `src/styles/*`)

**Interfaces:**
- Consumes: the complete site.
- Produces: budget check script wired to `npm run check:budgets`; Lighthouse mobile ≥ 85 perf / ≥ 95 a11y; JS ≤ 120 kB gzip.

- [ ] **Step 1: Budget script**

Create `scripts/check-budgets.mjs`:

```js
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const dir = 'dist/assets'
let jsTotal = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue
  const gz = gzipSync(readFileSync(`${dir}/${f}`)).length
  jsTotal += gz
  console.log(`${f}: ${(gz / 1024).toFixed(1)} kB gz`)
}
console.log(`TOTAL JS: ${(jsTotal / 1024).toFixed(1)} kB gz (budget 120)`)
if (jsTotal > 120 * 1024) {
  console.error('BUDGET EXCEEDED')
  process.exit(1)
}
```

- [ ] **Step 2: Run budgets + Lighthouse**

```bash
npm run build && npm run check:budgets
npm run preview &
npx lighthouse http://localhost:4173/tamatcha/ --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile --chrome-flags='--headless' --output=json --output-path=./test-results/lh.json
node -e "const r=require('./test-results/lh.json');console.log('perf',r.categories.performance.score*100,'a11y',r.categories.accessibility.score*100)"
```

Expected: `TOTAL JS` under 120; perf ≥ 85, a11y ≥ 95.

- [ ] **Step 3: Fix what the audits flag**

Common expected fixes (apply only those flagged): missing `loading="lazy"` on below-fold images; contrast on `--cream-46` text (bump to `--cream-70` where flagged); `<html lang="cs">` present; buttons/links need discernible names (v1 markup already handles this); font preloads correct.

Re-run Step 2 until green.

- [ ] **Step 4: Full test suite + commit**

```bash
npm test && npm run e2e
git add -A
git commit -m "chore: perf/a11y pass — budgets script, lighthouse fixes"
```

---

### Task 14: GitHub Pages deploy + README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md` (new, root)

**Interfaces:**
- Consumes: green build from all previous tasks.
- Produces: live site at `https://<owner>.github.io/tamatcha/`, auto-deploying on push to `main`.

- [ ] **Step 1: Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: New root README.md**

```markdown
# Tamatcha — web v2 „Living Matcha"

Jednostránkový web pro **Tamatcha**, první matcha bar v Ostravě — s interaktivní
WebGL matchou v hero sekci a scrollem řízeným příběhem přípravy.

## Vývoj

​```bash
npm install
npm run dev        # http://localhost:5173/tamatcha/
npm test           # unit testy (Vitest)
npm run e2e        # Playwright testy (staví na `npm run preview`)
npm run build      # produkce do dist/
​```

Ladění: `?tier=a|b|c` vynutí úroveň hero efektu (a = fluid sim, b = noise shader, c = statický gradient).

## Nasazení

Push do `main` → GitHub Actions → GitHub Pages (`https://<owner>.github.io/tamatcha/`).
Pro vlastní doménu tamatcha.cz: přidat `public/CNAME` s obsahem `tamatcha.cz`,
nastavit DNS dle GitHub docs a změnit `VITE_BASE=/` v buildu.

## Struktura

- `index.html` — veškerý obsah (funguje i bez JS)
- `src/fluid/` — WebGL2 fluid simulace + noise fallback
- `src/scenes/` — rituál (pinned canvas scéna), galerie, akcenty
- `src/scroll.ts` — Lenis + GSAP ScrollTrigger
- `docs/superpowers/specs/` — design spec
- `legacy/` — původní v1 web (single-file)

Assets: `npm run assets:fonts` (python3) a `npm run assets:img` regenerují
`public/fonts` a `public/img` ze zdrojů (`legacy/fonts.css`, `source-photos/`).
```

(Remove the zero-width escapes around the code fence when writing the actual file.)

- [ ] **Step 3: Create GitHub repo + push + enable Pages**

```bash
gh repo create tamatcha --public --source=. --push
gh api -X POST "repos/{owner}/tamatcha/pages" -f build_type=workflow 2>/dev/null || true
git push -u origin main
gh run watch   # wait for deploy to finish
```

If `gh api .../pages` fails, enable manually: repo Settings → Pages → Source: GitHub Actions. **Repo name must be `tamatcha`** (matches Vite base) — if it must differ, change `base` in `vite.config.ts` and `baseURL` in `playwright.config.ts` to match.

- [ ] **Step 4: Verify live + commit**

Open `https://<owner>.github.io/tamatcha/` — check: fluid hero swirls and stirs, ritual pins and scrubs, menu cards animate, gallery drags, real phone check for fluid feel (spec §12).

```bash
git add -A
git commit -m "feat: GitHub Pages deploy workflow + v2 README"
git push
```

---

## Final acceptance checklist (spec §12)

- [ ] `?tier=a` fluid hero, `?tier=b` noise, `?tier=c` gradient — all render branded greens
- [ ] Reduced motion: no pin-spacers, everything readable instantly
- [ ] No JS: full content visible (e2e `content.spec.ts` no-JS block green)
- [ ] Rituál scrubs forward and backward through all three chapters
- [ ] Mobile 390×844: no horizontal overflow, all sections styled
- [ ] `npm run check:budgets` green; Lighthouse mobile perf ≥ 85, a11y ≥ 95
- [ ] Manual real-phone check of hero fluid feel
- [ ] Live on GitHub Pages
