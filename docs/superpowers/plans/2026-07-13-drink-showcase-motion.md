# Drink Showcase + Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static "Celá sestava" row into a pinned scroll showcase of the five drinks (AI-turntable-ready), plus restrained motion polish (hero parallax/float, menu hovers, rituál numerals).

**Architecture:** Progressive enhancement on the live brand-match one-pager. The lineup DOM stays the no-JS/reduced-motion rendering; a new `src/scenes/showcase.ts` pins the section via GSAP ScrollTrigger and scrubs through the drinks. A manifest-probing hook upgrades the centered drink to canvas frame-scrub when turntable frames exist (none ship now). Motion polish lives in `src/scroll.ts` (scroll-linked) and `src/styles/sections.css` (CSS-only).

**Tech Stack:** Vite 8, TypeScript, GSAP ScrollTrigger + Lenis (already shipped), Playwright e2e, sharp + ffmpeg-static (dev-only, prep script).

**Spec:** `docs/superpowers/specs/2026-07-13-drink-showcase-motion-design.md`

## Global Constraints

- No-JS and `prefers-reduced-motion: reduce` render exactly today's static lineup row — no pin, no stage, no float/parallax.
- Showcase is desktop/tablet only: `initShowcase` returns early when `matchMedia('(max-width: 860px)').matches` — mobile keeps the existing swipe strip (plan decision; the ≤860px snap-scroll strip already works well).
- Drink order and slugs (fixed): `fizz` Matcha Fizz, `latte-iced` Iced Matcha Latté, `latte-hot` Hot Matcha Latté, `cloud` Matcha Cloud, `yerba` Iced Yerba Maté.
- All animation transform/opacity-only; no drop shadows under drink cutouts.
- No new runtime dependencies. `ffmpeg-static` is NOT installed by this plan — the prep script degrades with an install hint.
- JS-built asset URLs MUST use `import.meta.env.BASE_URL` (root-absolute strings 404 under the `/tamatcha/` GH Pages base — documented gotcha in this repo).
- Budgets: `npm run check:budgets` (≤120 kB gz) must pass; current total 49.2 kB.
- Existing 15 Playwright tests stay green; `npm run e2e` serves `dist/` — always `npm run build` first.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Before committing, check `git status --porcelain` lists only files your task touched.

---

### Task 1: Showcase core (pin + scrub + stage)

**Files:**
- Create: `e2e/showcase.spec.ts`, `src/scenes/showcase.ts`
- Modify: `index.html` (lineup figures — data attributes), `src/styles/sections.css` (showcase block), `src/main.ts` (boot wiring)

**Interfaces:**
- Produces: `initShowcase(reduced: boolean): void` exported from `src/scenes/showcase.ts`; DOM contract `.lineup.showcase-on`, `.showcase__stage`, `.showcase__img`, `.showcase__canvas` (hidden, unused until Task 2), `.showcase__title`, `.showcase__formula`, `.lineup__item.is-active`, `data-drink|data-name|data-formula` on figures. Task 2 inserts the turntable hook into this file at the marked comment.
- Consumes: existing `.lineup` DOM, GSAP/ScrollTrigger, `initScroll` boot pattern in `main.ts`.

- [ ] **Step 1: Write the failing e2e spec**

Create `e2e/showcase.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('drink showcase (JS, desktop)', () => {
  test('enhances the lineup and starts on Matcha Fizz', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__title')).toHaveText('Matcha Fizz')
    await expect(page.locator('.showcase__formula')).toHaveText('( matcha, soda, pyré dle výběru )')
    await expect(page.locator('.lineup__item.is-active figcaption')).toHaveText('Matcha Fizz')
  })

  test('scrubbing through the pin changes the active drink', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    const sectionTop = await page
      .locator('.lineup')
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // pin lasts 3 viewport heights (end: '+=300%'); 2.9vh ≈ segment 5
    await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.97 * 3 * 800)
    await expect(page.locator('.showcase__title')).toHaveText('Iced Yerba Maté')
    await expect(page.locator('.lineup__item.is-active figcaption')).toHaveText('Iced Yerba Maté')
    // middle of the pin ≈ third drink
    await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.5 * 3 * 800)
    await expect(page.locator('.showcase__title')).toHaveText('Hot Matcha Latté')
  })

  test('reduced motion: no pin, no stage, static strip', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./')
    await expect(page.locator('.lineup')).not.toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__stage')).toHaveCount(0)
    await expect(page.locator('.lineup__item')).toHaveCount(5)
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('static five-figure strip, no stage', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup__item')).toHaveCount(5)
    await expect(page.locator('.showcase__stage')).toHaveCount(0)
    await expect(page.locator('.lineup__item').first()).toBeVisible()
  })
})
```

