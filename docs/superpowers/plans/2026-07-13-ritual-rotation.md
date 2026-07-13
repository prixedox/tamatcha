# Ritual Rotation Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the rotating Fizz from the showcase into the Rituál section as a pinned scene — the rotation scrubs across the whole pin while the three steps reveal progressively; the showcase reverts to static stage photos.

**Architecture:** New `src/scenes/ritual.ts` owns the turntable (manifest fetch for `fizz`, canvas, pin, step thresholds); `src/scenes/showcase.ts` loses all turntable code and returns to a pure static stage. Progressive enhancement everywhere: without JS / on mobile (≤860px) / under reduced motion / without the fizz manifest, the Rituál renders exactly as today.

**Tech Stack:** Vite 8, TypeScript, GSAP ScrollTrigger (already bundled), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-07-13-ritual-rotation-design.md`

## Global Constraints

- Rituál scene activates ONLY when all hold: JS, viewport >860px, no `prefers-reduced-motion`, fizz manifest fetch succeeds. Any other case = today's static three-step row, no pin, no canvas.
- Ritual pin: `start: 'top top'`, `end: '+=250%'`, scrub. Rotation maps frames 0..N-1 onto full pin progress [0,1].
- Step thresholds: step 1 active from progress 0, step 2 from ≥0.33, step 3 from ≥0.66; class `.active`, toggled both directions.
- Step copy (Prosíváme/Šleháme/Podáváme) and DOM stay unchanged — the module only adds classes/canvas.
- JS-built asset URLs use `import.meta.env.BASE_URL` (repo gotcha: root-absolute strings 404 under `/tamatcha/`).
- Transform/opacity-only animation; no drop shadows.
- Suite: 23 tests before → 26 after (showcase turntable test replaced 1:1, ritual spec adds 3). `npm run check:budgets` ≤120 kB gz.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Before committing, `git status --porcelain` must list only this plan's files.
- `npm run e2e` serves `dist/` — always `npm run build` first.

---

### Task 1: The move — ritual scene in, showcase turntable out

**Files:**
- Create: `e2e/ritual.spec.ts`, `src/scenes/ritual.ts`
- Modify: `e2e/showcase.spec.ts` (replace one test), `src/scenes/showcase.ts` (remove turntable code), `src/main.ts` (boot wiring), `src/styles/sections.css` (ritual-live block; drop canvas from showcase rules), `docs/turntable-prompts.md` (one note)

**Interfaces:**
- Produces: `initRitual(reduced: boolean): void` from `src/scenes/ritual.ts`; DOM contract `.ritual.ritual-live`, `.ritual__canvas`, `.step.active`.
- Consumes: existing `#ritual` DOM (`.wrap > .head + .steps > .step ×3`), fizz frames at `public/brand/turntable/fizz/` (real assets exist in the repo: manifest `{"frames":48,"width":442,"height":726}`).

- [ ] **Step 1: Create `e2e/ritual.spec.ts` (red first)**

```ts
import { test, expect } from '@playwright/test'

test.describe('ritual rotation scene (JS, desktop)', () => {
  test('pins with rotating canvas and progressive step reveal', async ({ page }) => {
    await page.goto('./')
    const section = page.locator('.ritual')
    await expect(section).toHaveClass(/ritual-live/) // real fizz frames ship in the repo
    await expect(page.locator('.ritual__canvas')).toBeVisible()
    const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // pin start: step 1 on, steps 2+3 off
    await page.evaluate((t) => window.scrollTo(0, t + 0.05 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(0)).toHaveClass(/active/)
    await expect(page.locator('.step').nth(1)).not.toHaveClass(/active/)
    // middle: step 2 joins, step 3 still off
    await page.evaluate((t) => window.scrollTo(0, t + 0.5 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(1)).toHaveClass(/active/)
    await expect(page.locator('.step').nth(2)).not.toHaveClass(/active/)
    // near the end: all three on
    await page.evaluate((t) => window.scrollTo(0, t + 0.9 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(2)).toHaveClass(/active/)
    // scrolling back hides later steps again
    await page.evaluate((t) => window.scrollTo(0, t + 0.05 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(2)).not.toHaveClass(/active/)
  })

  test('no manifest: static fallback, no pin, steps reveal normally', async ({ page }) => {
    await page.route('**/brand/turntable/fizz/manifest.json', (route) => route.fulfill({ status: 404 }))
    await page.goto('./')
    await page.locator('.ritual').scrollIntoViewIfNeeded()
    await expect(page.locator('.ritual')).not.toHaveClass(/ritual-live/)
    await expect(page.locator('.ritual__canvas')).toHaveCount(0)
    await expect(page.locator('.step').nth(2)).toHaveClass(/\bin\b/)
  })

  test('reduced motion: static fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./')
    await expect(page.locator('.ritual')).not.toHaveClass(/ritual-live/)
    await expect(page.locator('.ritual__canvas')).toHaveCount(0)
    await expect(page.locator('.step').nth(2)).toBeVisible()
  })
})
```

