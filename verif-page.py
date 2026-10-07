"""Garde une page Wayback en local + affiche la structure utile : grille et résultat.
Lecture seule : rien n'est écrit dans l'app ni dans archive.db.
"""
import re
import sys
import time
import urllib.request

sys.path.insert(0, r"C:\turf\bahja-pmu\backend")
from scraper.turfinfo_scraper import parse_synthese, parse_quinte_label, parse_resultat

HDRS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36"}
TS = sys.argv[1] if len(sys.argv) > 1 else "20240508233132"
OUT = rf"C:\bahja-TURF\wb-{TS}.html"

url = f"http://web.archive.org/web/{TS}id_/https://www.pronostics-turf.info/"
body = None
for i in range(5):
    try:
        req = urllib.request.Request(url, headers=HDRS)
        with urllib.request.urlopen(req, timeout=90) as r:
            body = r.read()
        break
    except Exception as e:
        print(f"  essai {i+1}: {e}")
        time.sleep(5 * (i + 1))
if not body:
    raise SystemExit("page inaccessible")

html = body.decode("utf-8", "replace")
open(OUT, "w", encoding="utf8").write(html)
print(f"écrit {OUT}  ({len(html)} caractères)")

lab = parse_quinte_label(html)
print(f"\nLABEL  : {lab}")
nums = parse_synthese(html)
print(f"GRILLE : n={len(nums)}  {'-'.join(map(str, nums))}")
rdate, rnums = parse_resultat(html)
print(f"RESULT : {rdate}  {'-'.join(map(str, rnums or []))}")

print("\n--- occurrences des mots-clés ---")
for w in ("LISTE RECAPITULATIVE", "pronostic-", "synthese", "Synthèse",
          "synthese", "syntheseGlobale", "Resultat", "esultat", "arrivee",
          "arrivée", "classement", "big16", "Td", "Quinte", "QUINTE"):
    print(f"  {w!r:26} x{len(re.findall(re.escape(w), html))}")

print("\n--- autour de 'big16' ---")
for m in list(re.finditer("big16", html))[:3]:
    print(repr(html[max(0, m.start() - 300):m.start() + 200]))
    print("  ...")

print("\n--- lignes avec 5 nombres d'un coup (résultat ?) ---")
for m in list(re.finditer(r"\b(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\b", html))[:6]:
    print(f"  ...{html[max(0,m.start()-160):m.end()+60]!r}")
