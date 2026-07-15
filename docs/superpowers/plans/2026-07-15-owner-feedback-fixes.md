# Owner Feedback Fixes (2026-07-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the café owner's feedback to tamatcha.cz — correct drink compositions, ritual steps, opening hours, contact email, "ceremoniální" wording, swapped latte photos, removed free-drink promo, lowercase footer brand, and a replaced about-section photo.

**Architecture:** Single static page (`index.html`) styled by `src/styles/*.css`, with Playwright e2e specs in `e2e/` asserting the exact copy. Every copy change is TDD: update the spec expectation first, watch it fail, edit the HTML, watch it pass. Image changes go through the existing sharp pipelines (`scripts/brand-assets.mjs`, `scripts/optimize-images.mjs`).

**Tech Stack:** Vite 8 + TypeScript, Playwright e2e, sharp image pipeline. No framework — plain HTML/CSS with GSAP scenes that read the DOM.

## Global Constraints

- All visitor-facing copy is Czech with full diacritics; use the exact strings given in each task, verbatim.
- Drink compositions must match the owner's current flyer exactly (it is mirrored in `source-photos/post2_menu.jpg`).
- Prices are unchanged: 119,- Kč / 119,- Kč / 119,- Kč / 79,- Kč, all 450 ml.
- `src/scenes/ritual.ts:19` requires exactly **3** `.step` elements and `src/scenes/showcase.ts:13` requires exactly **5** `.lineup__item` elements — do not change those counts.
- Playwright's webServer runs `npm run preview`, which serves `dist/` — always run `npm run build` before `npm run e2e`.
- New wording rule: „prémiová" nikdy — every former "Prémiová/prémiová" label becomes "Ceremoniální/ceremoniální".
- Owner requests intentionally NOT implemented: the "molotovy" remark (a joke about the new email address — nothing to build).

## Context for the implementer

