# Tamatcha — Rituál rotation scene (v3.2)

**Datum:** 2026-07-13
**Stav:** schváleno (Martin: rotace do Rituálu, showcase zůstává se statickými fotkami)

## Cíl

Rotující Fizz se přesune ze showcase do sekce **Rituál** („Tři kroky
k dokonalé matche") jako pinned scéna: rotace scrubuje přes celou délku
pinu (≈3× delší než měla v showcase) a tři kroky se postupně odhalují
vedle ní — text přibývá se scrollem. Showcase „Celá sestava" si nechá
pin + procházení pěti drinků, ale stage je vždy statická fotka.

## Rituál — pinned scéna

- **Aktivace** (všechny podmínky, jinak dnešní statický stav beze změny):
  JS, desktop >860px, bez `prefers-reduced-motion`, a fizz turntable
  manifest existuje (`public/brand/turntable/fizz/manifest.json`).
- **Pin:** sekce `#ritual` pinned na ~3.5 výšky viewportu
  (ScrollTrigger, `end: '+=250%'`, scrub).
- **Layout (aktivní scéna):** grid 2 sloupce — vlevo canvas s rotujícím
  Fizz (výška ~52vh, průhledný výřez na paper pozadí), vpravo sloupec
  tří kroků (velké číslice + text, dnešní copy beze změny). Head sekce
  zůstává nahoře.
- **Rotace:** frames 0..N-1 mapované na celý progress pinu [0,1] —
  jedna otáčka přes celý pin.
- **Kroky:** krok 01 viditelný od začátku; krok 02 od progress ≥ 0.33;
  krok 03 od ≥ 0.66. Třídou `.active`, obousměrně (scroll zpět kroky
  skryje). V aktivní scéně řídí viditelnost kroků výhradně `.active`
  (generický `.reveal` mechanismus je pro kroky potlačen).
- **Fallback:** bez manifestu / mobil / reduced-motion / no-JS = přesně
  dnešní vzhled (tři kroky v řadě, žádný pin, žádný canvas).

## Showcase — zpět na statické fotky

- `src/scenes/showcase.ts` ztrácí turntable kód (manifest fetch, canvas,
  drawFrame/applyMode) — vrací se k čistě statické stage z Task 1
  (pin, scrub 5 drinků, thumbnails, klik/klávesnice beze změny).
- Canvas element ze stage DOM zmizí.

## Kód

- Nový `src/scenes/ritual.ts` — `initRitual(reduced: boolean)`: vlastní
  manifest fetch (jen `fizz`), canvas, pin, prahové odhalování kroků.
  URL přes `import.meta.env.BASE_URL`.
- `src/main.ts` boot: `initRitual(reduced)` vedle stávajících initů.
- CSS: blok pro aktivní scénu (`.ritual-live`), úklid showcase canvas
  pravidel.

## Testy

- Nový `e2e/ritual.spec.ts`:
  - aktivní scéna (reálné fizz frames jsou v repu, mock netřeba):
    canvas viditelný, krok 02 skrytý na začátku pinu a viditelný
    v půlce, krok 03 až ke konci, zpětný scroll kroky zase skryje;
  - fallback: route-mock manifestu na 404 → žádný pin/canvas, tři
    kroky staticky viditelné (dnešní stav);
  - reduced-motion: statický fallback.
- `e2e/showcase.spec.ts`: turntable test nahrazen assertem „stage je
  vždy statický obrázek, canvas neexistuje".
- Stávající content/scroll/lineup testy zůstávají zelené (kroky zůstávají
  v DOM, texty beze změny).

## Mimo rozsah

- Turntable frames pro další 4 drinky (rotace teď žije jen v Rituálu
  s Fizz; případný drink-switcher v Rituálu je budoucí nápad).
- Změny textů kroků, menu, kontaktů.

## Dodatek (2026-07-13, schváleno): mobilní rotace bez pinu

Na mobilu (≤860px) se rotace NEVYNECHÁVÁ, ale běží bez pinu: canvas se
vloží mezi head a kroky (na střed, ~40vh), a frames scrubuje průchod
sekce viewportem (`start: 'top 85%'`, `end: 'bottom 15%'`, scrub, bez
pin). Kroky se odhalují normálním `.reveal` mechanismem (žádná
`.active` choreografie). Sekce dostane třídu `ritual-mobile`.
Reduced-motion a chybějící manifest = dnešní statický stav beze změny.
Desktop pinned scéna beze změny.
