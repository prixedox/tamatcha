# Mobile Ritual Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mobile (≤860px), the Rituál Fizz rotation runs without pinning — scroll position through the viewport drives the frames; steps reveal normally.

**Architecture:** `initRitual` loses its mobile early-return; `activate()` branches: mobile gets a non-pinned scrub trigger (`start: 'top 85%'`, `end: 'bottom 15%'`) that only draws frames, desktop keeps the pinned scene unchanged. Canvas creation/drawing is shared.

**Tech Stack:** unchanged (GSAP ScrollTrigger, Playwright).

**Spec:** `docs/superpowers/specs/2026-07-13-ritual-rotation-design.md` (Dodatek section)

## Global Constraints

- Desktop pinned scene behavior unchanged (all 3 existing ritual tests must pass untouched).
- Mobile: section gets class `ritual-mobile` (never `ritual-live`); no pin; steps keep normal `.reveal` behavior — `.active` is never set on mobile.
- Reduced-motion and missing-manifest fallbacks unchanged (fully static).
- Suite 26 → 27. Commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; `git status --porcelain` clean of unrelated files before commit.
- `npm run e2e` serves `dist/` — build first.

---

### Task 1: Mobile no-pin rotation

**Files:**
- Modify: `src/scenes/ritual.ts` (full replacement below), `e2e/ritual.spec.ts` (append one describe), `src/styles/sections.css` (one rule)

- [ ] **Step 1: Append the failing test to `e2e/ritual.spec.ts`**

```ts
test.describe('mobile rotation (no pin)', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('canvas rotates with natural scroll, no pinned scene', async ({ page }) => {
    await page.goto('./')
    const section = page.locator('.ritual')
    await expect(section).toHaveClass(/ritual-mobile/)
    await expect(section).not.toHaveClass(/ritual-live/)
    await expect(page.locator('.ritual__canvas')).toBeVisible()
    // steps reveal via the normal mechanism; the .active choreography is desktop-only
    await section.scrollIntoViewIfNeeded()
    await expect(page.locator('.step').nth(2)).toHaveClass(/\bin\b/)
    await expect(page.locator('.step.active')).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Run red**

Run: `npm run build && npx playwright test e2e/ritual.spec.ts`
Expected: the new mobile test FAILS (`ritual-mobile` never appears — mobile currently early-returns); the 3 existing tests stay green.

- [ ] **Step 3: Replace `src/scenes/ritual.ts` with**

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
  const mobile = matchMedia('(max-width: 860px)').matches
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
    stepsWrap!.before(canvas)
    const ctx = canvas.getContext('2d')

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

    if (mobile) {
      // no pin on touch devices: the section scrolls naturally and its
      // transit through the viewport drives the rotation
      section!.classList.add('ritual-mobile')
      ScrollTrigger.create({
        id: 'ritual',
        trigger: section,
        start: 'top 85%',
        end: 'bottom 15%',
        scrub: true,
        onUpdate: (self) => draw(Math.min(0.999, self.progress)),
      })
      return
    }

    section!.classList.add('ritual-live')

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
      // this pin is created asynchronously (after the manifest fetch
      // resolves), which is always later than the showcase pin below it in
      // the DOM. GSAP's refresh() re-measures pinned triggers in creation
      // order, so without a higher refreshPriority the showcase's cached
      // start/end would be computed as if this pin didn't exist yet.
      refreshPriority: 1,
      onUpdate: (self) => {
        const p = Math.min(0.999, self.progress)
        draw(p)
        setActive(p)
      },
    })
    ScrollTrigger.refresh()
  }
}
```

- [ ] **Step 4: Add the mobile canvas rule to `src/styles/sections.css`**

Directly after the existing `.ritual__canvas{…}` rule add:

```css
.ritual-mobile .ritual__canvas{display:block;height:min(40vh,360px);width:auto;margin:0 auto 2rem}
```

- [ ] **Step 5: Run green**

Run: `npm run build && npx playwright test e2e/ritual.spec.ts`
Expected: 4/4 (3 existing + new mobile test).

- [ ] **Step 6: Full suite + budgets**

Run: `npm run e2e && npm run check:budgets`
Expected: 27/27; budget unchanged (~51 kB gz).

- [ ] **Step 7: Visual check**

Read `test-results/mobile-full.png`: the Rituál section on mobile shows the drink between the heading and the steps; layout otherwise unchanged; no overflow.

- [ ] **Step 8: Commit**

```bash
git add e2e/ritual.spec.ts src/scenes/ritual.ts src/styles/sections.css
git commit -m "feat: mobile ritual rotation — scroll-driven frames without pinning

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