The owner (Martin's friend, who runs the bar) sent feedback + a photo of the current printed menu. The site at `index.html` predates that menu. The e2e spec `e2e/menu.spec.ts` currently asserts the *opposite* of the flyer ("screens wording, not flyer wording") — that intent is now obsolete and flips in Task 3. Reference commands:

- Build: `npm run build`
- One spec: `npm run e2e -- e2e/content.spec.ts`
- Full suite: `npm run e2e`

---

### Task 1: „Prémiová" → „Ceremoniální" everywhere

**Files:**
- Modify: `index.html:7,10,49,50,84,184`
- Test: `e2e/content.spec.ts`

**Interfaces:**
- Produces: the `MUST_NOT` array in `e2e/content.spec.ts` that Tasks 2–6 append to.

- [ ] **Step 1: Update the spec — expect ceremonial wording, forbid the old**

In `e2e/content.spec.ts`, change line 4 and add a `MUST_NOT` list plus its assertion loop:

```ts
const MUST_HAVE = [
  'Ceremoniální matcha', 'čerstvě našleháno.', 'První Matcha Bar v Ostravě',
  'Z Kagoshimy',
  'Matcha Fizz', 'Matcha Cloud', 'Iced / Hot Matcha Latté', 'Iced Yerba Maté',
  '( matcha, soda, pyré dle výběru )', 'Pistácie',
  '450 ml', '119,- Kč', '79,- Kč',
  'Prosíváme', 'Šleháme', 'Podáváme',
  'Na Hradbách 1481/6', '+420 605 000 456', 'Drink zdarma?',
  '© 2026 Tamatcha · Ostrava',
]

const MUST_NOT = [
  'Prémiová', 'prémiová',
]
```

And inside **both** tests (with-JS and no-JS), after the `MUST_HAVE` loop add:

```ts
for (const s of MUST_NOT) expect(text, `stale copy: ${s}`).not.toContain(s)
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: FAIL — `missing: Ceremoniální matcha` (and/or `stale copy: Prémiová`).

- [ ] **Step 3: Replace the wording in `index.html`**

Six replacements:

Line 7 (meta description):
```html
<meta name="description" content="První matcha bar v Ostravě. Ceremoniální matcha té nejvyšší kvality z prefektury Kagoshima — Matcha Fizz, Cloud, latté i Yerba Maté. Na Hradbách 1481/6, Ostrava-Centrum.">
```

Line 10 (og:description):
```html
<meta property="og:description" content="Ceremoniální matcha té nejvyšší kvality z prefektury Kagoshima, čerstvě našleháno v centru Ostravy.">
```

Line 49 (h1):
```html
<h1 class="reveal" data-d="1">Ceremoniální matcha,<em>čerstvě našleháno.</em></h1>
```

Line 50 (hero subtitle):
```html
<p class="hero__sub reveal" data-d="2">Ceremoniální matcha té nejvyšší kvality z prefektury <b>Kagoshima</b> — v ledovém fizzu, nadýchaném cloudu i sametovém latté.</p>
```

Line 84 (about prop — "ceremoniální kvalita" is the standard Czech term for ceremonial grade):
```html
<div><h3>Ceremoniální kvalita</h3><p>Matcha nejvyšší jakosti přímo z prefektury Kagoshima.</p></div>
```

Line 184 (lineup lead):
```html
<p class="lead">Ceremoniální matcha té nejvyšší kvality z prefektury Kagoshima.</p>
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add index.html e2e/content.spec.ts
git commit -m "fix: replace 'prémiová' with 'ceremoniální' across all copy per owner"
```

---

### Task 2: Ritual steps = prosátí → pasta → došlehání

The current steps describe sift → whisk → serve. The owner's correction: the three steps of perfect matcha are sifting, making a paste, and finishing the whisk — they describe matcha preparation, not drink serving.

**Files:**
- Modify: `index.html:113-126` (`.steps` block)
- Test: `e2e/content.spec.ts`

**Interfaces:**
- Consumes: `MUST_NOT` array from Task 1.
- Produces: nothing downstream. (`src/scenes/ritual.ts` only counts `.step` elements — 3 stay 3, no TS change.)

- [ ] **Step 1: Update the spec**

In `e2e/content.spec.ts` `MUST_HAVE`, replace the line `'Prosíváme', 'Šleháme', 'Podáváme',` with:

```ts
  'Prosíváme', 'Mícháme pastu', 'Došleháváme',
```

Append to `MUST_NOT`:

```ts
  'Podáváme',
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: FAIL — `missing: Mícháme pastu`.

- [ ] **Step 3: Rewrite the three steps in `index.html`**

Replace the three `.step` divs (lines 114–125) with:

```html
        <div class="step reveal" data-d="1">
          <span class="step__n" aria-hidden="true">01</span>
          <h3>Prosíváme</h3><p>Ceremoniální matchu nejdřív prosejeme přes jemné sítko, aby v ní nezůstala jediná hrudka.</p>
        </div>
        <div class="step reveal" data-d="2">
          <span class="step__n" aria-hidden="true">02</span>
          <h3>Mícháme pastu</h3><p>Prosátou matchu rozmícháme s trochou vody do hladké, sytě zelené pasty.</p>
        </div>
        <div class="step reveal" data-d="3">
          <span class="step__n" aria-hidden="true">03</span>
          <h3>Došleháváme</h3><p>Bambusovým chasenem pastu došleháme do sametově jemné pěny — základ každého našeho drinku.</p>
        </div>
```

Section heading `Tři kroky k dokonalé matche` and eyebrow `Připraveno obřadně` stay as they are.

- [ ] **Step 4: Run the spec to verify it passes**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html e2e/content.spec.ts
git commit -m "fix: ritual steps describe matcha prep — sift, paste, finish whisk"
```

---

### Task 3: Drink compositions per the current flyer

Current flyer (see `source-photos/post2_menu.jpg` and the owner's photo): Fizz uses **tonic** (not soda); Cloud is **kokosová voda + posyp** (not mléko) with flavors **Jahoda / Borůvka / Bez pyré**; Latté is **ovesné/mandlové mléko** with **Kokos** instead of Pistácie; Yerba Maté unchanged.

**Files:**
- Modify: `index.html:141-142,150-151,159-160,187-190`
- Test: `e2e/menu.spec.ts`, `e2e/content.spec.ts`, `e2e/showcase.spec.ts`

**Interfaces:**
- Consumes: `MUST_NOT` array from Task 1.
- Produces: the exact formula strings that `data-formula` attributes and `.showcase__formula` assertions share:
  - Fizz: `( matcha, tonic, pyré dle výběru )`
  - Cloud: `( matcha cloud, kokosová voda, pyré dle výběru, posyp )`
  - Latté: `( matcha, ovesné/mandlové mléko, sirup dle výběru, posyp )`
  - Yerba: `( yerba maté, pyré dle výběru )` (unchanged)

- [ ] **Step 1: Flip `e2e/menu.spec.ts` — the site must now match the flyer**

Replace the second test entirely:

```ts
test('menu matches the current flyer wording', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('#menu').innerText()
  expect(text).toContain('( matcha, tonic, pyré dle výběru )')
  expect(text).toContain('( matcha cloud, kokosová voda, pyré dle výběru, posyp )')
  expect(text).toContain('( matcha, ovesné/mandlové mléko, sirup dle výběru, posyp )')
  expect(text).toContain('Kokos')
  expect(text).not.toContain('soda')
  expect(text).not.toContain('Pistácie')
})
```

- [ ] **Step 2: Update `e2e/content.spec.ts`**

In `MUST_HAVE`, replace `'( matcha, soda, pyré dle výběru )', 'Pistácie',` with:

```ts
  '( matcha, tonic, pyré dle výběru )', 'Kokos',
