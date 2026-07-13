# Tamatcha — Drink showcase + motion polish (v3.1)

**Datum:** 2026-07-13
**Stav:** schváleno uživatelem (photos-only AI-ready, umístění showcase, rozsah B)

## Cíl

Vizuálně pozvednout živý brand-match web: sekce „Celá sestava" se změní
z statické řady na **pinned scroll showcase** pěti drinků postavený na
reálných fotografiích, doplněný zdrženlivým motion polishem (hero parallax
+ float, menu hovery, rituál číslice). Architektura je připravená na pozdější
AI-generované rotační frames (Dreamina/Seedance), ale nic z toho tento
release nevyžaduje.

**Rozhodnutí uživatele:**
1. AI frames teď negenerujeme — photos-only, ale AI-ready (prompty + prep
   skript jsou součástí dodávky).
2. Showpiece žije v lineup sekci `#galerie` (drink showcase), ne v rituálu.
3. Rozsah B: showcase + motion polish; bez marquee/mask-reveal/magnetic
   extras.

## 1. Drink showcase (`#galerie`)

### Progressive enhancement

- DOM zůstává: 5× `figure.lineup__item` (foto + figcaption). Bez JS a při
  `prefers-reduced-motion` se renderuje dnešní statická řada — beze změny.
- Metadata drinků (název, ingredienční řádek) se přesunou do `data-name`
  a `data-formula` atributů na figurách — HTML je jediný zdroj pravdy.
  Pořadí: Matcha Fizz, Iced Matcha Latté, Hot Matcha Latté, Matcha Cloud,
  Iced Yerba Maté (dle in-store obrazovky 3).

### S JS (`src/scenes/showcase.ts`, nový modul)

- GSAP ScrollTrigger pin sekce na ~4 výšky viewportu, scrub timeline.
- Scroll postupně aktivuje drinky 1→5: aktivní foto se přesune do středu
  stage a zvětší (~1.6×), pod ním velký název (Clash Display, emerald)
  a `( ingredience )` řádek (Montserrat, coal-60).
- Neaktivní drinky tvoří malou řadu thumbnailů pod stage; aktivní thumbnail
  zvýrazněn emerald linkou. Klik na thumbnail = scroll na segment drinku.
- Přechody výhradně transform/opacity (žádný layout thrash, žádné stíny).
- Reveal třídy `.reveal` v sekci se s pinem nesmí prát (pin až po reveal-in).

### AI-ready kontrakt (nic z toho se teď nerenderuje)

- Hook v showcase.ts: pokud existuje
  `public/brand/turntable/<drink>/manifest.json`
  (`{"frames": N, "width": W, "height": H}`), aktivní drink se kreslí na
  `<canvas>` a scroll uvnitř segmentu scrubuje rotační frames
  (`frame-001.webp` … `frame-NNN.webp`). Mechanika = v2 frame-scrub
  (referenční implementace v git historii, `src/scenes/ritual.ts`
  před commitem 070d21d).
- `scripts/turntable-prep.mjs`: video → frames → ořez + color-match → webp
  (ffmpeg-static + sharp; ffmpeg-static jako devDependency se instaluje až
  při prvním použití — není součástí tohoto release).
- `docs/turntable-prompts.md`: hotové prompty pro Dreamina/Seedance 2.0
  per drink (subjekt: dodané produktové foto; slow 360° turntable, static
  camera, studio white background, no camera motion, 10 s) + parametry
  a postup (upload → generate → download → `npm run turntable -- <drink>
  <video>`).

## 2. Motion polish

- **Hero:** watermark piktogram parallax ~0.4× rychlosti scrollu
  (ScrollTrigger scrub, transform-only). Trio drinků: jemný CSS float
  (±6 px, 6–7 s, ease-in-out alternate, stagger delayů) + mírný per-image
  scroll drift. Vše vypnuto při reduced-motion.
- **Menu karty:** čistě CSS hover — karta translateY(-4px) + zvýraznění
  borderu (emerald), `.mcard__drink` translateY(-6px) scale(1.02),
  transition ~.35s var(--ease). Žádné stíny pod cutouty.
- **Rituál:** číslice `.step__n` dostanou vlastní zpožděný rise+fade
  v rámci existujícího reveal (CSS-only, keyed na `.reveal.in`).

## 3. Guardrails

- `prefers-reduced-motion: reduce` → žádný pin, žádný float/parallax,
  statická lineup řada (dnešní stav).
- Bez JS → dnešní stav (statická řada, vše čitelné).
- Žádné nové runtime závislosti; očekávaný růst bundle ~4 kB gz
  (budget 120 kB, aktuálně 49.2 kB). `npm run check:budgets` musí projít.
- Výkon: pouze transform/opacity animace; pin přes GSAP (žádný vlastní
  scroll handler).

## 4. Testy

- Nový `e2e/showcase.spec.ts`:
  - s JS: sekce se pinuje (ScrollTrigger aktivní), scroll na progress body
    mění aktivní drink (caption/aria stavy), thumbnails přítomné;
  - bez JS: 5 statických figur viditelných (dnešní assertion zůstává
    v lineup.spec);
  - reduced-motion: žádný pin, statická řada.
- Existujících 15 e2e testů zůstává zelených (lineup.spec figcaption
  pořadí platí v obou režimech).
- Vizuální kontrola: screenshoty desktop+mobile (visual.spec scroll-through
  projde pinned sekcí).

## Mimo rozsah

- Generování AI frames (Dreamina) — uživatel dodá později; drop-in bez
  změny kódu díky manifest hooku.
- Marquee strip, mask reveals, magnetic buttons (rozsah C — zamítnuto).
- Změny obsahu, menu, kontaktů.
