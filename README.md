# Tamatcha — web

Jednostránkový web pro **Tamatcha**, první matcha bar v Ostravě — postavený na oficiálním brand balíčku (Clash Display + Montserrat, emerald/cream/gold/burgundy paleta, reálné produktové fotografie).

## Vývoj

```bash
npm install
npm run dev        # http://localhost:5173/tamatcha/
npm test           # unit testy (Vitest)
npm run e2e        # Playwright testy (staví na `npm run preview`)
npm run build      # produkce do dist/
```

## Nasazení

- **Produkce (tamatcha.cz):** Český hosting — skill `/deploy` (`scripts/deploy-ceskyhosting.sh`): build s `VITE_BASE=/` a rsync `dist/` přes SSH. Push na GitHub produkci NEaktualizuje.
- **GitHub Pages (zrcadlo):** push do `main` → GitHub Actions → `https://prixedox.github.io/tamatcha/` (base `/tamatcha/`).

## Struktura

- `index.html` — veškerý obsah (funguje i bez JS)
- `src/scroll.ts` — Lenis + GSAP ScrollTrigger
- `docs/superpowers/specs/` — design spec
- `legacy/` — původní v1 web (single-file)
- `public/brand/` — generované brand assety (drinky, logo, og)
- `scripts/brand-assets.mjs` — regenerace z ~/projects/tamatcha-brand (BRAND_SRC přepíše cestu); zdroj: Výstupy.zip od grafika
