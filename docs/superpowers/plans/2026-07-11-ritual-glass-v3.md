# Rituál Glass v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Rituál section's pre-rendered iced-matcha glass look real (HDRI reflections, condensation, irregular ice) and promote it from dimmed backdrop to section hero.

**Architecture:** A dev-only three.js scene (`scripts/ritual-3d/render.html`) is driven by Playwright (`render-turntable.mjs`) on SwiftShader software GL, screenshotting 44 scroll-progress steps into transparent webp frames. The runtime (`src/scenes/ritual.ts`) only scrubs those frames on a canvas — it does not change. CSS promotes the stage to hero presence.

**Tech Stack:** three.js 0.160 (CDN, dev-only), Playwright + sharp (already devDeps), GSAP ScrollTrigger runtime (unchanged), vanilla CSS.

**Spec:** `docs/superpowers/specs/2026-07-11-ritual-glass-v3-design.md`

## Global Constraints

- Frame output: 44 frames, 900px wide, transparent webp, **total ≤ 2 MB** in `public/ritual/`.
- Runtime frame paths MUST keep `import.meta.env.BASE_URL` prefix (bare `/ritual/…` 404s under the `/tamatcha/` Vite base — this regression already shipped once).
- No three.js in the shipped bundle; `npm run build` output stays ~57 kB JS.
- Existing e2e must keep passing: `npx playwright test e2e/ritual.spec.ts` (chapter scrub + reduced-motion fallback).
- Renders run on software GL: transmission ≈ 4–6 s/frame. Full pass ≈ 3–5 min. Use generous timeouts, never parallel-launch two renders.
- Verification of visual steps = Read the rendered webp/png as an image and judge against the stated criteria. If a criterion fails, tune and re-render before committing.
- Deviation from spec (approved rationale): render output goes to repo-local gitignored `scripts/ritual-3d/.out/` instead of the session scratchpad — the stale-scratchpad path is exactly the bug that bit us; repo-relative paths survive sessions. The `.hdr` is gitignored, fetched by a documented curl (keeps the public repo lean; asset is CC0).

---

### Task 1: Pipeline fixes — repo-relative paths, HDRI asset, SNAP mode

**Files:**
- Modify: `scripts/ritual-3d/render-turntable.mjs` (full rewrite, small file)
- Modify: `.gitignore`
- Modify: `scripts/ritual-3d/README.md`
- Create (not committed): `scripts/ritual-3d/assets/studio_small_08_1k.hdr`