```

Append to `MUST_NOT`:

```ts
  'Pistácie', 'soda',
```

- [ ] **Step 3: Update `e2e/showcase.spec.ts` line 8**

```ts
    await expect(page.locator('.showcase__formula')).toHaveText('( matcha, tonic, pyré dle výběru )')
```

- [ ] **Step 4: Run the three specs to verify they fail**

Run: `npm run build && npm run e2e -- e2e/menu.spec.ts e2e/content.spec.ts e2e/showcase.spec.ts`
Expected: FAIL on the new tonic/kokosová voda/Kokos expectations.

- [ ] **Step 5: Update the menu cards in `index.html`**

Fizz card (line 141) — formula only, flavors unchanged:
```html
            <p class="formula">( matcha, tonic, pyré dle výběru )</p>
```

Cloud card (lines 150–151) — formula and flavors:
```html
            <p class="formula">( matcha cloud, kokosová voda, pyré dle výběru, posyp )</p>
            <ul class="flavors"><li>Jahoda</li><li>Borůvka</li><li>Bez pyré</li></ul>
```

Latté card (lines 159–160) — formula and flavors (Pistácie → Kokos):
```html
            <p class="formula">( matcha, ovesné/mandlové mléko, sirup dle výběru, posyp )</p>
            <ul class="flavors"><li>Vanilka</li><li>Čokoláda</li><li>Jahoda</li><li>Lískooříšek</li><li>Karamel</li><li>Kokos</li></ul>
```

- [ ] **Step 6: Update the lineup `data-formula` attributes (lines 187–190)**

- `data-drink="fizz"` figure: `data-formula="( matcha, tonic, pyré dle výběru )"`
- `data-drink="latte-iced"` figure: `data-formula="( matcha, ovesné/mandlové mléko, sirup dle výběru, posyp )"`
- `data-drink="latte-hot"` figure: `data-formula="( matcha, ovesné/mandlové mléko, sirup dle výběru, posyp )"`
- `data-drink="cloud"` figure: `data-formula="( matcha cloud, kokosová voda, pyré dle výběru, posyp )"`
- `data-drink="yerba"` figure: unchanged.

- [ ] **Step 7: Run the specs to verify they pass**

Run: `npm run build && npm run e2e -- e2e/menu.spec.ts e2e/content.spec.ts e2e/showcase.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add index.html e2e/menu.spec.ts e2e/content.spec.ts e2e/showcase.spec.ts
git commit -m "fix: drink compositions match current menu — tonic, kokosová voda, Kokos"
```

---

### Task 4: Swap the hot/iced latte photos

The owner says the two latte photos are swapped. The pairing error originates in `scripts/brand-assets.mjs:21-27` (DSC00231/DSC00233 mapping). Fix both the generated files (by swapping them in place — the brand source package outside the repo may not be present) and the mapping (so a future regeneration stays correct). HTML references stay untouched; the menu card and hero, which reference `latte-iced-*`, automatically pick up the true iced photo.

**Files:**
- Modify: `public/brand/drinks/latte-iced-480.webp`, `latte-iced-880.webp`, `latte-hot-480.webp`, `latte-hot-880.webp` (contents swapped)
- Modify: `scripts/brand-assets.mjs:23,25`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — file names and HTML references are unchanged.

- [ ] **Step 1: Swap the four webp files**

```bash
cd /home/martin/projects/tamatcha/public/brand/drinks
for w in 480 880; do
  mv latte-iced-$w.webp _tmp-$w.webp
  mv latte-hot-$w.webp latte-iced-$w.webp
  mv _tmp-$w.webp latte-hot-$w.webp
