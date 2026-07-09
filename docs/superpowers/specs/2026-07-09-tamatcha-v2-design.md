# Tamatcha v2 — "Living Matcha" Design Spec

**Date:** 2026-07-09
**Status:** Approved by Martin (brainstorming session), pending spec review
**Implements for:** tamatcha.cz / GitHub Pages — Tamatcha, first matcha bar in Ostrava
**Supersedes:** v1 single-file site (kept in repo as `legacy/`)

## 1. Goal

Rebuild the Tamatcha one-pager as a **wow-effect dynamic site**: an interactive liquid-matcha hero plus a choreographed scroll journey, while keeping v1's content, Czech copy, brand identity, accessibility, and mobile-first discipline. The site must feel spectacular on first load *and* stay smooth on a mid-range Android phone.

**Success criteria:**
- First-visit reaction is "wow" (the fluid hero) on capable devices.
- All v1 content, copy, and facts preserved (see §8 Content inventory).
- Smooth ≥ ~55 fps scroll/interaction on a mid-range phone (tier system degrades before stuttering).
- Fully readable without JavaScript; respectful of `prefers-reduced-motion`.
- Deployable to GitHub Pages via GitHub Actions; later re-pointable to tamatcha.cz with DNS only.

## 2. Decisions made (with Martin)

| Decision | Choice |
|---|---|
| Deployment format | Vite static bundle (`dist/`), not single-file |
| Wow concept | Liquid WebGL hero **+** scroll-driven story through the page |
| Content & brand | Keep v1 content, Czech copy, palette, fonts; minor copy tweaks allowed where scenes need captions |
| Animated scene assets | Code-drawn (WebGL/canvas/SVG in brand palette); real photos only in gallery/menu contexts |
| Liquid tech | Real GPU fluid simulation (Navier-Stokes) with tiered fallback |
| Hosting | GitHub Pages (project site) via GitHub Actions; custom domain tamatcha.cz as a later DNS-only step |

## 3. Experience design (scene by scene)

Pacing principle: **wow → calm → wow → calm.** Two centerpieces (Hero, Rituál); everything else supports.

### 3.1 Hero — "the bowl" (centerpiece 1)
- Full-viewport WebGL fluid simulation, tinted in brand greens: deep forest base (`--forest-2`/`--forest`), dye injections in matcha greens (`--matcha`, `--matcha-deep`), touches of cream in the foam highlights.
- **Idle behavior:** an autonomous "whisk" — dye + force injected along a slowly precessing circular path — so the liquid rolls gently even with no input. Motion must read as *slow, thick liquid*, not water: high dye dissipation ≈ low, velocity dissipation tuned high, curl (vorticity) moderate.
- **Interaction:** pointer move / touch drag stirs the fluid (force + dye splat along the pointer path).
- **Overlay (real HTML, never canvas):** eyebrow "První matcha bar v Ostravě", H1 "Prémiová matcha — čerstvě našleháno.", sub-line, CTA buttons ("Prohlédnout menu", "Kde nás najdeš"), opening-hours meta strip, scroll cue. Text sits on a subtle scrim so contrast is guaranteed regardless of fluid state.
- **Scroll exit:** as the hero scrolls away, canvas opacity/saturation eases down (cheap, no extra sim work). The sim pauses entirely when the hero is off-screen (IntersectionObserver) and while the tab is hidden.

### 3.2 O nás (Kagošima) — calm
- Headline and paragraphs mask-reveal on scroll (clip-path sweep, once, not scrubbed).
- A hand-drawn SVG journey line (Kagoshima → Ostrava motif) draws itself via stroke-dashoffset, echoing v1's stroke accents.
- 2–3 code-drawn tea-leaf SVGs drift with gentle parallax (`translateY` tied to scroll, transform-only).
- The interior photo and the three "props" (Prémiová kvalita / Energie bez propadu / Čerstvě připravená) keep v1's reveal treatment, upgraded to GSAP.

