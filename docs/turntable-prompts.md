# Turntable frames — generování a nasazení

Cíl: 360° rotace drinku pro scroll showcase. Web je připravený — stačí
vygenerovat klip, prohnat ho skriptem a commitnout výstup. Žádná změna kódu.

## 1. Vygeneruj klip (Dreamina / Seedance 2.0 — zdarma, bez watermarku)

1. Účet na dreamina.com (ByteDance/CapCut), režim **Image to Video**,
   model Seedance 2.0, délka **10 s**, rozlišení 1080p.
2. Nahraj produktové foto drinku — používej originály z
   `~/projects/tamatcha-brand/Výstupy/FONT/Výstupy/Produktové fotografie/FFFFFF/`
   (verze na bílém pozadí, NE transparent):
   fizz = DSC00227, latte-iced = DSC00231, yerba = DSC00232,
   latte-hot = DSC00233, cloud = DSC00234.
3. Prompt (pro všechny drinky stejný základ):

   > Slow seamless 360-degree turntable rotation of this exact drink glass.
   > Product photography, camera locked and static at eye level, pure white
   > seamless studio background, soft even lighting, no camera movement,
   > no zoom, no cuts. The glass rotates smoothly exactly one full
   > revolution over the whole clip. Keep the contents, colors and
   > proportions of the drink identical to the reference photo.

4. Zkontroluj: bílé pozadí bez stínů scény, žádný pohyb kamery, obsah
   drinku se nerozpadá. Případně re-generuj (100 kreditů/den zdarma).

   ⚠️ Poučení z prvního pokusu (13. 7.): prompt, který jen POPISUJE drink
   („A glass of layered matcha and passionfruit…"), vede k pomalému
   nájezdu kamery (zoom-in) a žádné rotaci — Seedance to tak dělá
   defaultně. Prompt MUSÍ být příkaz ke kamerové technice, ne popis
   scény. Použij prompt výše beze změn a přidej na konec ještě:
   "Do not zoom. Do not push in. The camera never moves — only the
   glass rotates on its own vertical axis, like on a product turntable."
   A nastav délku na 10 s (default je 5 s).

## 2. Připrav frames

```sh
npm i -D ffmpeg-static        # jednorázově
npm run turntable -- fizz ~/Downloads/fizz-turntable.mp4 --from 0.2 --to 3.25
```

Výstup: `public/brand/turntable/fizz/frame-001..048.webp` + `manifest.json`.

Skript automaticky ořízne frame na bounding box drinku a odstraní bílé
pozadí (edge-connected flood fill — led/pěna uvnitř skla přežijí), takže
výsledek je průhledný výřez jako produktové fotky.

⚠️ Modely často otočí sklenici tam a zpátky. Zkontroluj směr rotace a
`--from/--to` vyber jen jednosměrný úsek: extrahuj náhledy a najdi bod
obratu (frame-to-frame rozdíl klesne k nule = pauza před obratem).
U Kling 3.0 Turbo 5s klipu to bývá ~3.3 s.

## 3. Ověř a nasaď

```sh
npm run build && npm run e2e   # showcase testy projdou beze změny
git add public/brand/turntable && git commit
git push                        # GH Pages mirror
# produkci aktualizuje /deploy (tamatcha.cz)
```

Poznámka: skript od v2 produkuje průhledné výřezy — canvas sedí přímo
na krémovém pozadí sekce, stejně jako statické fotky.
