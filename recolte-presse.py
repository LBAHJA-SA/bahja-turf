"""Récolte l'archive de presse — grille + arrivée, pour les courses passées.

Source : les snapshots Wayback de pronostics-turf.info (lecture seule).
Chaque page porte la grille du Quinté du jour ET l'arrivée de la veille.
On regroupe par date de course : une course est mesurable quand on a
à la fois sa grille (14-18 numéros) et son arrivée (5 numéros).

RIEN n'est écrit dans l'app, RIEN n'est touché dans archive.db.
Tout part dans C:\\bahja-TURF\\.
"""
import json
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, r"C:\turf\bahja-pmu\backend")
from scraper.turfinfo_scraper import parse_synthese, parse_quinte_label

WORK = r"C:\bahja-TURF"
SNAP = os.path.join(WORK, "wb-snapshots")
os.makedirs(SNAP, exist_ok=True)
HDRS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36"}


def norm(s):
    import unicodedata
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if not unicodedata.combining(c))


MOIS = {"janvier": "01", "fevrier": "02", "mars": "03", "avril": "04",
        "mai": "05", "juin": "06", "juillet": "07", "aout": "08",
        "septembre": "09", "octobre": "10", "novembre": "11",
        "decembre": "12"}


def parse_arrivee(html, jour_snapshot):
    """L'arrivée est écrite de huit façons sur le site. On lit les deux moitiés
    de la phrase — «d'hier» ou «d'aujourd'hui» — puis la date si elle est
    écrite, puis cinq numéros séparés par -, / ou un blanc.

    Rend (date ISO, [5 numéros]) ou (None, None). Une date absente se deduit
    de la phrase : «d'hier» = veille du snapshot, «d'aujourd'hui» = le jour.
    Les dead-heats («3/1») prennent le premier numéro.
    """
    import html as _html
    import datetime as _dt
    t = norm(_html.unescape(html))

    for pat, veille in (
        (r"Arrivee du QUINTE PMU d[' ]?hier", True),
        (r"Resultat QUINTE\s+d[' ]?hier", True),
        (r"(?:Arrivee du QUINTE PMU|Resultat QUINTE)\s+d[' ]?aujourd[' ]?hui", False),
    ):
        m = re.search(pat, t, re.I)
        if not m:
            continue
        seg = t[m.end():m.end() + 160]

        # la date, quand elle est écrite : "Jeudi 19 Septembre 2019:"
        date = None
        dm = re.search(r"[A-Za-z]+\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", seg)
        if dm:
            mm = MOIS.get(dm.group(2).lower())
            y = re.search(r"(\d{4})", dm.group(0))
            if mm and y:
                try:
                    date = f"{y.group(1)}-{mm}-{int(dm.group(1)):02d}"
                except ValueError:
                    date = None
        if date is None and jour_snapshot:
            d = _dt.date(*map(int, jour_snapshot.split("-")))
            date = (d - _dt.timedelta(days=1) if veille else d).isoformat()

        # les cinq numéros, après la date éventuelle
        cut = dm.end() if dm else 0
        nums_txt = seg[cut:]
        trouve = re.search(
            r"(\d{1,2})\s*[-\s/]\s*(\d{1,2})\s*[-\s/]\s*(\d{1,2})"
            r"\s*[-\s/]\s*(\d{1,2})\s*[-\s/]\s*(\d{1,2})", nums_txt)
        if not trouve:
            continue
        top5 = []
        for i in range(1, 6):
            v = int(trouve.group(i))
            if not 1 <= v <= 30:
                top5 = []
                break
            top5.append(v)
        if top5:
            return date, top5
    return None, None


def fetch(ts, orig):
    f = os.path.join(SNAP, f"{ts}.html")
    if os.path.exists(f) and os.path.getsize(f) > 2000:
        return ts, f
    url = f"http://web.archive.org/web/{ts}id_/{orig}"
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers=HDRS)
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read()
            if len(body) > 2000:
                open(f, "wb").write(body)
                return ts, f
        except Exception:
            time.sleep(3 * (i + 1))
    return ts, None


rows = json.load(open(os.path.join(WORK, "cdx-complet.json"), encoding="utf8")) \
    if os.path.exists(os.path.join(WORK, "cdx-complet.json")) \
    else json.load(open(os.path.join(WORK, "cdx-pronostics.json"), encoding="utf8"))
print(f"snapshots CDX: {len(rows)}")

done = {"n": 0, "ko": 0}
def job(r):
    ts, f = fetch(r[0], r[1])
    if f: done["n"] += 1
    else: done["ko"] += 1
    if done["n"] % 20 == 0 or done["ko"] % 20 == 0:
        print(f"  {done['n']} ok / {done['ko']} ko", flush=True)

with ThreadPoolExecutor(max_workers=3) as ex:
    list(ex.map(job, rows))
print(f"téléchargés: {done['n']}  échecs: {done['ko']}\n")

# ── regroupement par date de course ───────────────────────────────────────
races = {}
stat = {"grilles": 0, "arrivees": 0, "paires": 0}
for ts, orig in rows:
    f = os.path.join(SNAP, f"{ts}.html")
    if not os.path.exists(f): continue
    html = open(f, encoding="utf8", errors="replace").read()
    lab = parse_quinte_label(html)
    nums = parse_synthese(html)
    jour = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}"
    a_date, arr = parse_arrivee(html, jour)
    dgrid = lab.get("date") or jour

    # la course d'abord par sa grille
    rec = races.setdefault(dgrid, {
        "date": dgrid, "hippodrome": lab.get("hippodrome"),
        "prix": lab.get("prix"), "grille": None, "arrivee": None, "snapshots": []})
    rec["snapshots"].append(ts)
    if len(nums) >= 14:
        stat["grilles"] += 1
        if not rec["grille"] or len(nums) > len(rec["grille"]):
            rec["grille"] = nums[:18]
    # puis l'arrivée, rattachée à SA date
    if arr and a_date:
        stat["arrivees"] += 1
        rec2 = races.setdefault(a_date, {
            "date": a_date, "hippodrome": None, "prix": None,
            "grille": None, "arrivee": None, "snapshots": []})
        rec2["arrivee"] = arr

out = []
for rec in sorted(races.values(), key=lambda x: x["date"]):
    if rec["grille"] and rec["arrivee"]:
        stat["paires"] += 1
        out.append(rec)

json.dump({"races": out, "toutes": sorted(races.values(), key=lambda x: x["date"]),
           "stat": stat},
          open(os.path.join(WORK, "press-archive.json"), "w", encoding="utf8"),
          ensure_ascii=False, indent=1)
print(f"grilles lues: {stat['grilles']}   arrivées lues: {stat['arrivees']}")
print(f"COURSES MESURABLES (grille + arrivée): {len(out)}\n")
for r in out:
    print(f"  {r['date']}  {(r['hippodrome'] or '?')[:18]:<18} "
          f"grille={len(r['grille']):>2}  {'-'.join(map(str, r['grille']))}")
    print(f"  {'':22}arrivée = {'-'.join(map(str, r['arrivee']))}")