- [ ] **Step 2: Run it to confirm red**

Run: `npm run build && npx playwright test e2e/showcase.spec.ts`
Expected: the two JS-mode tests FAIL (`showcase-on` class never appears); the reduced-motion and no-JS tests may already pass. Record the failure lines.

- [ ] **Step 3: Add data attributes to the lineup figures in `index.html`**

Replace the five `<figure>` lines inside `.lineup__strip` with (only the opening tags change — img/figcaption stay identical):

```html
        <figure class="lineup__item reveal" data-drink="fizz" data-name="Matcha Fizz" data-formula="( matcha, soda, pyré dle výběru )"><img src="/brand/drinks/fizz-480.webp" alt="" loading="lazy" width="480" height="720"><figcaption>Matcha Fizz</figcaption></figure>
        <figure class="lineup__item reveal" data-d="1" data-drink="latte-iced" data-name="Iced Matcha Latté" data-formula="( matcha, mléko/ovesné mléko, sirup dle výběru, posyp )"><img src="/brand/drinks/latte-iced-480.webp" alt="" loading="lazy" width="480" height="720"><figcaption>Iced Matcha Latté</figcaption></figure>
        <figure class="lineup__item reveal" data-d="2" data-drink="latte-hot" data-name="Hot Matcha Latté" data-formula="( matcha, mléko/ovesné mléko, sirup dle výběru, posyp )"><img src="/brand/drinks/latte-hot-480.webp" alt="" loading="lazy" width="480" height="720"><figcaption>Hot Matcha Latté</figcaption></figure>
        <figure class="lineup__item reveal" data-d="3" data-drink="cloud" data-name="Matcha Cloud" data-formula="( matcha cloud, mléko, pyré dle výběru )"><img src="/brand/drinks/cloud-480.webp" alt="" loading="lazy" width="480" height="720"><figcaption>Matcha Cloud</figcaption></figure>
        <figure class="lineup__item reveal" data-d="4" data-drink="yerba" data-name="Iced Yerba Maté" data-formula="( yerba maté, pyré dle výběru )"><img src="/brand/drinks/yerba-480.webp" alt="" loading="lazy" width="480" height="720"><figcaption>Iced Yerba Maté</figcaption></figure>
```

- [ ] **Step 4: Create `src/scenes/showcase.ts`**

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SEGMENTS = 5