### 3.3 Rituál — "three steps" (centerpiece 2)
- A **pinned viewport** (GSAP ScrollTrigger pin + scrub): scrolling advances a code-drawn scene through the three v1 steps, with the v1 step copy appearing alongside:
  1. **Prosíváme** — matcha powder particles sift down through a sieve, accumulating in a chawan (canvas particle system, brand greens on cream).
  2. **Šleháme** — water pours in, a chasen whisk spins, the liquid swirls and foam rises (2D canvas: layered arcs/ellipses + particles; NOT the WebGL sim — this scene is cheaper and art-directed).
  3. **Podáváme** — the bowl pours into a tall glass over ice cubes; garnish drops in; final glass matches the menu drink silhouette.
- Scrub is bidirectional (scrolling back reverses). Total pin distance ≈ 3 viewport heights.
- Mobile: same scenes, simplified particle counts.
- Reduced-motion / no-JS: the pin never activates; the section renders as v1 does — heading + three step cards with a static SVG illustration per step (the final frame of each scene).

### 3.4 Menu — characterful cards
- The four drink cards (content per §8). Each has a signature micro-animation in its card background, triggered on scroll-into-view and replayed on hover/tap:
  - **Matcha Fizz** — bubbles rising (small canvas or CSS-animated SVG circles).
  - **Matcha Cloud** — soft foam blobs drifting (blurred SVG ellipses).
  - **Iced/Hot Latté** — a milk-swirl marble gradient slowly rotating (CSS conic/radial gradient animation).
  - **Iced Yerba Maté** — a different green; leaf silhouettes drifting.
- Micro-animations are decorative, behind the text, low-contrast; cards stay fully readable static.

### 3.5 Galerie — the real photos
- Horizontal strip of the 6 IG tiles, draggable (pointer/touch) with momentum; subtle per-tile parallax on scroll. All tiles remain links to the IG profile.
- No-JS / reduced-motion: falls back to the v1 grid layout (CSS only).

### 3.6 Kde nás najdeš + patička — calm landing
- v1 content and layout, gentle GSAP reveals only. The stylized map card's route line draws itself on reveal.
- Footer identical in content to v1 (oxblood bottom bar stays).

### 3.7 Navigation
- v1 nav (logo, anchor links, IG link, burger on mobile), upgraded: background gains blur/tint after scrolling past the hero; active-section highlighting via ScrollTrigger.

## 4. Visual identity (carried from v1)

- **Palette:** the exact v1 `:root` tokens (forest `#183A2C`, forest-2 `#0E271C`, forest-3 `#21503C`, matcha `#8FB94B`, matcha-deep `#5E8A34`, cream `#ECE6D7`, cream-2 `#F4EFE4`, paper `#F8F4EB`, oxblood `#43201D`, ink `#1B241E`, plus the alpha variants) copied verbatim into `styles/tokens.css`.
- **Type:** Bricolage Grotesque (display) + Hanken Grotesk (body), reusing v1's self-hosted subset WOFF2 files (extracted from `fonts.css` data-URIs into real `.woff2` files in `public/fonts/`). Czech diacritics coverage already verified in v1.
- **Photos:** the 7 files in `source-photos/` re-encoded to AVIF + WebP + JPEG fallback at 2 sizes, served as `<picture>`; explicit width/height to prevent CLS.
- **Favicon + meta:** carry over v1's SVG favicon, title, description, OG tags, `theme-color`.

## 5. Architecture

- **Stack:** Vite + vanilla TypeScript. No UI framework. GSAP + ScrollTrigger (npm), Lenis for smooth scroll. Custom WebGL2 fluid sim (no three.js).
- **Repo layout after v2:**
  ```
  /                     Vite project root
  ├── index.html        full semantic content (works no-JS)
  ├── src/
  │   ├── main.ts       boot: tier detect → init modules
  │   ├── tiers.ts      capability detection + tier decision
  │   ├── fluid/        sim.ts, shaders.ts, splat/whisk logic
  │   ├── scenes/       ritual.ts, menu-cards.ts, gallery.ts
  │   ├── scroll.ts     Lenis + GSAP ScrollTrigger wiring, reveals
  │   └── styles/       tokens.css, base.css, sections/*.css
  ├── public/fonts/     woff2 subsets
  ├── public/img/       optimized photos
  ├── legacy/           v1 files (template.html, build.py, index.html …)
  └── .github/workflows/deploy.yml
  ```
