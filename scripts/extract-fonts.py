import base64, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
css = (ROOT / "legacy" / "fonts.css").read_text()
out_fonts = ROOT / "public" / "fonts"
out_fonts.mkdir(parents=True, exist_ok=True)

blocks = re.findall(r"@font-face\s*{(.*?)}", css, re.S)
assert len(blocks) == 10, f"expected 10 @font-face blocks, got {len(blocks)}"

rules = []
for b in blocks:
    family = re.search(r"font-family:\s*'([^']+)'", b).group(1)
    weight = re.search(r"font-weight:\s*([\d ]+)", b).group(1).strip()
    urange = re.search(r"unicode-range:\s*([^;]+);", b).group(1).strip()
    subset = "latin-ext" if "U+0100" in urange else "latin"
    b64 = re.search(r"base64,([A-Za-z0-9+/=]+)", b).group(1)
    slug = f"{family.lower().replace(' ', '-')}-{weight.replace(' ', '-')}-{subset}"
    (out_fonts / f"{slug}.woff2").write_bytes(base64.b64decode(b64))
    rules.append(
        "@font-face{font-family:'%s';font-style:normal;font-weight:%s;"
        "font-display:swap;src:url('/fonts/%s.woff2') format('woff2');"
        "unicode-range:%s}" % (family, weight, slug, urange)
    )

out_css = ROOT / "src" / "styles"
out_css.mkdir(parents=True, exist_ok=True)
(out_css / "fonts.css").write_text("\n".join(rules) + "\n")
print(f"wrote {len(blocks)} fonts -> public/fonts/, src/styles/fonts.css")