export function initShowcase(reduced: boolean): void {
  if (reduced) return
  if (matchMedia('(max-width: 860px)').matches) return
  const section = document.querySelector<HTMLElement>('.lineup')
  const strip = section?.querySelector<HTMLElement>('.lineup__strip')
  if (!section || !strip) return
  const items = Array.from(strip.querySelectorAll<HTMLElement>('.lineup__item'))
  if (items.length !== SEGMENTS) return

  gsap.registerPlugin(ScrollTrigger)
  section.classList.add('showcase-on')

  // stage: one large image + caption, swapped per active drink
  const stage = document.createElement('div')
  stage.className = 'showcase__stage'
  stage.innerHTML =
    '<img class="showcase__img" alt="" width="480" height="720">' +
    '<canvas class="showcase__canvas" width="480" height="720" hidden></canvas>' +
    '<div class="showcase__cap"><h3 class="showcase__title" aria-live="polite"></h3><p class="showcase__formula"></p></div>'
  strip.before(stage)
  const stageImg = stage.querySelector<HTMLImageElement>('.showcase__img')!
  const title = stage.querySelector<HTMLElement>('.showcase__title')!
  const formula = stage.querySelector<HTMLElement>('.showcase__formula')!

  let active = -1
  function activate(i: number): void {
    if (i === active) return
    active = i
    const item = items[i]
    const img = item.querySelector<HTMLImageElement>('img')!
    stageImg.src = img.currentSrc || img.src
    title.textContent = item.dataset.name ?? ''
    formula.textContent = item.dataset.formula ?? ''
    items.forEach((el, j) => el.classList.toggle('is-active', j === i))
    stage.classList.remove('swap')
    void stage.offsetWidth // restart the swap fade animation
    stage.classList.add('swap')
    // TURNTABLE-HOOK: Task 2 extends activation here
  }

  activate(0)

  const st = ScrollTrigger.create({
    id: 'showcase',
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      const p = Math.min(0.999, self.progress)
      const i = Math.floor(p * SEGMENTS)
      activate(i)
      // TURNTABLE-DRAW: Task 2 scrubs frames here with (i, p * SEGMENTS - i)
    },
  })

  // thumbnail click jumps to that drink's scroll segment
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      window.scrollTo(0, st.start + ((st.end - st.start) * (i + 0.5)) / SEGMENTS)
    })
  })
}
```

- [ ] **Step 5: Wire it into `src/main.ts`**

Replace the `boot()` body's `try` block with:

```ts
  try {
    const [{ initScroll }, { initShowcase }] = await Promise.all([
      import('./scroll'),
      import('./scenes/showcase'),
    ])
    initScroll(reduced)
    initShowcase(reduced)
  } catch (err) {
```

(the `catch` safety net stays unchanged.)

- [ ] **Step 6: Add showcase CSS to `src/styles/sections.css`**

Insert directly after the existing `.lineup__foot` rule block (before the `/* ===== visit ===== */` comment):

```css
/* ===== drink showcase (JS-enhanced lineup; static strip is the fallback) ===== */
.showcase-on{padding-block:clamp(2rem,4vw,3rem)}
.showcase-on .head{max-width:none}
.showcase__stage{display:grid;grid-template-columns:auto minmax(0,22rem);align-items:center;justify-content:center;gap:clamp(1.5rem,4vw,3.5rem);margin-top:1.6rem}
.showcase__img,.showcase__canvas{grid-area:1/1;height:min(48vh,430px);width:auto;justify-self:center}
.showcase__canvas{background:#fff;border-radius:var(--r)}
.showcase__cap{grid-area:1/2}
.showcase__title{font-size:clamp(1.8rem,3.4vw,2.6rem)}
.showcase__formula{color:var(--coal-60);margin-top:.6rem}
.showcase__stage.swap .showcase__img,.showcase__stage.swap .showcase__canvas,.showcase__stage.swap .showcase__cap{animation:swapfade .35s var(--ease)}
@keyframes swapfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.showcase-on .lineup__strip{max-width:560px;margin-inline:auto;gap:.8rem;margin-top:2rem;align-items:end}
.showcase-on .lineup__item{cursor:pointer;opacity:.45;transition:opacity .3s var(--ease)}
.showcase-on .lineup__item.is-active{opacity:1}
.showcase-on .lineup__item img{max-height:96px;width:auto;margin-inline:auto}
.showcase-on .lineup__item figcaption{font-size:.7rem;margin-top:.4rem;display:inline-block;border-bottom:2px solid transparent;padding-bottom:.15rem}
.showcase-on .lineup__item.is-active figcaption{border-bottom-color:var(--emerald)}
```

- [ ] **Step 7: Build + run the showcase spec green**

Run: `npm run build && npx playwright test e2e/showcase.spec.ts`
Expected: all showcase tests PASS. If the scrub assertions flake on timing, the assertions auto-retry — a persistent failure means the segment math is off (check `end: '+=300%'` = 3×viewport of scrub and the test's `3 * 800`).

- [ ] **Step 8: Full suite green**

Run: `npm run e2e`
Expected: 19/19 (15 existing + 4 new). Watch `e2e/lineup.spec.ts` and `e2e/visual.spec.ts` in particular — they must pass with the pin in place.

- [ ] **Step 9: Visual check**

Read `test-results/desktop-full.png` — the showcase section should show one large centered drink with name/formula and a small thumbnail row (the screenshot captures whatever segment the scroll-through ended on; any drink centered is correct). Mobile screenshot must show the unchanged swipe strip.

- [ ] **Step 10: Commit**

```bash
git add e2e/showcase.spec.ts src/scenes/showcase.ts index.html src/styles/sections.css src/main.ts
git commit -m "feat: pinned drink showcase — scroll-scrub through the five drinks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Turntable hook + prep script + prompts doc

**Files:**
- Modify: `src/scenes/showcase.ts` (fill the two TURNTABLE markers), `e2e/showcase.spec.ts` (add one test), `package.json` (script)
- Create: `scripts/turntable-prep.mjs`, `docs/turntable-prompts.md`

**Interfaces:**
- Consumes: Task 1's `showcase.ts` with `// TURNTABLE-HOOK` and `// TURNTABLE-DRAW` markers, `.showcase__canvas` element, `activate()`/`active` closure state.
- Produces: runtime contract `public/brand/turntable/<slug>/manifest.json` = `{"frames": N, "width": W, "height": H}` + `frame-001.webp … frame-NNN.webp` (1-indexed, zero-padded 3); npm script `turntable`.

- [ ] **Step 1: Add the failing route-mocked e2e test**

Append to `e2e/showcase.spec.ts` inside the `drink showcase (JS, desktop)` describe block:

```ts
  test('turntable manifest upgrades the active drink to canvas scrub', async ({ page }) => {
    await page.route('**/brand/turntable/fizz/manifest.json', (route) =>
      route.fulfill({ json: { frames: 4, width: 480, height: 720 } }),
    )
    await page.route('**/brand/turntable/fizz/frame-*.webp', (route) =>
      route.fulfill({ path: 'public/brand/drinks/fizz-480.webp', contentType: 'image/webp' }),
    )
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    // fizz is the first (active) drink — once its manifest loads, canvas replaces the img
    await expect(page.locator('.showcase__canvas')).toBeVisible()
    await expect(page.locator('.showcase__img')).toBeHidden()
    // drinks without a manifest keep the static image
    const sectionTop = await page
      .locator('.lineup')
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.5 * 3 * 800)
    await expect(page.locator('.showcase__title')).toHaveText('Hot Matcha Latté')
    await expect(page.locator('.showcase__canvas')).toBeHidden()
    await expect(page.locator('.showcase__img')).toBeVisible()
  })
```

- [ ] **Step 2: Run it red**

Run: `npm run build && npx playwright test e2e/showcase.spec.ts`
Expected: the new test FAILS (`.showcase__canvas` never becomes visible — no fetch logic exists yet). Others stay green.

- [ ] **Step 3: Implement the hook in `src/scenes/showcase.ts`**

Add after the `SEGMENTS` constant:

```ts
interface TurntableManifest {
  frames: number
  width: number
  height: number
}
```

Add after the `const formula = …` line (grabbing the canvas and probing manifests):

```ts
  const canvas = stage.querySelector<HTMLCanvasElement>('.showcase__canvas')!
  const ctx = canvas.getContext('2d')

  // turntable hook: frames are generated later via `npm run turntable` —
  // absent manifests 404 and the static photo stays.
  const turntables = new Map<number, { manifest: TurntableManifest; frames: HTMLImageElement[] }>()
  items.forEach((item, i) => {
    const slug = item.dataset.drink
    if (!slug) return
    fetch(`${import.meta.env.BASE_URL}brand/turntable/${slug}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<TurntableManifest>) : null))
      .then((manifest) => {
        if (!manifest?.frames) return
        const frames = Array.from({ length: manifest.frames }, (_, f) => {
          const img = new Image()
          img.src = `${import.meta.env.BASE_URL}brand/turntable/${slug}/frame-${String(f + 1).padStart(3, '0')}.webp`
          return img
        })
        turntables.set(i, { manifest, frames })
        frames[0].addEventListener('load', () => {
          if (i === active) applyMode(i)
        })
        if (i === active) applyMode(i)
      })
      .catch(() => {})
  })

  function applyMode(i: number): void {
    const tt = turntables.get(i)
    canvas.hidden = !tt
    stageImg.style.visibility = tt ? 'hidden' : ''
    if (tt) drawFrame(i, 0)
  }

  function drawFrame(i: number, local: number): void {
    const tt = turntables.get(i)
    if (!tt || !ctx) return
    const idx = Math.min(tt.frames.length - 1, Math.floor(local * tt.frames.length))
    const frame = tt.frames[idx]
    if (!frame.complete || frame.naturalWidth === 0) return
    canvas.width = tt.manifest.width
    canvas.height = tt.manifest.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
  }
