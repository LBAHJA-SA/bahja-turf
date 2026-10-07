"""Vérifie une paire de snapshots Wayback : la grille de presse et le résultat
sont-ils dans la même page, et pour quelle date ?

Lecture seule : rien n'est écrit dans archive.db, rien n'est touché dans l'app.
"""
import json
import re
import sqlite3
import sys
import time
import urllib.request
from datetime import datetime

sys.path.insert(0, r"C:\turf\bahja-pmu\backend")
from scraper.turfinfo_scraper import parse_synthese, parse_quinte_label, parse_resultat

HDRS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36"}


def get(url, timeout=90, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HDRS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(min(20, 3 * (i + 1)))
    print(f"    give up {url[:90]}: {last}")
    return None


rows = json.load(open(r"C:\bahja-TURF\cdx-pronostics.json", encoding="utf8"))
by = {}
for ts, orig in rows:
    by.setdefault(ts[:8], []).append((ts, orig))

PAIRS = [("20240509", "20240510"), ("20240507", "20240508"),
         ("20240513", "20240514"), ("20211129", "20211130")]

for d, nxt in PAIRS:
    print("=" * 72)
    print(f"PAIRE {d} -> {nxt}")
    for day in (d, nxt):
        for ts, orig in by[day]:
            body = get(f"http://web.archive.org/web/{ts}id_/{orig}")
            if not body:
                continue
            html = body.decode("utf-8", "replace")
            lab = parse_quinte_label(html)
            nums = parse_synthese(html)
            rdate, rnums = parse_resultat(html)
            print(f"  snapshot {ts}")
            print(f"    grille  : date={lab.get('date')}  "
                  f"{lab.get('hippodrome','')} / {lab.get('prix','')}")
            print(f"              n={len(nums)}  {'-'.join(map(str, nums))}")
            print(f"    resultat: date={rdate}  n={len(rnums or [])}  "
                  f"{'-'.join(map(str, rnums or []))}")
    sys.stdout.flush()
