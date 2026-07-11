# Visual lift v1 — hero drink, menu drink art, cohesion polish

**Date:** 2026-07-11 · **Status:** approved by Martin (all three parts)

## Goal

Three complementary visual improvements found by a full-site audit: the hero
sells matcha with no drink imagery (right half is empty), the menu cards are
flat cream-on-cream with no per-drink identity, and the page lacks hover
micro-interactions while the oxblood footer color appears from nowhere.

Success: hero shows the product on first paint; each menu card is visually
distinct and tied to its Rituál variant; cards/gallery respond to hover; the
oxblood footer is bridged by the panel above it. Page weight stays flat (no
new image assets — reuse shipped Rituál frames). All existing e2e stay green.

## Parts

### 1. Hero drink visual
- `index.html`: decorative `<img>` (`.hero__drink`, `aria-hidden="true"`,
  `alt=""`) inside the hero, `src` = `ritual/frame-036.webp` (full glass,
  mid-rotation) — MUST go through `import.meta.env.BASE_URL`-safe absolute
  path at build time; since this is static HTML, use the plain relative form
  Vite rewrites (`/ritual/frame-036.webp` in HTML is rewritten by Vite) —
  verify in dist output that the base is applied.
- CSS: absolute right ~4vw, vertical center, width ~min(36vw, 460px),
  `pointer-events:none`, z-index above sim canvas below text. Gentle float
  keyframes (translateY ±10px, ~7s ease-in-out infinite, slight rotate).
- Hidden `@media (max-width:900px)`. No animation under
  `prefers-reduced-motion`.

### 2. Menu cards drink art + accents
- Each `.mcard` gets `<img class="mcard__drink">` reusing that drink's frame:
  fizz → `ritual/fizz/frame-040.webp`, cloud → `ritual/cloud/frame-040.webp`,
  latté → `ritual/latte/frame-040.webp`, maté → `ritual/mate/frame-040.webp`
  (lazy-loaded, decorative). Right-anchored, bleeding slightly past the card
  edge, `pointer-events:none`; card gets `overflow:hidden` +
  `position:relative`.
- Contrast helper: soft forest-tinted radial gradient blob behind the glass
  (pseudo-element or the img's drop area) so the milky render doesn't wash
  out on cream. Tune visually.
- Per-card accent custom property `--accent` (set inline per card class or
  style attr): fizz `#c26a1a`, cloud `#c25563`, latte `#4c8a20`, mate
  `#a04c12`. Used for: 3px top stripe on the card and the price number.
- Card text column narrows (~62%) so art doesn't overlap copy; chips wrap
  under the art. Mobile: art shrinks but stays.

### 3. Cohesion & micro-polish
- `.mcard`: soft shadow `0 10px 30px rgba(14,39,28,.08)`; hover
  `translateY(-4px)` + deeper shadow; `transition` transform/box-shadow.
- Gallery `.ig__tile img`: hover scale 1.04 inside `overflow:hidden` tile;
  subtle shadow on tile.
- Oxblood bridge: the "Drink zdarma?" callout in #navstiv switches from light
  green to `var(--oxblood)` bg with cream text (gift icon tile adjusts),
  visually bridging into the footer.
- All new transitions/animations disabled or reduced under
  `prefers-reduced-motion` (site pattern already exists — follow it).

## Non-goals

No new rendered assets, no copy changes, no layout restructuring of hero
text/nav/footer, no Rituál changes, no fluid-sim changes. Footer stays
oxblood (intentional brand token — "their footer bar").

## Verification

Build + full e2e (visual.spec layout sanity included); screenshots of hero,
menu, galerie, navstiv+footer at 1400×900 and 390×844 compared against the
audit shots; check dist HTML rewrote the frame URLs with the `/tamatcha/`
base; deploy; verify live.