done
```

- [ ] **Step 2: Fix the mapping in `scripts/brand-assets.mjs`**

```js
const DRINKS = [
  ['DSC00227.png', 'fizz'],
  ['DSC00231.png', 'latte-hot'],
  ['DSC00232.png', 'yerba'],
  ['DSC00233.png', 'latte-iced'],
  ['DSC00234.png', 'cloud'],
]
```

Also update the comment above it from `// mapping verified against the in-store screens (Obrazovky 1–7)` to `// hot/iced latte pairing corrected per owner feedback 2026-07-15`.

- [ ] **Step 3: Verify visually**

Open `public/brand/drinks/latte-iced-480.webp` and `latte-hot-480.webp` (Read tool or image viewer) and confirm they now differ from the pre-swap state: `latte-iced` shows the glass with the green matcha bloom sinking into milk; `latte-hot` shows the foam-capped glass with the red crumble on top. Then run `npm run build && npm run e2e -- e2e/lineup.spec.ts` — Expected: PASS (images still load).

- [ ] **Step 4: Commit**

```bash
git add public/brand/drinks scripts/brand-assets.mjs
git commit -m "fix: swap hot and iced latte photos per owner"
```

---

### Task 5: Remove the "Drink zdarma" promo

The Instagram free-drink offer no longer applies. Remove the card; keep the "Sledovat @tamatcha_ova" button in the lineup footer, now centered.

**Files:**
- Modify: `index.html:193-201` (`.lineup__foot`)
- Modify: `src/styles/sections.css:136-141,201`
- Test: `e2e/content.spec.ts`

**Interfaces:**
- Consumes: `MUST_NOT` array from Task 1.

- [ ] **Step 1: Update the spec**

In `e2e/content.spec.ts`, delete `'Drink zdarma?',` from `MUST_HAVE` and append to `MUST_NOT`:

```ts
  'Drink zdarma',
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: FAIL — `stale copy: Drink zdarma`.

- [ ] **Step 3: Remove the card from `index.html`**

Replace the whole `.lineup__foot` block (lines 193–201) with:

```html
      <div class="lineup__foot reveal">
        <a class="btn btn--primary" href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
          Sledovat @tamatcha_ova</a>
      </div>
```

- [ ] **Step 4: Prune the CSS in `src/styles/sections.css`**

Change line 136 to center the lone button:

```css
.lineup__foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:1.5rem;margin-top:3.2rem;border-top:1px solid var(--line);padding-top:2.2rem}
```

Delete the five `.freecard` rules (lines 137–141). In the mobile media query (line 201), delete the `.lineup__foot{flex-direction:column;align-items:flex-start}` override — centering works at all widths now.

- [ ] **Step 5: Run the spec to verify it passes**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html src/styles/sections.css e2e/content.spec.ts
git commit -m "feat: remove expired free-drink promo, center Instagram CTA"
```

---

### Task 6: Opening hours, contact email, lowercase footer brand

New hours: **Po–Pá 8:30–18:00, So 12:00–18:00, Ne zavřeno.** New contact email: **tamatcha@seznam.cz**. Footer copyright brand is lowercase **tamatcha**.

**Files:**
- Modify: `index.html:56-60` (hero meta), `index.html:220-228` (visit hours + contact), `index.html:244` (footer)
- Test: `e2e/content.spec.ts`

**Interfaces:**
- Consumes: `MUST_NOT` array from Task 1.

- [ ] **Step 1: Update the spec**

In `e2e/content.spec.ts` `MUST_HAVE`, replace the line containing `'Na Hradbách 1481/6', '+420 605 000 456',` and the footer line with:

