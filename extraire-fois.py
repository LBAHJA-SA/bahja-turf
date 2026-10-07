"""Le signal qu'on jette : «fois cité» — combien de fois la presse a cité
le cheval, à côté de sa place dans la grille.

Le moteur actuel ne lit QUE la place (P1..P20). Il jette le nombre à côté.
On extrait les deux et on regarde lequel annonce vraiment l'arrivée.

Lecture seule. Tout reste dans C:\\bahja-TURF\\.
"""
import json
import os
import re
import sys

sys.path.insert(0, r"C:\turf\bahja-pmu\backend")

WORK = r"C:\bahja-TURF"
SNAP = os.path.join(WORK, "wb-snapshots")


def parse_grille_nombree(html):
    """Chaque ligne de la grille : <img pronostic-N.gif> + <td class=big16>NUM</td> + <td>FOIS</td>.

    Rend [(rang, numéro, fois_cité)] trié sur rang."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        img = tds[0].find("img", src=re.compile(r"pronostic-\d+\.gif"))
        if not img:
            continue
        m = re.search(r"pronostic-(\d+)\.gif", img.get("src", ""))
        if not m:
            continue
        rang = int(m.group(1))
        num = re.sub(r"\D", "", tds[1].get_text())
        fois = re.sub(r"\D", "", tds[2].get_text())
        if not num or not (1 <= int(num) <= 30):
            continue
        out.append((rang, int(num), int(fois) if fois else None))
    out.sort(key=lambda x: x[0])
    seen, nums = set(), []
    for rang, num, fois in out:
        if 1 <= rang <= 18 and num not in seen:
            seen.add(num)
            nums.append([rang, num, fois])
    return nums


rows = json.load(open(os.path.join(WORK, "cdx-pronostics.json"), encoding="utf8"))
vues = {}
for ts, orig in rows:
    f = os.path.join(SNAP, f"{ts}.html")
    if not os.path.exists(f):
        continue
    g = parse_grille_nombree(open(f, encoding="utf8", errors="replace").read())
    if len(g) >= 14:
        vues[ts] = g

print(f"snapshots avec grille chiffrée : {len(vues)}")

# on garde, pour chaque course mesurable, la grille la plus riche
old = json.load(open(os.path.join(WORK, "press-archive.json"), encoding="utf8"))
courses = []
for r in old["races"]:
    snaps = r.get("snapshots") or []
    meilleure = None
    for ts in snaps:
        g = vues.get(ts)
        if not g:
            continue
        if len(r["grille"]) == len([x[1] for x in g]):
            meilleure = g
            break
        if meilleure is None or len(g) > len(meilleure):
            meilleure = g
    if not meilleure:
        continue
    r = dict(r)
    r["grille_foix"] = meilleure
    r["grille"] = [x[1] for x in meilleure]
    courses.append(r)

json.dump({"races": courses}, open(os.path.join(WORK, "press-archive-fois.json"), "w",
                                   encoding="utf8"), ensure_ascii=False, indent=1)
print(f"courses enrichies : {len(courses)}\n")
for r in courses[:6]:
    print(f"  {r['date']}  arrivée {'-'.join(map(str, r['arrivee']))}")
    print(f"     " + "  ".join(f"P{rg}:{n}={f}" for rg, n, f in r["grille_foix"]))