```

Replace the `// TURNTABLE-HOOK: …` comment inside `activate()` with:

```ts
    applyMode(i)
```

Replace the `// TURNTABLE-DRAW: …` comment inside `onUpdate` with:

```ts
      drawFrame(i, p * SEGMENTS - i)
```

(Note: `activate` is declared before `applyMode`; function declarations hoist within the module scope, so the call order is fine. `active` starts at `-1`, and `activate(0)` runs before any fetch resolves — the `if (i === active) applyMode(i)` in the fetch callback covers the late-manifest case.)

- [ ] **Step 4: Run the spec green**

Run: `npm run build && npx playwright test e2e/showcase.spec.ts`
Expected: all showcase tests PASS, including the turntable one.

- [ ] **Step 5: Create `scripts/turntable-prep.mjs`**

```js
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

// extract every frame at 640px wide, then sample FRAMES evenly
await run(ffmpeg, ['-y', '-i', video, '-vf', 'scale=640:-2', path.join(tmp, 'all-%04d.png')])
const all = (await readdir(tmp)).filter((f) => f.endsWith('.png')).sort()
if (all.length < FRAMES) {
  console.error(`only ${all.length} frames extracted — clip too short?`)
  process.exit(1)
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
await rm(tmp, { recursive: true, force: true })
console.log(`${out}: ${FRAMES} frames ${width}x${height} + manifest.json`)
```

