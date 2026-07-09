# Ritual 3D cup turntable (dev-only)

Pre-renders the rotating Tamatcha cup frame sequence used by the pinned Ritual
scroll-scrub. Output frames (`public/ritual/frame-*.webp`) are committed; CI
never runs this.

Requires: `npm i -D three` is NOT needed (three loads from unpkg CDN in render.html).
Uses the already-installed sharp + @playwright/test.

1. `node scripts/ritual-3d/make-label.mjs`  -> generates the cup wrap texture (label.png)
2. serve this dir:  `python3 -m http.server 8099`  (from scripts/ritual-3d, with label.png present)
3. `FRAMES=48 node scripts/ritual-3d/render-turntable.mjs`  -> writes transparent webp frames
   (paths in the scripts point at a scratch dir; adjust before re-running)
