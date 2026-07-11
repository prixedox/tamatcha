# Rituál glass v3 — realism push + hero presence

**Date:** 2026-07-11 · **Status:** approved by Martin (direction: tune backdrop + push CG realism → glass steps forward as section hero)

## Goal

The Rituál section's scroll-scrubbed 3D iced-matcha glass currently looks CG, so it is hidden as a dimmed/blurred backdrop (`opacity:.42; blur(1px)`). This iteration attacks the two biggest CG tells — synthetic environment reflections and missing condensation — then promotes the glass back to the section's focal point.

Success criteria: at a glance on the live page, the glass no longer reads as an obvious 3D render; it is the visual hero of `#ritual` with the three step captions legible over/under it; shipped bundle stays frame-based (no three.js at runtime); frame payload ≤ 2 MB.

## Scope

Three files change meaningfully; the runtime scrub code does not.

### 1. Render scene (`scripts/ritual-3d/render.html` — dev-only, never shipped)

- **HDRI environment.** Download a CC0 studio HDRI from Poly Haven (1k `.hdr`) to `scripts/ritual-3d/assets/`. Load with `RGBELoader` → PMREM → `scene.environment`, replacing the procedural `RoomEnvironment`. Keep ACES tone mapping. Reduce the directional key/fill intensities to complement (not fight) the HDRI.
- **Condensation.** Canvas-generated texture pair applied to the glass outer wall:
  - *Roughness map:* fogged-glass base (~0.35 rough) with clear circular droplet spots and a few vertical drip trails wiping through the fog; fog fades out above the liquid line toward the rim.
  - *Bump map:* matching droplet-height circles for relief.
- **Ice.** Replace the four perfect `BoxGeometry` cubes with `RoundedBoxGeometry` (three addons) + per-vertex jitter and non-uniform scales so each reads hand-cracked.
- **Glass & liquid.** Rolled lip on the lathe profile (no razor rim). Remove the liquid's `emissive` hack; instead a subtle vertical gradient (denser color at bottom) and a meniscus flare where the liquid meets the glass. Foam dome kept but thinner.
- **Choreography unchanged:** `renderFrame(p)` — fill 0→0.55, then rotate to 2π at p=1.

### 2. Render pipeline (`scripts/ritual-3d/render-turntable.mjs` — dev-only)

- Fix stale `/tmp` scratch paths from an old session: load `render.html` directly from the repo's `scripts/ritual-3d/`, write frames to the current session scratchpad, copy into `public/ritual/` only after visual approval.
- Add `--allow-file-access-from-files` to Chromium launch args so `RGBELoader` can read the local `.hdr` under `file://`.
- Output spec: 44 frames, 900px wide, transparent webp, total ≤ 2 MB (currently 1.3 MB; condensation detail compresses worse — tune `quality`/`alphaQuality` if needed).

### 3. Presentation (`src/styles/sections.css`)

- `.ritual--live .ritual__stage`: `opacity` .42 → ~.95, remove `filter: blur(1px)` — glass becomes the focal point.
- Add a soft bottom scrim (transparent → `var(--forest)` gradient over roughly the lower 30% of the stage/wrap) so the step captions stay legible where they overlap the glass.
- `src/scenes/ritual.ts` unchanged: `FRAME_COUNT` stays 44; frame paths keep `import.meta.env.BASE_URL` (a bare `/ritual/…` 404s under the `/tamatcha/` base — regression that already happened once).

## Non-goals

- No runtime three.js; no change to the scrub/pin mechanics or the 300% pin length.
- No path tracing / Blender (no GPU here; software GL only — iteration speed wins).
- Real footage stays the known better endgame if Martin ever films his iced matcha; this iteration does not block it (same frame-scrub swap).

## Error handling / risks

- Software-GL transmission ≈ 4 s/frame → ~3–5 min per render pass; acceptable.
- If local-file HDRI loading fails despite the Chromium flag, fall back to inlining the HDR as a base64 data URI in `render.html`.
- Bump-map condensation is an approximation (real droplets refract); at 900px webp it reads fine.
- Legibility: if the un-dimmed glass fights the captions even with the scrim, dial stage opacity down toward .8 before re-dimming further — hero presence is the requirement.

## Verification

1. Render → visually inspect sample frames (fill mid-point, full, mid-rotation) against "does this still scream CG".
2. Copy frames to `public/ritual/`, check total size ≤ 2 MB.
3. `npm run build && npm test && npm run e2e`.
4. Playwright screenshots of the live section at 4–5 scroll positions (caption legibility + hero presence).
5. Push to main (deploys via Actions → Pages).
