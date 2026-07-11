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
    DRINK=latte FRAMES=44 node scripts/ritual-3d/render-turntable.mjs  # drink variant -> .out/frames-latte/

DRINK selects a liquid style from the DRINKS config in render.html
(latte | fizz | cloud | mate — the menu drinks; unset = default matcha).
The site picks a variant at runtime via ?drink=… (see src/scenes/ritual.ts);
variant frames ship in `public/ritual/<drink>/`.

Software GL (SwiftShader): ~4-6 s/frame with transmission. Ship by copying
`.out/frames/frame-*.webp` over `public/ritual/` (44 frames, keep total <= 2 MB per set).
`make-label.mjs` is left over from the branded-cup era; the glass scene doesn't use it.