- [ ] **Step 2: Replace the turntable test in `e2e/showcase.spec.ts`**

Delete the whole test `'turntable manifest upgrades the active drink to canvas scrub'` (lines 27–47) and put this in its place:

```ts
  test('stage is always the static photo (rotation lives in the ritual)', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__img')).toBeVisible()
    await expect(page.locator('.showcase__canvas')).toHaveCount(0)
  })
```

- [ ] **Step 3: Run red**

Run: `npm run build && npx playwright test e2e/ritual.spec.ts e2e/showcase.spec.ts`
Expected: ritual test 1 FAILS (`ritual-live` never appears); showcase static test FAILS (`.showcase__canvas` count is 1). The two fallback ritual tests may already pass. Record the failures.

- [ ] **Step 4: Create `src/scenes/ritual.ts`**

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface TurntableManifest {
  frames: number
  width: number
  height: number
}

const STEP_THRESHOLDS = [0, 0.33, 0.66]

export function initRitual(reduced: boolean): void {
  if (reduced) return
  if (matchMedia('(max-width: 860px)').matches) return
  const section = document.querySelector<HTMLElement>('.ritual')
  const stepsWrap = section?.querySelector<HTMLElement>('.steps')
  if (!section || !stepsWrap) return
  const steps = Array.from(stepsWrap.querySelectorAll<HTMLElement>('.step'))
  if (steps.length !== STEP_THRESHOLDS.length) return

  // the scene exists only when fizz turntable frames ship — otherwise the
  // static three-step row stays exactly as-is
  fetch(`${import.meta.env.BASE_URL}brand/turntable/fizz/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<TurntableManifest>) : null))
    .then((manifest) => {
      if (manifest?.frames) activate(manifest)
    })
    .catch(() => {})

  function activate(manifest: TurntableManifest): void {
    gsap.registerPlugin(ScrollTrigger)
    const frames = Array.from({ length: manifest.frames }, (_, f) => {
      const img = new Image()
      img.src = `${import.meta.env.BASE_URL}brand/turntable/fizz/frame-${String(f + 1).padStart(3, '0')}.webp`
      return img
    })

    const canvas = document.createElement('canvas')
    canvas.className = 'ritual__canvas'
    canvas.width = manifest.width
    canvas.height = manifest.height
    stepsWrap.before(canvas)
    const ctx = canvas.getContext('2d')
    section.classList.add('ritual-live')

    function draw(p: number): void {
      if (!ctx) return
      const idx = Math.min(frames.length - 1, Math.floor(p * frames.length))
      const frame = frames[idx]
      if (!frame.complete || frame.naturalWidth === 0) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
    }
    frames[0].addEventListener('load', () => draw(0))
    draw(0)

    const setActive = (p: number): void => {
      steps.forEach((step, i) => step.classList.toggle('active', p >= STEP_THRESHOLDS[i]))
    }
    setActive(0)

    ScrollTrigger.create({
      id: 'ritual',
      trigger: section,
      start: 'top top',
      end: '+=250%',
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const p = Math.min(0.999, self.progress)
        draw(p)
        setActive(p)
      },
    })
  }
}
```

- [ ] **Step 5: Strip the turntable code from `src/scenes/showcase.ts`**

Replace the entire file with:

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
      activate(Math.floor(p * SEGMENTS))
    },
  })

  // thumbnail click/keyboard jumps to that drink's scroll segment
  items.forEach((item, i) => {
    const jump = (): void => {
      window.scrollTo(0, st.start + ((st.end - st.start) * (i + 0.5)) / SEGMENTS)
    }
    item.setAttribute('tabindex', '0')
    item.setAttribute('role', 'button')
    item.setAttribute('aria-label', `Zobrazit ${item.dataset.name ?? ''}`)
    item.addEventListener('click', jump)
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        jump()
      }
    })
  })
}
```

- [ ] **Step 6: Wire ritual into `src/main.ts`**

Replace the `try` block of `boot()` with:

```ts
  try {
    const [{ initScroll }, { initShowcase }, { initRitual }] = await Promise.all([
      import('./scroll'),
      import('./scenes/showcase'),
      import('./scenes/ritual'),
    ])
    initScroll(reduced)
    initShowcase(reduced)
    initRitual(reduced)
  } catch (err) {
```

(the `catch` safety net stays unchanged.)

- [ ] **Step 7: CSS — ritual-live block in, showcase canvas out**

In `src/styles/sections.css`:

1. In the `/* ===== ritual ===== */` block, append after the last `.step p{…}` rule:

```css
/* ritual live scene (pinned rotation; the static row above is the fallback) */
.ritual-live{padding-block:clamp(2rem,4vw,3rem)}
.ritual-live .wrap{display:grid;grid-template-columns:auto minmax(0,26rem);justify-content:center;column-gap:clamp(2.5rem,6vw,5rem);align-items:center}
.ritual-live .head{grid-column:1/-1;justify-self:center;text-align:center;margin-bottom:1.5rem}
.ritual__canvas{height:min(56vh,500px);width:auto;justify-self:center}
.ritual-live .steps{grid-template-columns:1fr;gap:1.8rem;margin-top:0}
.js .ritual-live .step{opacity:0;transform:translateY(18px);transition:opacity .5s var(--ease),transform .5s var(--ease)}
.js .ritual-live .step.active{opacity:1;transform:none}
```

(The `.js .ritual-live .step` pair must come AFTER the generic `.js .reveal.in` rules in source order — placing it inside the ritual block satisfies that. Step numerals need no extra rules: hiding the step container hides them.)

2. Remove `.showcase__canvas` from the two showcase rules:
   - `.showcase__img,.showcase__canvas{grid-area:1/1;height:min(48vh,430px);width:auto;justify-self:center}` → `.showcase__img{grid-area:1/1;height:min(48vh,430px);width:auto;justify-self:center}`
   - `.showcase__stage.swap .showcase__img,.showcase__stage.swap .showcase__canvas,.showcase__stage.swap .showcase__cap{animation:swapfade .35s var(--ease)}` → `.showcase__stage.swap .showcase__img,.showcase__stage.swap .showcase__cap{animation:swapfade .35s var(--ease)}`

- [ ] **Step 8: Update `docs/turntable-prompts.md`**

Replace the first paragraph (`Cíl: 360° rotace drinku pro scroll showcase…`) with:

```markdown
Cíl: 360° rotace drinku pro pinned scénu v sekci Rituál („Tři kroky
k dokonalé matche"). Rotace používá pouze **fizz** — frames ostatních
drinků nejsou potřeba, dokud Rituál nedostane přepínač drinků. Web je
připravený — stačí vygenerovat klip, prohnat ho skriptem a commitnout
výstup. Žádná změna kódu.
```

- [ ] **Step 9: Run green**

Run: `npm run build && npx playwright test e2e/ritual.spec.ts e2e/showcase.spec.ts`
Expected: all 9 tests in the two files PASS. If the progressive-step assertions flake, check the `2.5` factor matches `end: '+=250%'` before adding waits.

- [ ] **Step 10: Full suite**

Run: `npm run e2e`
Expected: 26/26 (23 before − 1 replaced + 1 replacement + 3 new = 26). Watch `visual.spec` (two pins on the page now) and `scroll.spec`.

- [ ] **Step 11: Visual check**

Read `test-results/desktop-full.png`: the Rituál should show the drink beside the step column (whatever scrub state the capture caught), the showcase stage must be a static photo with no white card, and the footer must sit intact below both pins. Mobile: unchanged static layout in both sections.

- [ ] **Step 12: Commit**

```bash
git add e2e/ritual.spec.ts e2e/showcase.spec.ts src/scenes/ritual.ts src/scenes/showcase.ts src/main.ts src/styles/sections.css docs/turntable-prompts.md
git commit -m "feat: ritual rotation scene — pinned fizz turntable with progressive steps; showcase back to static

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Verification sweep

**Files:** none (verification only; report problems, do not fix)

- [ ] **Step 1: Full pipeline**

Run: `npm run build && npm test && npm run e2e && npm run check:budgets`
Expected: build clean, vitest exit 0, 26/26, budget well under 120 kB gz.

- [ ] **Step 2: Screenshots**

Read `test-results/desktop-full.png` and `test-results/mobile-full.png` against the Step 11 checklist above, plus: no horizontal overflow, hero unchanged, both pinned sections release correctly (menu and visit sections render normally between/after them).

- [ ] **Step 3: Report**

Report results. Do NOT push or deploy — the controller handles publishing.
