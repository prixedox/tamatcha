import json, re, sys, os
PROJ = "/home/martin/projects/tamatcha"
tpl = open(f"{PROJ}/template.html").read()
tpl = tpl.replace("/*__FONTS__*/", open("fonts.css").read())
assets = json.load(open("assets.json"))
for key in set(re.findall(r"\{\{(\w+)\}\}", tpl)):
    if key not in assets: print("MISSING:",key); sys.exit(1)
    tpl = tpl.replace("{{"+key+"}}", assets[key])
left = re.findall(r"\{\{\w+\}\}|/\*__FONTS__\*/", tpl)
assert not left, f"leftover {left}"

# artifact fragment keeps its <title> (publish pipeline injects it into head)
open(f"{PROJ}/artifact.html","w").write(tpl)

# deploy doc: strip the fragment's leading <title> so head owns the only title
body = re.sub(r'^\s*<title>.*?</title>\s*', '', tpl, count=1)
head = '''<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tamatcha — první matcha bar v Ostravě</title>
<meta name="description" content="První matcha bar v Ostravě. Prémiová ceremoniální matcha z prefektury Kagošima — Matcha Fizz, Cloud, latté i Yerba Maté. Na Hradbách 1481/6, Ostrava-Centrum.">
<meta property="og:type" content="website">
<meta property="og:title" content="Tamatcha — první matcha bar v Ostravě">
<meta property="og:description" content="Prémiová matcha nejvyšší kvality z prefektury Kagošima, čerstvě našleháno v centru Ostravy.">
<meta property="og:locale" content="cs_CZ">
<meta name="theme-color" content="#183A2C">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23183A2C'/%3E%3Cg fill='none' stroke='%23ECE6D7' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M16 9c-4 2-6 6-6 12'/%3E%3Cpath d='M16 9c0 6 0 9 0 12'/%3E%3Cpath d='M16 9c4 2 6 6 6 12'/%3E%3Cpath d='M15 8l6-2'/%3E%3C/g%3E%3C/svg%3E">
</head>
<body>
'''
open(f"{PROJ}/index.html","w").write(head + body + "\n</body>\n</html>\n")
print("titles in index.html:", open(f"{PROJ}/index.html").read().count("<title>"))
print("titles in artifact.html:", open(f"{PROJ}/artifact.html").read().count("<title>"))
print("built:", ", ".join(f"{f} {os.path.getsize(PROJ+'/'+f)//1024}KB" for f in ("artifact.html","index.html")))
