# Tamatcha — web v2 „Living Matcha"

Jednostránkový web pro **Tamatcha**, první matcha bar v Ostravě — s interaktivní
WebGL matchou v hero sekci a scrollem řízeným příběhem přípravy.

## Vývoj

```bash
npm install
npm run dev        # http://localhost:5173/tamatcha/
npm test           # unit testy (Vitest)
npm run e2e        # Playwright testy (staví na `npm run preview`)
npm run build      # produkce do dist/
```

Ladění: `?tier=a|b|c` vynutí úroveň hero efektu (a = fluid sim, b = noise shader, c = statický gradient).

## Nasazení

Push do `main` → GitHub Actions → GitHub Pages (`https://<owner>.github.io/tamatcha/`).
Pro vlastní doménu tamatcha.cz: přidat `public/CNAME` s obsahem `tamatcha.cz`,
nastavit DNS dle GitHub docs a změnit `VITE_BASE=/` v buildu.

## Struktura

- `index.html` — veškerý obsah (funguje i bez JS)
- `src/fluid/` — WebGL2 fluid simulace + noise fallback
- `src/scenes/` — rituál (pinned canvas scéna), galerie, akcenty
- `src/scroll.ts` — Lenis + GSAP ScrollTrigger
- `docs/superpowers/specs/` — design spec
- `legacy/` — původní v1 web (single-file)

Assets: `npm run assets:fonts` (python3) a `npm run assets:img` regenerují
`public/fonts` a `public/img` ze zdrojů (`legacy/fonts.css`, `source-photos/`).
