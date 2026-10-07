"""Quelles formes prend l'arrivée dans les pages Wayback ?"""
import glob
import os
import re
import sys
import html as _html
import unicodedata

sys.path.insert(0, r"C:\turf\bahja-pmu\backend")
from scraper.turfinfo_scraper import parse_synthese, parse_quinte_label

WORK = r"C:\bahja-TURF\wb-snapshots"


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if not unicodedata.combining(c))


files = sorted(glob.glob(os.path.join(WORK, "*.html")))
formes = {}
ex = {}
for f in files:
    ts = os.path.basename(f)[:14]
    h = open(f, encoding="utf8", errors="replace").read()
    t = norm(_html.unescape(h))
    for m in re.finditer(r"Arrivee", t, re.I):
        seg = t[m.start():m.start() + 120]
        key = re.sub(r"\d+", "N", seg)[:70]
        formes[key] = formes.get(key, 0) + 1
        ex.setdefault(key, (ts, seg))

print(f"{len(files)} snapshots\n")
print("--- formes trouvées autour de 'Arrivee' ---")
for k, v in sorted(formes.items(), key=lambda x: -x[1]):
    print(f"  x{v:<4} [{ex[k][0]}]  {ex[k][1][:100]!r}")
    print(f"         clé: {k}")
