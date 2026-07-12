# Tamatcha — Brand-match redesign (v3 „Výstupy")

**Datum:** 2026-07-12
**Stav:** schváleno uživatelem (směr, menu verze, přístup B, design pt 1+2)

## Cíl

Přestavět vizuální vrstvu webu tak, aby přesně odpovídala oficiálním brand
podkladům od grafika (složka `Výstupy.zip`): světlý krémový editorial vzhled,
fonty Clash Display + Montserrat, oficiální logo, reálné produktové fotografie
a oficiální paleta. Obsah (sekce, texty) zůstává, mění se prezentace; menu se
aktualizuje na novější verzi z in-store obrazovek.

**Rozhodnutí uživatele:**
1. Směr: plný brand match (světlý vzhled dle podkladů), WebGL hero se ruší.
2. Menu: verze z obrazovek (1. 7.), ne z letáku — soda / mléko / Pistácie /
   Cloud příchutě Jahoda·Kokos·Borůvka.
3. Přístup: B — plný rebuild vizuální vrstvy na stávající infrastruktuře
   (Vite + TS + Lenis/GSAP zůstávají), WebGL/canvas kód se maže.

## Zdrojové podklady (inventář Výstupy.zip)

- **Logo** — `zakladni_logotyp` (piktogram + „tamatcha") a samostatný
  `piktogram`; barvy: emerald, cream, gold, burgundy, coal, black, white;
  formáty AI/PDF/PNG (transparent, na bílé, palette kombinace).
- **Fonty** — Clash Display (OTF/TTF/WEB woff2 + FFL licence Fontshare),
  Montserrat (statické + variable TTF + OFL licence).
- **Produktové foto** — 5 výřezů (transparent + na bílé): Fizz, Iced Latté,
  Yerba Maté, Hot Latté, Cloud (DSC00227/231/232/233/234).
- **Obrazovky (7)** — in-store menu boardy: závazný vzor typografie menu.
- **Letáky** — menu leták, směrový plakát „Hned za rohem!", Vyprošťovák;
  závazný vzor celkového layoutu (krémový papír, vodoznak piktogramu,
  burgundy patka).

## Vizuální systém

### Paleta (design tokeny)

| Token | Hex | Užití |
|---|---|---|
| `--paper` | `#F3F0ED` | hlavní pozadí stránky (leták) |
| `--cream` | `#E6E2DA` | karty, sekundární plochy (oficiální cream) |
| `--watermark` | `#E3DFD7` | obří piktogram v pozadí sekcí |
| `--emerald` | `#154230` | nadpisy, logo, primární akcent |
| `--coal` | `#101111` | běžný text |
| `--burgundy` | `#5D1E21` | kontaktní patka (krémový text na ní) |
| `--gold` | `#A6824A` | drobné akcenty: eyebrow, linky, hovery |

### Typografie

- **Clash Display Semibold** — všechny nadpisy, těsný tracking, emerald.
  Self-host z dodaných woff2 (Regular/Medium/Semibold).
- **Montserrat** — text; Medium/Bold pro ceny a labely. Self-host, ideálně
  subset/konverze do woff2 přes fonttools, jinak dodané soubory.
- Konvence z podkladů: ingredience v `( … )`, ceny `119,- Kč`, objem tučně
  `450 ml`.

### Logo

- Nav: logotyp emerald na krémové.
- Favicon + touch icon: piktogram.
- Vodoznak: piktogram ve `--watermark` barvě, velké měřítko, ořez přes okraj
  (viz leták).
- Patka: krémový logotyp na burgundy.

## Struktura stránky (one-pager, česky)

1. **Nav** — sticky, krémová, logotyp vlevo, kotvy vpravo.
2. **Hero** — vzor směrový plakát: eyebrow „První Matcha Bar v Ostravě",
   velký emerald titulek (Clash Display), tagline „Prémiová matcha té
   nejvyšší kvality z prefektury Kagoshima.", trio reálných fotek
   (Fizz, Latté, Cloud) na krémové s vodoznakem. CTA: „Menu",
   „Kde nás najdeš".
3. **O nás** (`#o-nas`) — stávající copy, restyl (gold eyebrow, emerald
   nadpis, coal text).
4. **Rituál** (`#ritual`) — canvas scéna se ruší; čistá editorial řada
   3 kroků s velkými číslicemi v Clash Display. Copy zůstává.
5. **Menu** (`#menu`) — dle obrazovek; karta = reálné foto, emerald název,
   `( ingredience )`, chips příchutí, `450 ml` + cena:
   - **Matcha Fizz** — ( matcha, soda, pyré dle výběru ) — Maracuja, Yuzu,
     Cherry, Grep, Mango, Jahoda — 450 ml, 119,- Kč
   - **Matcha Cloud** — ( matcha cloud, mléko, pyré dle výběru ) — Jahoda,
     Kokos, Borůvka — 450 ml, 119,- Kč
   - **Iced/Hot Matcha Latté** — ( matcha, mléko/ovesné mléko, sirup dle
     výběru, posyp ) — Vanilka, Čokoláda, Jahoda, Lískooříšek, Karamel,
     Pistácie — 450 ml, 119,- Kč
   - **Iced Yerba Maté** — ( yerba maté, pyré dle výběru ) — Ananas, Černý
     rybíz, Broskev, Bez pyré — 450 ml, 79,- Kč
6. **Lineup** (nahrazuje `#galerie`) — vzor obrazovka 3: pět drinků v řadě
   se jmény; promo „drink zdarma za tag @tamatcha_ova"; odkaz na Instagram.
7. **Kde nás najdeš + patka** (`#navstiv`) — burgundy pás dle letáku:
   adresa Na Hradbách 1481/6, Ostrava-Centrum (u Kuřího rynku, vedle OC
   Laso), otevírací doba Po–Pá 7:00–18:00 / So–Ne 9:00–18:00, telefon
   +420 605 000 456, @tamatcha_ova, odkaz do Google Maps, www.tamatcha.cz.

Žádný nový obsah se nevymýšlí — vše pochází ze stávajícího webu nebo
z podkladů.

## Assety v repu (`public/brand/`)

- `fonts/` — ClashDisplay-{Regular,Medium,Semibold}.woff2 + Montserrat
  (woff2 subset, fallback dodané TTF) + obě licence.
- `logo/` — logotyp (emerald, cream), piktogram (emerald, watermark tint),
  favicon.
- `drinks/` — 5 foto výřezů jako WebP s alfou (~1000 px výška + malé
  varianty). Původní PNG (2–4 MB/ks) se do repa nedávají.

## Změny v kódu

- `index.html` — přepsané markup hero/rituál/menu/lineup/patka; nové menu
  texty; meta/theme-color/OG aktualizace.
- `src/styles/` — `tokens.css`, `fonts.css` nové; `sections.css` z velké
  části přepsané; `base.css` úpravy (světlé schéma).
- **Smazat:** `src/fluid/` (WebGL sim), `src/scenes/ritual.ts` (pinned
  canvas), `src/tiers.ts` + `src/tiers.test.ts`, `public/ritual/`
  (frame sekvence), související větve v `main.ts`.
- **Zůstává:** Vite/TS, Lenis + GSAP reveals (`src/scroll.ts`), GH Actions
  deploy na GitHub Pages.

## Testy a ověření

- Playwright e2e přepsat na nový DOM: sekce se vyrenderují, menu má 4 drinky
  se správnými cenami (3× 119, 1× 79), kontaktní odkazy (tel:, maps, IG)
  fungují, fonty se načtou.
- Web funguje bez JS (statický obsah, progressive enhancement).
- Vizuální kontrola přes dev server + screenshoty před push.

## Mimo rozsah

- Vlastní doména tamatcha.cz (beze změny, viz README).
- E-shop, objednávky, vícejazyčnost.
- Úpravy WebGL efektu (maže se; historie zůstává v gitu).