Add to `package.json` scripts (after `"assets:brand"`):

```json
    "turntable": "node scripts/turntable-prep.mjs",
```

- [ ] **Step 6: Create `docs/turntable-prompts.md`**

```markdown
# Turntable frames — generování a nasazení

Cíl: 360° rotace drinku pro scroll showcase. Web je připravený — stačí
vygenerovat klip, prohnat ho skriptem a commitnout výstup. Žádná změna kódu.

## 1. Vygeneruj klip (Dreamina / Seedance 2.0 — zdarma, bez watermarku)

1. Účet na dreamina.com (ByteDance/CapCut), režim **Image to Video**,
   model Seedance 2.0, délka **10 s**, rozlišení 1080p.
2. Nahraj produktové foto drinku — používej originály z
   `~/projects/tamatcha-brand/Výstupy/FONT/Výstupy/Produktové fotografie/FFFFFF/`
   (verze na bílém pozadí, NE transparent):
   fizz = DSC00227, latte-iced = DSC00231, yerba = DSC00232,
   latte-hot = DSC00233, cloud = DSC00234.
3. Prompt (pro všechny drinky stejný základ):

   > Slow seamless 360-degree turntable rotation of this exact drink glass.
   > Product photography, camera locked and static at eye level, pure white
   > seamless studio background, soft even lighting, no camera movement,
   > no zoom, no cuts. The glass rotates smoothly exactly one full
   > revolution over the whole clip. Keep the contents, colors and
   > proportions of the drink identical to the reference photo.

4. Zkontroluj: bílé pozadí bez stínů scény, žádný pohyb kamery, obsah
   drinku se nerozpadá. Případně re-generuj (100 kreditů/den zdarma).

## 2. Připrav frames

```sh
npm i -D ffmpeg-static        # jednorázově
npm run turntable -- fizz ~/Downloads/fizz-turntable.mp4
```

Výstup: `public/brand/turntable/fizz/frame-001..048.webp` + `manifest.json`.

## 3. Ověř a nasaď

```sh
npm run build && npm run e2e   # showcase testy projdou beze změny
git add public/brand/turntable && git commit
git push                        # GH Pages mirror
# produkci aktualizuje /deploy (tamatcha.cz)
```

Poznámka: frames mají bílé pozadí — canvas na webu má proto bílý
zaoblený podklad (vypadá jako produktová karta na krémové sekci).
Transparentní pozadí není potřeba.
```

- [ ] **Step 7: Sanity-check the script's guard path**

Run: `npm run turntable -- fizz nonexistent.mp4`
Expected: exits 1 with the `ffmpeg-static is not installed` hint (ffmpeg-static is not a dependency). No files created under `public/brand/turntable/`.

- [ ] **Step 8: Full suite + commit**

Run: `npm run e2e` → expected 20/20.

```bash
git add e2e/showcase.spec.ts src/scenes/showcase.ts scripts/turntable-prep.mjs docs/turntable-prompts.md package.json
git commit -m "feat: turntable hook — manifest-gated canvas frame scrub + prep script/prompts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Motion polish (hero parallax/float, menu hovers, rituál numerals)

**Files:**
- Modify: `src/scroll.ts` (hero scroll-linked motion), `src/styles/sections.css` (float/hover/numerals CSS), `e2e/scroll.spec.ts` (motion tests)

**Interfaces:**
- Consumes: `initScroll(reduced)` — the early `return` for reduced motion already guards the new GSAP tweens; `.hero__wm`, `.hero__trio`, `.mcard`, `.step__n` DOM from the live site.
- Produces: nothing consumed later; pure presentation.

- [ ] **Step 1: Add failing motion tests to `e2e/scroll.spec.ts`**

Append:

```ts
test('hero watermark and trio get scroll-linked transforms', async ({ page }) => {
  await page.goto('./')
  const before = await page
    .locator('.hero__wm')
    .evaluate((el) => getComputedStyle(el).transform)
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect
    .poll(() => page.locator('.hero__wm').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before)
  await expect
    .poll(() => page.locator('.hero__trio').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none')
})

test('reduced motion: no scroll-linked hero transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.evaluate(() => window.scrollTo(0, 500))
  // give any (wrongly registered) trigger a beat to fire, then assert clean
  await page.waitForTimeout(300)
  expect(await page.locator('.hero__wm').evaluate((el) => el.style.transform)).toBe('')
  expect(await page.locator('.hero__trio').evaluate((el) => el.style.transform)).toBe('')
})
```

- [ ] **Step 2: Run red**

Run: `npm run build && npx playwright test e2e/scroll.spec.ts`
Expected: first new test FAILS (no transform appears on `.hero__wm`); reduced-motion test passes already. Existing three tests stay green.

- [ ] **Step 3: Add hero motion to `src/scroll.ts`**

Insert before the `// active-section highlight in nav` comment:

