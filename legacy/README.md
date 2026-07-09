# Tamatcha — web

Jednostránkový web pro **Tamatcha**, první matcha bar v Ostravě.
Postaveno podle vizuální identity z Instagramu [@tamatcha_ova](https://www.instagram.com/tamatcha_ova/).

## Co nasadit

**`index.html`** — kompletní, samostatný web. Vše (CSS, JS, fonty, fotky) je vložené přímo v souboru
jako data-URI, takže nemá žádné externí závislosti. Stačí ho nahrát na `tamatcha.cz` — funguje okamžitě,
i offline.

- `artifact.html` — stejný obsah jako fragment pro náhled v Claude Artifacts.

## Obsah webu

Hero → O nás (Kagošima) → Rituál (3 kroky) → Menu (Fizz / Cloud / Latté / Yerba Maté s cenami) →
Instagram galerie → Kde nás najdeš (adresa, otevírací doba, telefon, mapa, drink zdarma) → Patička.

Vše česky, plně responzivní (mobil na prvním místě), s animacemi při scrollování a plnou dostupností
(funguje i bez JavaScriptu).

## Úpravy

Web se generuje z `template.html`:

```bash
python3 build.py     # vloží fonty + fotky do index.html a artifact.html
```

- `template.html` — HTML + CSS + JS s tokeny (`{{FOTKA}}`, `/*__FONTS__*/`)
- `fonts.css` — self-hostované fonty Bricolage Grotesque + Hanken Grotesk (vč. české diakritiky)
- `assets.json` — fotky zakódované jako data-URI
- `source-photos/` — původní fotky z Instagramu

Barvy, texty a menu se snadno mění přímo v `template.html`.

## Zdroje

Logo, fotky, menu, ceny, otevírací doba a adresa převzaty z instagramového profilu @tamatcha_ova
(červen–červenec 2026). Fonty: Bricolage Grotesque a Hanken Grotesk (SIL Open Font License).