```ts
  'Na Hradbách 1481/6', '+420 605 000 456', 'tamatcha@seznam.cz',
  '8:30–18:00', '12:00–18:00', 'zavřeno',
  '© 2026 tamatcha · Ostrava',
```

Append to `MUST_NOT`:

```ts
  '7:00–18:00', '9:00–18:00', '© 2026 Tamatcha',
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: FAIL — `missing: tamatcha@seznam.cz` (and hour strings).

- [ ] **Step 3: Update the hero meta (lines 56–60)**

```html
        <div class="hero__meta reveal" data-d="4">
          <span><b>Po–Pá</b> 8:30–18:00</span><span class="dot"></span>
          <span><b>So</b> 12:00–18:00</span><span class="dot"></span>
          <span><b>Ne</b> zavřeno</span><span class="dot"></span>
          <span>Na Hradbách 1481/6, Ostrava</span>
        </div>
```

- [ ] **Step 4: Update the visit section (lines 220–228)**

Hours block:
```html
        <div class="vblock reveal" data-d="2">
          <h3>Otevírací doba</h3>
          <p class="tnum">Po–Pá&nbsp;&nbsp;8:30–18:00<br>So&nbsp;&nbsp;12:00–18:00<br>Ne&nbsp;&nbsp;zavřeno</p>
        </div>
```

Contact block — email added between phone and Instagram:
```html
        <div class="vblock reveal" data-d="3">
          <h3>Kontakt</h3>
          <p><a href="tel:+420605000456" class="tnum">+420 605 000 456</a><br>
          <a href="mailto:tamatcha@seznam.cz">tamatcha@seznam.cz</a><br>
          <a href="https://www.instagram.com/tamatcha_ova/" target="_blank" rel="noopener">@tamatcha_ova</a></p>
        </div>
```

- [ ] **Step 5: Lowercase the footer brand (line 244)**

```html
    <span class="footer__c">© 2026 tamatcha · Ostrava — Matcha, poctivě. 🍵</span>
```

- [ ] **Step 6: Run the spec to verify it passes**

Run: `npm run build && npm run e2e -- e2e/content.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html e2e/content.spec.ts
git commit -m "fix: new opening hours, contact email, lowercase footer brand"
```

---

### Task 7: Replace the about-section photo

The owner wants the bar photo (`post5_bar` — him handing a drink over the counter) discarded. Best available replacement in `source-photos/` is `post4_fizz.jpg` (Maracuja Matcha Fizz being poured — a real photo, on-brand for the "čerstvě připravená" story). It has an Instagram caption baked into the bottom ~20%, so the pipeline crops it off. If the owner later sends a proper interior photo, drop it into `source-photos/` and rerun the same pipeline.

**Files:**
- Modify: `scripts/optimize-images.mjs`
- Modify: `index.html:96-103` (`.about__media` picture)
- Delete: `public/img/post5_bar-480.avif`, `post5_bar-480.jpg`, `post5_bar-480.webp`, `post5_bar-640.avif`, `post5_bar-640.jpg`, `post5_bar-640.webp`
- Create (generated): `public/img/post4_fizz-{480,640}.{avif,webp,jpg}`

**Interfaces:**
- Consumes: nothing.
- Produces: `public/img/post4_fizz-*` assets referenced only by the `.about__media` picture element.

- [ ] **Step 1: Extend the image pipeline with an optional crop**

Replace the body of `scripts/optimize-images.mjs` with:

```js
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'source-photos'
const OUT = 'public/img'
const jobs = [
  // crop trims the baked-in IG caption from the bottom of the frame
  { file: 'post4_fizz.jpg', widths: [480, 640], crop: { left: 0, top: 0, width: 640, height: 880 } },
]