```ts
  // hero: watermark parallax + drink trio drift (decorative; reduced-motion
  // users never reach this code — the early return above guards it)
  const wm = document.querySelector<HTMLElement>('.hero__wm')
  if (wm) {
    gsap.to(wm, {
      y: () => window.innerHeight * 0.24,
      ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  }
  const trio = document.querySelector<HTMLElement>('.hero__trio')
  if (trio) {
    gsap.to(trio, {
      y: -44,
      ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  }
```

- [ ] **Step 4: Add CSS motion polish to `src/styles/sections.css`**

Insert after the `/* ===== hero ===== */` block's last rule (`.hero__trio img:nth-child(2){…}`):

```css
@media (prefers-reduced-motion:no-preference){
  .hero__trio img{animation:heroFloat 6.5s ease-in-out infinite alternate}
  .hero__trio img:nth-child(2){animation-duration:7.4s;animation-delay:-2.1s}
  .hero__trio img:nth-child(3){animation-duration:5.8s;animation-delay:-3.6s}
}
@keyframes heroFloat{from{transform:translateY(0)}to{transform:translateY(-6px)}}
```

In the menu block, after the `.mcard{…}` rule add:

```css
@media (prefers-reduced-motion:no-preference){
  .mcard{transition:transform .35s var(--ease),border-color .35s var(--ease)}
  .mcard:hover{transform:translateY(-4px);border-color:var(--emerald)}
  .mcard__drink{transition:transform .35s var(--ease)}
  .mcard:hover .mcard__drink{transform:translateY(-6px) scale(1.02)}
}
```

In the ritual block, after the `.step__n{…}` rule add:

```css
.js .step .step__n{opacity:0;transform:translateY(14px);transition:opacity .6s var(--ease) .25s,transform .6s var(--ease) .25s}
.js .step.reveal.in .step__n{opacity:.14;transform:none}
@media (prefers-reduced-motion:reduce){.js .step .step__n{opacity:.14;transform:none;transition:none}}
```

(Note: the trio float animates the `<img>` elements while the GSAP drift animates the `.hero__trio` container — different elements, no transform conflict. The `nth-child(2)` img already has `margin-inline`/`z-index` but no transform.)

- [ ] **Step 5: Run green**

Run: `npm run build && npx playwright test e2e/scroll.spec.ts`
Expected: all 5 tests in the file PASS.

- [ ] **Step 6: Full suite + budgets**

Run: `npm run e2e && npm run check:budgets`
Expected: 22/22 (15 pre-existing + 4 from Task 1 + 1 from Task 2 + 2 from this task); TOTAL JS still well under 120 kB gz (expect ~53–55 kB).

- [ ] **Step 7: Commit**

```bash
git add e2e/scroll.spec.ts src/scroll.ts src/styles/sections.css
git commit -m "feat: motion polish — hero parallax + float, menu hovers, ritual numerals

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Verification sweep

**Files:** none (verification only; fixes go through review if needed)

- [ ] **Step 1: Full pipeline**

Run: `npm run build && npm test && npm run e2e && npm run check:budgets`
Expected: everything green (vitest exits 0 with no tests; 22/22 e2e; budget < 120 kB).

- [ ] **Step 2: Visual review**

Read `test-results/desktop-full.png` and `test-results/mobile-full.png`. Checklist: showcase renders one centered drink + thumbnails on desktop; mobile shows the classic swipe strip; hero unchanged at rest (floats are subtle); no horizontal overflow; no layout breakage in visit/footer after the pin.

- [ ] **Step 3: Report**

Report results to the controller. Do NOT push or deploy — publishing (GH Pages push + tamatcha.cz `/deploy`) is the controller's conversation with the user.