**Interfaces:**
- Produces: `node scripts/ritual-3d/render-turntable.mjs` renders `FRAMES` (default 44) webp frames to `scripts/ritual-3d/.out/frames/frame-NNN.webp`; `SNAP=<0..1>` env renders exactly one frame at that progress to `scripts/ritual-3d/.out/snap.webp` (fast visual-check loop used by every later task); Chromium launches with `--allow-file-access-from-files` (Task 2's RGBELoader depends on this).

- [ ] **Step 1: Download the HDRI (verified URL, ~1.5 MB, CC0)**

```bash
mkdir -p scripts/ritual-3d/assets
curl -sL --max-time 60 -o scripts/ritual-3d/assets/studio_small_08_1k.hdr \
  https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr
ls -la scripts/ritual-3d/assets/  # expect ~1.5MB file
```

- [ ] **Step 2: Gitignore render outputs and assets**

Append to `.gitignore`:

```
scripts/ritual-3d/.out/
scripts/ritual-3d/assets/
```

- [ ] **Step 3: Rewrite `scripts/ritual-3d/render-turntable.mjs`**

```js
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '.out', 'frames')
const SNAP = process.env.SNAP ? parseFloat(process.env.SNAP) : null
const N = SNAP !== null ? 1 : parseInt(process.env.FRAMES || '44')
const WIDTH = 900

const hdr = join(HERE, 'assets', 'studio_small_08_1k.hdr')
if (!existsSync(hdr)) {
  console.error('Missing HDRI. Run:\n  curl -sL -o ' + hdr +
    ' https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
if (SNAP === null) for (const f of readdirSync(OUT)) rmSync(join(OUT, f))

const b = await chromium.launch({ args: [
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files',
] })
const ctx = await b.newContext({ viewport: { width: 1200, height: 1450 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })
await p.goto('file://' + join(HERE, 'render.html'))
const ok = await p.waitForFunction(() => window.__ready === true, { timeout: 60000 }).then(() => true).catch(() => false)
console.log('ready:', ok)
if (!ok) { await b.close(); process.exit(1) }
await p.waitForTimeout(500)

for (let i = 0; i < N; i++) {
  const prog = SNAP !== null ? SNAP : (N > 1 ? i / (N - 1) : 0)
  await p.evaluate((d) => window.renderFrame(d), prog)
  await p.waitForTimeout(90)
  const png = await p.locator('canvas').screenshot({ omitBackground: true })
  const file = SNAP !== null ? join(HERE, '.out', 'snap.webp') : join(OUT, `frame-${String(i + 1).padStart(3, '0')}.webp`)
  await sharp(png).resize(WIDTH, null, { fit: 'inside' }).webp({ quality: 70, alphaQuality: 88, effort: 5 }).toFile(file)
  if (SNAP !== null) console.log('snap @', prog, '->', file)
}
await b.close()
if (SNAP === null) {
  let total = 0
  for (const f of readdirSync(OUT)) total += (await sharp(join(OUT, f)).metadata()).size || 0
  console.log('wrote', N, 'frames to', OUT, '(~' + Math.round(total / 1024) + 'KB total)')
}
```

- [ ] **Step 4: Smoke-test the harness against the CURRENT scene (before touching render.html)**

```bash
FRAMES=3 node scripts/ritual-3d/render-turntable.mjs
```

Expected: `ready: true`, then `wrote 3 frames to .../scripts/ritual-3d/.out/frames (~90KB total)` (±). Read `scripts/ritual-3d/.out/frames/frame-003.webp` as an image — expect the familiar full+rotated glass. This proves paths/flags before scene work starts. (render.html doesn't use the HDRI yet — that's Task 2.)

- [ ] **Step 5: Update `scripts/ritual-3d/README.md`**

Replace its content with:

```markdown
# Ritual 3D iced-matcha glass turntable (dev-only)

Pre-renders the fill-then-rotate glass frame sequence used by the pinned
Rituál scroll-scrub. Output frames (`public/ritual/frame-*.webp`) are
committed; CI never runs this. three.js loads from unpkg CDN in render.html;
everything else uses installed devDeps (sharp, @playwright/test).

One-time asset (CC0, gitignored):

    curl -sL -o assets/studio_small_08_1k.hdr \
      https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr

Render (from repo root — paths are repo-relative, no serving needed):

    FRAMES=44 node scripts/ritual-3d/render-turntable.mjs   # full pass -> .out/frames/
    SNAP=0.7 node scripts/ritual-3d/render-turntable.mjs    # one frame at progress 0.7 -> .out/snap.webp

Software GL (SwiftShader): ~4-6 s/frame with transmission. Ship by copying
`.out/frames/frame-*.webp` over `public/ritual/` (44 frames, keep total <= 2 MB).
`make-label.mjs` is left over from the branded-cup era; the glass scene doesn't use it.
```

- [ ] **Step 6: Commit**

```bash
git add scripts/ritual-3d/render-turntable.mjs scripts/ritual-3d/README.md .gitignore
git commit -m "chore(ritual-3d): repo-relative render pipeline, SNAP mode, local HDRI asset"
```

---

### Task 2: HDRI environment in the render scene

**Files:**
- Modify: `scripts/ritual-3d/render.html`

**Interfaces:**
- Consumes: `assets/studio_small_08_1k.hdr` (Task 1), `--allow-file-access-from-files` flag (Task 1).
- Produces: scene initialization becomes async — `window.__ready` is set only after the HDRI is loaded and applied; `window.renderFrame(p)` unchanged signature. Tasks 3–4 edit this same file assuming the async wrapper exists.

- [ ] **Step 1: Swap RoomEnvironment for RGBELoader**

In `render.html`, replace the import line:

```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
```

with:

```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
```

Replace the environment block:

```js
const scene = new THREE.Scene()
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
```

with:

```js
const scene = new THREE.Scene()
const pmrem = new THREE.PMREMGenerator(renderer)
const hdr = await new RGBELoader().loadAsync('./assets/studio_small_08_1k.hdr')
scene.environment = pmrem.fromEquirectangular(hdr).texture
hdr.dispose()
```

(The module script's top level is already effectively async — `type="module"` supports top-level await; `window.__ready = true` at the bottom now only runs after the HDRI loads, which is exactly what the turntable script waits for.)

- [ ] **Step 2: Rebalance the analytic lights (HDRI now carries the look)**

Replace:

```js
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 7, 5); scene.add(key)
const fill = new THREE.DirectionalLight(0xffffff, 1.2); fill.position.set(-5, 3, -4); scene.add(fill)
scene.add(new THREE.AmbientLight(0xffffff, 0.18))
```

with:

```js
const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(4, 7, 5); scene.add(key)
const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-5, 3, -4); scene.add(fill)
scene.add(new THREE.AmbientLight(0xffffff, 0.08))
```

- [ ] **Step 3: Render a snap and judge it**

```bash
SNAP=0.75 node scripts/ritual-3d/render-turntable.mjs
```

Read `scripts/ritual-3d/.out/snap.webp`. Pass criteria: glass shows structured, photographic highlights (studio softbox shapes stretched by curvature) instead of the flat synthetic room; ice cubes pick up bright speculars; liquid not blown out. If exposure is off, tune `renderer.toneMappingExposure` (try 0.9–1.2) and re-snap.

Fail mode — `ready: false` with a fetch/XHR PAGEERROR: the `--allow-file-access-from-files` flag isn't taking effect for the loader. Fallback per spec: base64-inline the HDR instead — `node -e "console.log(require('fs').readFileSync('scripts/ritual-3d/assets/studio_small_08_1k.hdr').toString('base64'))" > /tmp/hdr.b64` and load via `new RGBELoader().loadAsync('data:application/octet-stream;base64,' + HDR_B64)` with the string pasted as a const in `render.html` (file gets big; keep it gitignored? No — render.html is committed, so prefer fixing the flag first; base64 is last resort).

- [ ] **Step 4: Commit**

```bash
git add scripts/ritual-3d/render.html
git commit -m "feat(ritual-3d): real studio HDRI environment replaces procedural room"
```

---

### Task 3: Condensation — misted glass, droplets, drip trails

**Files:**
- Modify: `scripts/ritual-3d/render.html`

**Interfaces:**
- Consumes: glass `MeshPhysicalMaterial` from the existing scene; async scene init (Task 2).
- Produces: `makeCondensationMaps()` returning `{ bump, rough }` (`THREE.CanvasTexture`s), applied to the glass material. Lathe UVs: u wraps around the glass, v runs bottom→top.

- [ ] **Step 1: Add the texture generator (insert above the "clear glass tumbler" block)**

Seeded PRNG so re-renders are identical (frames must be deterministic across runs):

```js
// condensation maps: roughnessMap green channel multiplies material.roughness (set to 1),
// so paint fog ~0.35 gray and droplet-cleared spots near-black. Bump = droplet relief.
function makeCondensationMaps() {
  let s = 42
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const W = 512, H = 1024
  const rough = document.createElement('canvas'); rough.width = W; rough.height = H
  const bump = document.createElement('canvas'); bump.width = W; bump.height = H
  const rc = rough.getContext('2d'), bc = bump.getContext('2d')

  // base: clear glass (low roughness) everywhere, fog band over the liquid zone.
  // v=0 is glass bottom, v=1 rim; canvas y is flipped (y=0 = v=1 = rim).
  rc.fillStyle = 'rgb(13,13,13)'; rc.fillRect(0, 0, W, H)            // clear = rough 0.05
  const fog = rc.createLinearGradient(0, 0, 0, H)
  fog.addColorStop(0.0, 'rgba(90,90,90,0)')                          // rim: no fog
  fog.addColorStop(0.28, 'rgba(90,90,90,0.9)')                       // fog starts below rim
  fog.addColorStop(0.92, 'rgba(90,90,90,0.9)')
  fog.addColorStop(1.0, 'rgba(90,90,90,0.35)')                       // base fades slightly
  rc.fillStyle = fog; rc.fillRect(0, 0, W, H)
  bc.fillStyle = 'black'; bc.fillRect(0, 0, W, H)

  // drip trails: clear streaks wiping through the fog, droplet blob at the bottom end
  for (let i = 0; i < 7; i++) {
    const x = rnd() * W, y0 = H * (0.18 + rnd() * 0.25), len = H * (0.12 + rnd() * 0.28), w = 3 + rnd() * 3
    rc.strokeStyle = 'rgb(13,13,13)'; rc.lineWidth = w; rc.lineCap = 'round'
    rc.beginPath(); rc.moveTo(x, y0); rc.lineTo(x, y0 + len); rc.stroke()
    const g = bc.createRadialGradient(x, y0 + len, 0, x, y0 + len, w * 1.4)
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    bc.fillStyle = g; bc.beginPath(); bc.arc(x, y0 + len, w * 1.4, 0, Math.PI * 2); bc.fill()
  }

  // droplets: cleared circles in the fog + height bumps
  for (let i = 0; i < 220; i++) {
    const x = rnd() * W, y = H * (0.22 + rnd() * 0.7), r = 1.5 + rnd() * rnd() * 6
    rc.fillStyle = 'rgb(13,13,13)'; rc.beginPath(); rc.arc(x, y, r, 0, Math.PI * 2); rc.fill()
    const g = bc.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.8, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    bc.fillStyle = g; bc.beginPath(); bc.arc(x, y, r, 0, Math.PI * 2); bc.fill()
  }

  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t }
  return { bump: mk(bump), rough: mk(rough) }
}
```

- [ ] **Step 2: Apply to the glass material**

Replace the glass material construction:

```js
const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 100), new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.55, ior: 1.5,
  transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.04,
}))
```

with:

```js
const cond = makeCondensationMaps()
const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 100), new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 1, roughnessMap: cond.rough,
  bumpMap: cond.bump, bumpScale: 1.6,
  transmission: 1, thickness: 0.55, ior: 1.5,
  transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.04,
}))
```

(`roughness: 1` because the map's green channel multiplies it — actual values come from the painted grays. `bumpScale` is the main tuning knob: too high = crinkled foil, too low = invisible; start 1.6, adjust from the snap.)

- [ ] **Step 3: Snap and judge**

```bash
SNAP=0.75 node scripts/ritual-3d/render-turntable.mjs
```

Read the snap. Pass criteria: glass over the liquid zone reads misted/frosty (softened green through fog), individual droplet glints visible, at least a couple of drip trails read as clear wipes, rim area stays clear glass. Fail modes → fixes: invisible fog → raise fog alpha 0.9→1 and gray 90→110; foil crinkle → drop bumpScale toward 0.8; visible UV seam at the lathe start → acceptable (back of glass), ignore.

- [ ] **Step 4: Commit**

```bash
git add scripts/ritual-3d/render.html
git commit -m "feat(ritual-3d): condensation - misted glass, droplets, drip trails"
```

---

### Task 4: Believable ice, rolled rim, liquid depth

**Files:**
- Modify: `scripts/ritual-3d/render.html`

**Interfaces:**
- Consumes: async scene init (Task 2); `group`, `liquidPivot`, `smooth()`, `LIQ_BOTTOM`, `FULLH` from the existing scene.
- Produces: `renderFrame(p)` additionally positions `meniscus` (torus tracking the liquid top, like `foam` already does).

- [ ] **Step 1: Rolled rim lip on the lathe profile**

Replace the profile build:

```js
const prof = []
for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new THREE.Vector2(0.9 + t * 0.22, -1.55 + t * 3.15)) }
```

with:

```js
const prof = []
for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new THREE.Vector2(0.9 + t * 0.22, -1.55 + t * 3.15)) }
// rolled lip: bulge out, curve over the top, tuck slightly down the inner side
prof.push(new THREE.Vector2(1.135, 1.63), new THREE.Vector2(1.13, 1.66), new THREE.Vector2(1.10, 1.665), new THREE.Vector2(1.075, 1.64))
```

- [ ] **Step 2: Irregular rounded ice**

Add to the imports:

```js
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
```

Replace the ice loop:

```js
for (const [x, y, z, s, r] of [[0.32, 0.74, 0.14, 0.6, 0.7], [-0.34, 0.66, -0.12, 0.64, 1.4], [0.06, 0.92, 0.3, 0.52, 2.1], [0.28, 0.62, -0.34, 0.48, 0.4]]) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.46 * s, 0.46 * s, 0.46 * s), iceMat)
  c.position.set(x, y, z); c.rotation.set(r, r * 1.6, r * 0.6); group.add(c)
}
```

with:

```js
// hand-cracked ice: rounded boxes + position-hashed vertex jitter (hash keeps
// duplicated seam vertices moving together, so no cracks open up)
const jitter = (geo, amp) => {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const h = (k) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k) * 43758.5453; return (v - Math.floor(v)) - 0.5 }
    pos.setXYZ(i, x + h(1) * amp, y + h(2) * amp, z + h(3) * amp)
  }
  geo.computeVertexNormals()
  return geo
}
for (const [x, y, z, s, r, sy] of [[0.32, 0.74, 0.14, 0.6, 0.7, 0.85], [-0.34, 0.66, -0.12, 0.64, 1.4, 1.1], [0.06, 0.92, 0.3, 0.52, 2.1, 0.9], [0.28, 0.62, -0.34, 0.48, 0.4, 1.15]]) {
  const d = 0.46 * s
  const c = new THREE.Mesh(jitter(new RoundedBoxGeometry(d, d, d, 3, d * 0.18), d * 0.07), iceMat)
  c.position.set(x, y, z); c.rotation.set(r, r * 1.6, r * 0.6); c.scale.y = sy; group.add(c)
}
```

- [ ] **Step 3: Liquid depth gradient + meniscus, drop the emissive hack**

Replace the liquid material + mesh block:

```js
const matchaMat = new THREE.MeshPhysicalMaterial({ color: 0x5f9e19, roughness: 0.36, metalness: 0, transmission: 0, ior: 1.34, clearcoat: 0.2, clearcoatRoughness: 0.55, envMapIntensity: 0.2, emissive: 0x28430f, emissiveIntensity: 0.3 })
const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.86, FULLH, 100), matchaMat)
liquid.position.y = FULLH / 2; liquidPivot.add(liquid)
```

with:

```js
// vertex-color depth gradient: denser/darker matcha at the bottom, no emissive hack
const matchaMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.36, metalness: 0, transmission: 0, ior: 1.34, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.35 })
const liqGeo = new THREE.CylinderGeometry(1.02, 0.86, FULLH, 100)
{
  const pos = liqGeo.attributes.position, col = new Float32Array(pos.count * 3)
  const bot = new THREE.Color(0x3f6b10), top = new THREE.Color(0x6fae1e), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) / FULLH) + 0.5 // 0 bottom .. 1 top
    c.lerpColors(bot, top, t)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  liqGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
}
const liquid = new THREE.Mesh(liqGeo, matchaMat)
liquid.position.y = FULLH / 2; liquidPivot.add(liquid)
// meniscus: bright ring where liquid meets glass, tracks the fill line
const menMat = new THREE.MeshStandardMaterial({ color: 0x86b93c, roughness: 0.25, transparent: true, opacity: 0 })
const meniscus = new THREE.Mesh(new THREE.TorusGeometry(1.01, 0.016, 10, 96), menMat)
meniscus.rotation.x = Math.PI / 2; group.add(meniscus)
```

- [ ] **Step 4: Thinner foam + meniscus tracking in `renderFrame`**

Change the foam scale line from `foam.scale.y = 0.13` to `foam.scale.y = 0.09`.

Replace the `renderFrame` body:

```js
window.renderFrame = (p) => {
  const f = smooth(0, 0.55, p)
  liquidPivot.scale.y = Math.max(f, 0.001)
  const top = LIQ_BOTTOM + f * FULLH
  foam.position.y = top; foamMat.opacity = smooth(0.82, 1, f)
  group.rotation.y = smooth(0.32, 1, p) * Math.PI * 2
  renderer.render(scene, camera)
}
```

with:

```js
window.renderFrame = (p) => {
  const f = smooth(0, 0.55, p)
  liquidPivot.scale.y = Math.max(f, 0.001)
  const top = LIQ_BOTTOM + f * FULLH
  foam.position.y = top; foamMat.opacity = smooth(0.82, 1, f)
  meniscus.position.y = top + 0.005; menMat.opacity = 0.85 * smooth(0.06, 0.2, f)
  group.rotation.y = smooth(0.32, 1, p) * Math.PI * 2
  renderer.render(scene, camera)
}
```

- [ ] **Step 5: Snap at three progress points and judge**

```bash
SNAP=0.3 node scripts/ritual-3d/render-turntable.mjs && cp scripts/ritual-3d/.out/snap.webp scripts/ritual-3d/.out/snap-030.webp
SNAP=0.6 node scripts/ritual-3d/render-turntable.mjs && cp scripts/ritual-3d/.out/snap.webp scripts/ritual-3d/.out/snap-060.webp
SNAP=1.0 node scripts/ritual-3d/render-turntable.mjs && cp scripts/ritual-3d/.out/snap.webp scripts/ritual-3d/.out/snap-100.webp
```

Read all three. Pass criteria: ice reads irregular/organic (no perfect cube silhouettes); rim shows a bright rolled-lip highlight, not a razor edge; liquid darker at depth, brighter at surface, meniscus ring visible at the fill line mid-fill (snap-030/060); nothing intersects visibly wrong during rotation (snap-100). Tune values in place if a criterion fails, re-snap.

- [ ] **Step 6: Commit**

```bash
git add scripts/ritual-3d/render.html
git commit -m "feat(ritual-3d): irregular rounded ice, rolled rim, liquid depth gradient + meniscus"
```

---

### Task 5: Full render → ship 44 frames

**Files:**
- Modify: `public/ritual/frame-001.webp` … `frame-044.webp` (all 44 replaced)

**Interfaces:**
- Consumes: finished scene (Tasks 2–4), pipeline (Task 1).
- Produces: the shipped frame sequence `src/scenes/ritual.ts` scrubs (`FRAME_COUNT = 44` — do not change the count).

- [ ] **Step 1: Full render**

```bash
FRAMES=44 node scripts/ritual-3d/render-turntable.mjs
```

Expected: `wrote 44 frames … (~<N>KB total)` in 3–6 min. Use a 600000 ms timeout.

- [ ] **Step 2: Size gate (≤ 2 MB)**

Check the reported total. If > 2048 KB: lower webp `quality` 70→64 and `alphaQuality` 88→84 in `render-turntable.mjs`, re-run Step 1. If still over, drop `WIDTH` 900→820. Commit any encoder tweak with the frames in Step 5.

- [ ] **Step 3: Final visual gate**

Read frames 001, 015, 028, 044 from `scripts/ritual-3d/.out/frames/` as images. Criteria: sequence tells fill→rotate cleanly; condensation/ice/rim improvements visible at shipped resolution; frame 001 (empty glass) still reads well since it's the poster-replacement. Any fail → fix scene, re-render, re-judge.

- [ ] **Step 4: Ship frames + verify build and unit tests**

```bash
cp scripts/ritual-3d/.out/frames/frame-*.webp public/ritual/
ls public/ritual | wc -l   # expect exactly 44
du -sh public/ritual       # expect <= 2.0M
npm run build && npm test
```

Expected: build passes (tsc + vite), Vitest green, JS bundle unchanged (~57 kB — frames are static assets).

- [ ] **Step 5: Commit**

```bash
git add public/ritual scripts/ritual-3d/render-turntable.mjs
git commit -m "feat: re-rendered Ritual glass - HDRI, condensation, real ice (44 frames)"
```

---

### Task 6: Hero presence — un-dim the stage, bottom scrim

**Files:**
- Modify: `src/styles/sections.css:207` (the `.ritual--live .ritual__stage` rule)

**Interfaces:**
- Consumes: shipped frames (Task 5). No JS/HTML changes; `.ritual__stage` is `position:absolute` so its `::after` overlays the canvas child (positioned, later in paint order).

- [ ] **Step 1: Edit the stage rule**

Replace:

```css
.ritual--live .ritual__stage{display:block;position:absolute;inset:2% 8% 6%;z-index:-1;height:auto;margin:0;gap:0;border-radius:0;background:none;opacity:.42;filter:blur(1px)}
```

with:

```css
.ritual--live .ritual__stage{display:block;position:absolute;inset:2% 8% 6%;z-index:-1;height:auto;margin:0;gap:0;border-radius:0;background:none;opacity:.95}
.ritual--live .ritual__stage::after{content:"";position:absolute;left:0;right:0;bottom:0;height:32%;background:linear-gradient(to bottom,transparent,var(--forest));pointer-events:none}
```

- [ ] **Step 2: Build + e2e**

```bash
npm run build && npx playwright test e2e/ritual.spec.ts e2e/visual.spec.ts
```

Expected: PASS. If `visual.spec.ts` does screenshot comparison and fails on intentional pixel changes, update its baseline per that spec's documented mechanism (`npx playwright test e2e/visual.spec.ts --update-snapshots`) and eyeball the new baseline before accepting.

- [ ] **Step 3: Visual gate on the real page**

Write `scripts/ritual-3d/.out/shots.mjs` (throwaway, gitignored dir):

```js
import { chromium } from '@playwright/test'
import { execSync } from 'node:child_process'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
await p.goto('http://localhost:4173/tamatcha/')
await p.waitForFunction(() => window.__tamatcha?.ritualRange !== null)
for (const f of [0.05, 0.3, 0.55, 0.8, 0.98]) {
  await p.evaluate((fr) => { const [s, e] = window.__tamatcha.ritualRange; window.scrollTo(0, s + (e - s) * fr) }, f)
  await p.waitForTimeout(700)
  await p.screenshot({ path: `scripts/ritual-3d/.out/live-${String(f).replace('.', '')}.png` })
}
await b.close()
```

```bash
npm run preview &   # serves dist on :4173
node scripts/ritual-3d/.out/shots.mjs
kill %1
```

Read all five screenshots. Pass criteria: glass is unmistakably the focal point (full brightness, sharp); all three step captions legible at every position (active caption cream-on-forest must not sit on bright glass without the scrim behind it); heading legible; nothing overflows. Fail → tune opacity (floor .8 per spec) / scrim height 32%→40% and re-shoot.

- [ ] **Step 4: Commit**

```bash
git add src/styles/sections.css
git commit -m "feat: Ritual glass steps forward as hero - un-dimmed stage + caption scrim"
```

---

### Task 7: Full verification + deploy

**Files:** none (verification + push)

- [ ] **Step 1: Full suite**

```bash
npm run build && npm test && npm run e2e
```

Expected: all green. Any failure: fix before proceeding, never push red.

- [ ] **Step 2: Push and watch deploy**

```bash
git push origin main
gh run watch --exit-status $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: Actions run succeeds (Pages deploy).

- [ ] **Step 3: Verify live**

```bash
curl -sI https://prixedox.github.io/tamatcha/ritual/frame-022.webp | grep -iE 'HTTP|content-length'
```

Expected: 200 with a content-length matching the new local `public/ritual/frame-022.webp` size (old frames would show the stale length until CDN refreshes — retry once after ~2 min if stale). Then load the live page section once via Playwright and confirm the new look renders.