await mkdir(OUT, { recursive: true })
for (const { file, widths, crop } of jobs) {
  const base = path.parse(file).name
  for (const w of widths) {
    let img = sharp(path.join(SRC, file))
    if (crop) img = img.extract(crop)
    img = img.resize({ width: w, withoutEnlargement: true })
    await img.clone().avif({ quality: 55 }).toFile(`${OUT}/${base}-${w}.avif`)
    await img.clone().webp({ quality: 72 }).toFile(`${OUT}/${base}-${w}.webp`)
    await img.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${base}-${w}.jpg`)
    console.log(`${base}-${w} done`)
  }
}
```

- [ ] **Step 2: Generate and visually verify**

Run: `npm run assets:img`
Expected output: `post4_fizz-480 done`, `post4_fizz-640 done`.

Open `public/img/post4_fizz-640.webp` (Read tool) and confirm: the glass and pouring hand are fully in frame and **no caption text** ("Maracuja Matcha Fizz") remains at the bottom. If text is still visible, reduce `height` in the crop (e.g. 850) and rerun.

- [ ] **Step 3: Point the about section at the new photo**

Replace the `<picture>` block in `index.html` (lines 97–101) with (640×880 → displayed 420×578, keep the width/height ratio honest):

```html
        <picture>
          <source type="image/avif" srcset="/img/post4_fizz-480.avif 480w, /img/post4_fizz-640.avif 640w" sizes="(min-width: 900px) 420px, 90vw">
          <source type="image/webp" srcset="/img/post4_fizz-480.webp 480w, /img/post4_fizz-640.webp 640w" sizes="(min-width: 900px) 420px, 90vw">
          <img src="/img/post4_fizz-640.jpg" alt="Maracuja Matcha Fizz — matcha se přelévá přes led do sklenice" width="420" height="578" loading="lazy">
        </picture>
```

The `📍 Ostrava-Centrum` tag span stays.

- [ ] **Step 4: Remove the discarded photo's generated files**

```bash
rm public/img/post5_bar-480.avif public/img/post5_bar-480.jpg public/img/post5_bar-480.webp \
   public/img/post5_bar-640.avif public/img/post5_bar-640.jpg public/img/post5_bar-640.webp
```

(`source-photos/post5_bar.jpg` stays as archive; it is no longer referenced or deployed.)

- [ ] **Step 5: Verify the page**

Run: `npm run build && npm run e2e`
Expected: full suite PASS. Then `npm run preview` and load `http://localhost:4173/tamatcha/` — the O nás section shows the fizz pour, rounded corners, tag overlay intact, no giant layout shift.

- [ ] **Step 6: Commit**

```bash
git add scripts/optimize-images.mjs index.html public/img
git commit -m "feat: replace about photo with fizz pour per owner request"
```

---

### Task 8: Full verification + deploy to tamatcha.cz

**Files:** none modified — verification and release only.

**Interfaces:**
- Consumes: all prior tasks committed.

- [ ] **Step 1: Full check**

Run: `npm run build && npm run e2e && npm run check:budgets`
Expected: build clean, all e2e specs PASS, budgets within limits.

- [ ] **Step 2: Eyeball the built page**

`npm run preview`, open `http://localhost:4173/tamatcha/` desktop + mobile viewport. Checklist: ceremoniální wording in hero/about/lineup, three new ritual steps, tonic/kokosová voda/Kokos in menu, swapped latte photos under correct captions in „Celá sestava", no Drink zdarma card, new hours in hero + visit, email link works (`mailto:`), footer `© 2026 tamatcha`.

- [ ] **Step 3: Push and deploy**

```bash
git push
```

Then deploy to production with the project's `deploy` skill (`scripts/deploy-ceskyhosting.sh` — pushing to GitHub does NOT update tamatcha.cz). Confirm with Martin before deploying if executing autonomously.

- [ ] **Step 4: Verify live**

Open https://tamatcha.cz — spot-check the same checklist as Step 2, plus hard-refresh to bypass cache.

---

## Self-review notes

- Feedback item → task mapping: ritual steps → T2; swapped latte images → T4; free drink removal → T5; hours → T6; email → T6; lowercase footer → T6; prémiová→ceremoniální → T1; discard bar photo → T7; Pistácie→Kokos → T3; updated compositions flyer → T3. Molotov remark — intentionally no task (joke).
- `e2e/menu.spec.ts`'s "not flyer wording" intent is deliberately inverted in T3 — the flyer is now the source of truth per the owner.
- `src/scenes/ritual.ts` and `showcase.ts` read the DOM generically (counts + data attributes); no TS changes needed anywhere.
- The `MUST_NOT` guard grows per task, so tests stay green at every commit boundary.
