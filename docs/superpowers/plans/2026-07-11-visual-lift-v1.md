# Visual Lift v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hero shows the drink, menu cards get per-drink art + accent colors, hover polish, oxblood bridge panel.

**Architecture:** Pure HTML + CSS on top of shipped assets — every image reuses an existing `public/ritual/**/frame-*.webp`. No JS changes, no new renders.

**Tech Stack:** index.html, src/styles/sections.css (+ hero styles file if separate — check where `.hero` lives).

**Spec:** `docs/superpowers/specs/2026-07-11-visual-lift-v1-design.md`

## Global Constraints

- No new image assets; reuse `ritual/frame-036.webp` (hero) and `ritual/<drink>/frame-040.webp` (cards).
- HTML `src` uses `/ritual/...` absolute form (Vite rewrites HTML with base `/tamatcha/` — verify in dist).
- All new motion guarded by `prefers-reduced-motion`.
- Full e2e must stay green (`npm run e2e`, 25 tests).
- Visual gates: screenshot + Read the image, judge against the audit shots.

---

### Task 1: Hero drink visual

**Files:**
- Modify: `index.html` (hero section)
- Modify: hero CSS (find `.hero` rules — likely `src/styles/sections.css` or `hero.css`)

- [ ] **Step 1:** Locate the hero markup/CSS. Add inside the hero section (after the copy container, before scroll indicator):

```html
<img class="hero__drink" src="/ritual/frame-036.webp" alt="" aria-hidden="true" width="900" height="1180" fetchpriority="high">
```

- [ ] **Step 2:** CSS (place with hero rules):

```css
.hero__drink{position:absolute;right:4vw;top:50%;width:min(36vw,460px);height:auto;transform:translateY(-50%);pointer-events:none;z-index:1;filter:drop-shadow(0 30px 60px rgba(0,0,0,.35));animation:drinkFloat 7s ease-in-out infinite}
@keyframes drinkFloat{0%,100%{transform:translateY(-52%) rotate(-1.2deg)}50%{transform:translateY(-48%) rotate(1.2deg)}}
@media (max-width:900px){.hero__drink{display:none}}
@media (prefers-reduced-motion:reduce){.hero__drink{animation:none}}
```

Check hero stacking: sim canvas z-index vs copy z-index — drink sits above canvas, below/beside copy (adjust z-index to match actual values found).

- [ ] **Step 3:** Build; screenshot hero desktop 1400×900 + 1100×800 (narrower desktop) + mobile 390 (drink hidden). Judge: drink doesn't collide with copy or nav, floats subtly, LCP not the drink on mobile.
- [ ] **Step 4:** Commit `feat: hero shows the iced-matcha glass (reuses ritual frame)`.

---

### Task 2: Menu cards — drink art + accent colors

**Files:**
- Modify: `index.html` (4 `.mcard`s)
- Modify: `src/styles/sections.css` (mcard rules)

- [ ] **Step 1:** Each card: add accent + art. Example (fizz card; repeat for all 4 with their frame + accent):

```html
<article class="mcard reveal" data-d="1" style="--accent:#c26a1a">
  ...existing content...
  <img class="mcard__drink" src="/ritual/fizz/frame-040.webp" alt="" aria-hidden="true" loading="lazy" width="900" height="1180">
</article>
```

cloud `--accent:#c25563` + `/ritual/cloud/frame-040.webp`; latte `--accent:#4c8a20` + `/ritual/latte/frame-040.webp`; mate `--accent:#a04c12` + `/ritual/mate/frame-040.webp`.

- [ ] **Step 2:** CSS:

```css
.mcard{position:relative;overflow:hidden;border-top:3px solid var(--accent,var(--matcha))}
.mcard__drink{position:absolute;right:-30px;bottom:-40px;width:150px;pointer-events:none;filter:drop-shadow(0 12px 24px rgba(14,39,28,.25))}
.mcard::after{content:"";position:absolute;right:-60px;bottom:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(14,39,28,.16),transparent 65%);pointer-events:none}
.mcard .price{color:var(--accent,inherit)}
```

(::after paints the contrast blob — ensure it's UNDER the img: give .mcard__drink `z-index:1`. Reserve right padding on text: `.mcard__top,.mcard .formula,.mcard .desc{padding-right:120px}` — adjust after seeing it; chips can run full width.)

- [ ] **Step 3:** Build; screenshot menu desktop + mobile. Judge: glass reads against cream (blob strong enough), no text overlap, accents subtle not garish, cards equal height OK.
- [ ] **Step 4:** Commit `feat: menu cards show their drink render + per-drink accent`.

---

### Task 3: Hover polish + oxblood bridge

**Files:**
- Modify: `src/styles/sections.css`

- [ ] **Step 1:** Card + gallery hover (find `.ig__tile` rules; respect existing transitions):

```css
.mcard{box-shadow:0 10px 30px rgba(14,39,28,.08);transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.mcard:hover{transform:translateY(-4px);box-shadow:0 18px 44px rgba(14,39,28,.14)}
.ig__tile{overflow:hidden}
.ig__tile img{transition:transform .5s var(--ease)}
.ig__tile:hover img{transform:scale(1.04)}
@media (prefers-reduced-motion:reduce){.mcard,.ig__tile img{transition:none}.mcard:hover{transform:none}.ig__tile:hover img{transform:none}}
```

- [ ] **Step 2:** Oxblood bridge — find the "Drink zdarma?" callout styles (`.gift`/`.callout` — grep index.html near "Drink zdarma") and switch bg to `var(--oxblood)`, text to cream, icon tile tinted to suit. Judge contrast (cream on #43201D passes AA).
- [ ] **Step 3:** Build; screenshots: menu hover state (Playwright `.hover()`), galerie, navstiv+footer. Judge: bridge reads intentional, hovers feel subtle.
- [ ] **Step 4:** Commit `feat: hover polish + oxblood bridge panel before footer`.

---

### Task 4: Verify + deploy

- [ ] **Step 1:** `npm run build && npm test && npm run e2e` — all green; check dist/index.html has `/tamatcha/ritual/...` rewritten URLs.
- [ ] **Step 2:** Full before/after screenshot pass (hero, menu, galerie, bottom; desk + mob).
- [ ] **Step 3:** Push, watch Actions, verify live hero image 200 + visual spot-check.
