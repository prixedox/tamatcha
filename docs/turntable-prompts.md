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

## 2. Připrav frames

```sh
npm i -D ffmpeg-static        # jednorázově
npm run turntable -- fizz ~/Downloads/fizz-turntable.mp4
```

Výstup: `public/brand/turntable/fizz/frame-001..048.webp` + `manifest.json`.

## 3. Ověř a nasaď

```sh
npm run build && npm run e2e   # showcase testy projdou beze změny
git add public/brand/turntable && git commit
git push                        # GH Pages mirror
# produkci aktualizuje /deploy (tamatcha.cz)
```

Poznámka: frames mají bílé pozadí — canvas na webu má proto bílý
zaoblený podklad (vypadá jako produktová karta na krémové sekci).
Transparentní pozadí není potřeba.