- **Progressive enhancement contract:** `index.html` contains all content, semantic and styled, with animations layered on by JS. The `js` class on `<html>` gates any style that hides content pre-reveal (v1's pattern).
- **Module isolation:** each scene module exposes a single `init...` function taking only what it needs (tier / reduced-motion flag); modules find their own DOM root and do not import each other (shared imports limited to `tiers.ts` and gsap).

## 6. Fluid sim & tier system

### Tier detection (`tiers.ts`, runs at boot)
1. `prefers-reduced-motion: reduce` → **Tier C** (and disables pin/scrub globally).
2. No WebGL2 context → **Tier C**.
3. Otherwise start **Tier A** at conservative resolution; run a ~20-frame self-benchmark during the hero's first seconds. Sustained frame time > ~22 ms → first reduce sim resolution, then drop to **Tier B**.
4. Query-param overrides for testing: `?tier=a|b|c`.

### Tier A — fluid simulation
- Classic GPU fluid: advection → curl/vorticity confinement → divergence → Jacobi pressure solve (~20 iterations) → gradient subtract; separate dye texture.
- Sim resolution ~128–256 on the short side; dye texture ~512–1024; both scaled by benchmark results and `devicePixelRatio` (capped at 2).
- Matcha look: dye palette locked to brand greens/cream via a color-grade in the final composite pass (map dye density through a forest→matcha→cream ramp); slight film grain to avoid banding.
- Pauses when hero off-screen or tab hidden; resumes on return.

### Tier B — animated noise shader
- Single fullscreen fragment shader: domain-warped fBm noise, 2–3 octaves, time-driven drift plus a cheap pointer ripple (smoothed pointer uniform). Same color ramp as Tier A so branding is identical.

### Tier C — static
- Layered CSS radial/conic gradients in brand greens with a very slow `background-position` drift (CSS only, no JS). This is also the no-JS and reduced-motion rendering, and the hero's paint before JS loads (so first paint is always branded, tiers only upgrade it).

## 7. Scroll system

- **Lenis** smooth scroll, synced to GSAP's ticker; disabled under reduced motion (native scroll).
- **ScrollTrigger** for: nav state, section reveals (once), Rituál pin+scrub, gallery parallax.
- All animated properties are `transform`/`opacity`/canvas only — no layout-triggering properties.
- Anchor navigation (`#menu` etc.) works with Lenis (Lenis `scrollTo` on anchor clicks) and natively without JS.

## 8. Content inventory (must be preserved verbatim unless noted)

- **Hero:** eyebrow "První matcha bar v Ostravě"; H1 "Prémiová matcha — čerstvě našleháno."; sub-paragraph about ceremonial Kagoshima matcha (v1 wording); CTAs "Prohlédnout menu" / "Kde nás najdeš"; meta "Po–Pá 7–18 · So–Ne 9–18 · Na Hradbách 1481/6, Ostrava".
- **O nás:** "Z Kagošimy rovnou do Ostravy." + both paragraphs + 3 props (Prémiová kvalita / Energie bez propadu / Čerstvě připravená) with v1 texts.
- **Rituál:** "Připraveno obřadně / Tři kroky k dokonalé matche"; steps: Krok 01 Prosíváme, Krok 02 Šleháme, Krok 03 Podáváme — v1 step texts become the scene captions.
- **Menu** (all 450 ml): Matcha Fizz 119 Kč (matcha · tonic · pyré — Maracuja, Yuzu, Cherry, Grep, Mango, Jahoda); Matcha Cloud 119 Kč (matcha cloud · kokosová voda · pyré · posyp — Jahoda, Borůvka, Bez pyré); Iced/Hot Matcha Latté 119 Kč (matcha · ovesné/mandlové mléko · sirup · posyp — Vanilka, Čokoláda, Jahoda, Lískooříšek, Karamel, Kokos); Iced Yerba Maté 79 Kč (yerba maté · pyré — Ananas, Černý rybíz, Broskev, Bez pyré). Note about upcoming special drinks + IG.
- **Galerie:** 6 tiles → instagram.com/tamatcha_ova, v1 alt texts; "Sledovat @tamatcha_ova" button.
- **Kde nás najdeš:** Na Hradbách 1481/6, 702 00 Ostrava-Centrum (u Kuřího rynku · vedle OC Laso); Po–Pá 7:00–18:00, So–Ne 9:00–18:00; +420 605 000 456; Google Maps link; "Drink zdarma?" IG-share card.
- **Footer:** v1 columns (brand, navigace, kontakt, otevřeno) + "© 2026 Tamatcha · Ostrava / Matcha, poctivě. 🍵".
- **Meta:** v1 title/description/OG/lang="cs"/theme-color/favicon.

## 9. Accessibility & degradation matrix

| Condition | Behavior |
|---|---|
| No JS | Full content, styled, static hero gradient (Tier C CSS), v1-style layouts; nothing hidden |
| `prefers-reduced-motion` | Tier C hero; no pin/scrub/parallax; content reveals instantly; Lenis off |
| No WebGL2 | Tier C hero; rest of animations unaffected |
| Weak GPU | Auto-degrade A → lower res → B |
| Keyboard | All interactive elements reachable; gallery strip scrollable via keyboard; skip-to-content link |
| Screen readers | Canvas elements `aria-hidden`; scene captions are real text in DOM order |

## 10. Performance budgets

- JS total ≤ ~120 kB gzipped (GSAP+ScrollTrigger ~45, Lenis ~5, sim ~15, scenes/boot remainder).
- LCP < 2.5 s on simulated 4G / mid-range mobile: hero text is HTML on a CSS-gradient background; WebGL initializes after first paint (async module).
- CLS ≈ 0 (explicit media dimensions, no layout-shifting animation).
- Images: AVIF/WebP, lazy-loaded below the fold.
- Fonts: preloaded WOFF2 subsets, `font-display: swap`.

## 11. Deployment — GitHub Pages

- GitHub repo (public), GitHub Actions workflow: on push to `main` → `npm ci && npm run build` → deploy `dist/` via `actions/deploy-pages`.
- Vite `base` handling: `base: '/tamatcha/'` for the project-page URL (`https://<user>.github.io/tamatcha/`). Use an env switch so a future custom domain build uses `base: '/'`.
- Custom domain (later, DNS-only): add `public/CNAME` with `tamatcha.cz`, configure DNS (A/AAAA or CNAME per GitHub docs), enable HTTPS in repo settings, switch base to `/`.

## 12. Verification

Playwright against `vite preview` build:
- Force `?tier=a`, `?tier=b`, `?tier=c` → screenshot hero each; assert canvas present (A/B) / absent (C).
- Emulate `prefers-reduced-motion` → assert no pinned sections, content visible.
- JS disabled → assert all §8 content present and visible.
- Rituál scrub: scroll pin to ~50% → assert step-2 caption active; scroll back → step 1 active.
- Mobile viewport (390×844) pass of all of the above.
- Lighthouse (mobile) on built site: perf ≥ 85, a11y ≥ 95, budgets in §10.
- Manual: real phone check of fluid feel before calling it done.

## 13. Out of scope (YAGNI)

- CMS / menu editing UI — copy lives in `index.html`.
- Live Instagram feed API — static photos, as v1.
- Multi-language — Czech only.
- Analytics, cookie banners — nothing tracks, nothing to consent to.
- three.js / 3D scenes — 2D fluid + canvas scenes only.
- Sound effects.
