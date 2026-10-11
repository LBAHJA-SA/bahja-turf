/* ══════════════════════════════════════════════════════════════════════════
 *  tools/moteur-couple.mjs — LE MOTEUR « EMPREINTE DU COUPLÉ » v2.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Ce fichier ÉCRIT un seul artefact :
 *  `public/data/empreinte.json` (la base des formes). Rien d'autre.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI v2 (critique du 07/10/2026 — juste)
 *
 *  v1 cherchait la forme EXACTE à 9 caractères (`x.forme === forme`) avec
 *  n≥10 et 3/3 ≥ 2× baseline. Résultat : 0 forme forte sur 98. Mais ce
 *  n'est pas la بصمة qui est faible : c'est la SIGNATURE qui est trop
 *  découpée (875 formes sur 3 986 trios — aucune ne revient 10 fois).
 *
 *  v2 garde Top-3 cote + 3 couches, mais interroge 4 NIVEAUX :
 *    ① complet  «MFM FmO mFF»  (les 9 caractères)
 *    ② marché   «MFM»           (la couche marché seule)
 *    ③ forme    «FmO»
 *    ④ palmarès «mFF»
 *  Et pour chaque niveau, 4 QUESTIONS (pas seulement 3/3) :
 *    Q1 les trois entrent-ils dans le Top3 ?          (les3)
 *    Q2 au moins deux y entrent-ils ?                 (auMoins2)
 *    Q3 le 1er candidat finit-il 1er ?                (p1)
 *    Q4 le 2e candidat finit-il 2e ?                  (p2)
 *  (la 3e place, trop plate — R9+ à 15% —, ne décide pas du couplé)
 *
 *  Chaque niveau stocke : n, c1, c2, c3, exact3, les3, auMoins2.
 *  FORTE = n ≥ 10 ET taux ≥ 2× baseline(de la question).
 *  JOUER = au moins une réponse forte, sur n'importe quel niveau.
 *
 *  Train 80% / test 20%, chronologique, sans fuite (§16).
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_SORTIE = path.join(RACINE, 'public', 'data', 'empreinte.json')

const SEUIL_N = 10
const FACTEUR = 2

/* ───────────────────────────────────────────────────────── les couches ── */

/* Exporté pour tools/basmah.mjs (surfaces OUT/TOC au score de forme). */
export function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  })
  return sc
}

function palmares(p) {
  return Number(p.nombreVictoires ?? 0) * 10
    + Number(p.nombrePlacesSecond ?? 0) * 3
    + Number(p.nombrePlacesTroisieme ?? 0) * 2
    + Number(p.nombrePlaces ?? 0)
}

function tiers(valeurs, sens = 'bas') {
  const tris = [...valeurs].sort((a, b) => a - b)
  const q1 = tris[Math.floor(tris.length / 3)] ?? 0
  const q2 = tris[Math.floor((tris.length * 2) / 3)] ?? 0
  if (sens === 'haut') return (v) => (v >= q2 ? 'F' : v >= q1 ? 'm' : 'O')
  return (v) => (v <= q1 ? 'F' : v <= q2 ? 'm' : 'O')
}

function candidat(course) {
  const ps = course.partants
    .map((p) => ({ num: p.num, v: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v)
  if (ps.length < 3) return null
  return [ps[0].num, ps[1].num, ps[2].num]
}

/* Les 4 niveaux d'une course : complet + une entrée par couche. */
function niveauxDe(course, trio) {
  const ps = course.partants
  const parNum = new Map(ps.map((p) => [p.num, p]))
  if (!trio || trio.some((n) => !parNum.get(n))) return null
  const tC = tiers(ps.map((p) => Number(p.cote_pmu ?? Infinity)).filter(Number.isFinite), 'bas')
  const tF = tiers(ps.map((p) => formeScore(p.musique)), 'haut')
  const tP = tiers(ps.map((p) => palmares(p)), 'haut')
  const couches = trio.map((n) => {
    const p = parNum.get(n)
    return {
      m: tC(Number(p.cote_pmu ?? Infinity)),
      f: tF(formeScore(p.musique)),
      p: tP(palmares(p)),
    }
  })
  const m = couches.map((c) => c.m).join('')
  const f = couches.map((c) => c.f).join('')
  const p = couches.map((c) => c.p).join('')
  return {
    complet: couches.map((c) => c.m + c.f + c.p).join(' '),
    marche: m, forme: f, palmares: p,
  }
}

/* ───────────────────────────────────────────────────────── la base ────── */

function cellule() {
  return { n: 0, c1: 0, c2: 0, c3: 0, exact3: 0, les3: 0, auMoins2: 0 }
}

function nourrir(tables, course) {
  const tri = candidat(course)
  if (!tri) return
  const niv = niveauxDe(course, tri)
  if (!niv) return
  const a = course.arrivee
  const set = new Set(tri)
  const dansTop3 = a.slice(0, 3).filter((x) => set.has(x)).length
  const res = {
    c1: a[0] === tri[0] ? 1 : 0,
    c2: a[1] === tri[1] ? 1 : 0,
    c3: a[2] === tri[2] ? 1 : 0,
    exact3: a[0] === tri[0] && a[1] === tri[1] && a[2] === tri[2] ? 1 : 0,
    les3: dansTop3 === 3 ? 1 : 0,
    auMoins2: dansTop3 >= 2 ? 1 : 0,
  }
  for (const niveau of ['complet', 'marche', 'forme', 'palmares']) {
    const cle = niv[niveau]
    if (!tables[niveau].has(cle)) tables[niveau].set(cle, cellule())
    const e = tables[niveau].get(cle)
    e.n++
    e.c1 += res.c1; e.c2 += res.c2; e.c3 += res.c3
    e.exact3 += res.exact3; e.les3 += res.les3; e.auMoins2 += res.auMoins2
  }
}

function baselinesDe(courses) {
  let n = 0
  const s = { c1: 0, c2: 0, c3: 0, exact3: 0, les3: 0, auMoins2: 0 }
  for (const c of courses) {
    const tri = candidat(c)
    if (!tri || !niveauxDe(c, tri)) continue
    n++
    const a = c.arrivee
    const set = new Set(tri)
    const d = a.slice(0, 3).filter((x) => set.has(x)).length
    if (a[0] === tri[0]) s.c1++
    if (a[1] === tri[1]) s.c2++
    if (a[2] === tri[2]) s.c3++
    if (a[0] === tri[0] && a[1] === tri[1] && a[2] === tri[2]) s.exact3++
    if (d === 3) s.les3++
    if (d >= 2) s.auMoins2++
  }
  const r = (x) => +(x / Math.max(1, n) * 100).toFixed(2)
  return { n, c1: r(s.c1), c2: r(s.c2), c3: r(s.c3), exact3: r(s.exact3), les3: r(s.les3), auMoins2: r(s.auMoins2) }
}

/* ───────────────────────────────────────────────────────── le run ─────── */

const QUESTIONS = [
  ['les3', 'Q1 les 3 dans le Top3'],
  ['auMoins2', 'Q2 au moins 2 dans le Top3'],
  ['c1', 'Q3 le 1er finit 1er'],
  ['c2', 'Q4 le 2e finit 2e'],
  ['exact3', 'Q5 podium exact'],
]

function fortesDe(table, base) {
  const out = []
  for (const [forme, e] of table) {
    if (e.n < SEUIL_N) continue
    const lignes = []
    for (const [cle, label] of QUESTIONS) {
      const taux = e[cle] / e.n * 100
      if (taux >= base[cle] * FACTEUR) lignes.push({ q: label, taux: +taux.toFixed(1), nb: e[cle] })
    }
    if (lignes.length) out.push({ forme, n: e.n, lignes })
  }
  return out.sort((a, b) => b.lignes[0].taux - a.lignes[0].taux)
}

function principale() {
  const t0 = Date.now()
  const tout = charger().filter((c) => candidat(c) && niveauxDe(c, candidat(c)))
  const coupe = Math.floor(tout.length * 0.8)
  const train = tout.slice(0, coupe)
  const test = tout.slice(coupe)
  console.log('')
  console.log('  MOTEUR COPLY v2 — train ' + train.length + ' / test ' + test.length
    + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)')

  const base = baselinesDe(train)
  console.log('  baselines : 3/3=' + base.exact3 + '%  les3=' + base.les3
    + '%  ≥2=' + base.auMoins2 + '%  1er=' + base.c1 + '%  2e=' + base.c2 + '%')
  console.log('')

  const tables = { complet: new Map(), marche: new Map(), forme: new Map(), palmares: new Map() }
  for (const c of train) nourrir(tables, c)

  const fortes = {}
  let totalFortes = 0
  for (const niveau of Object.keys(tables)) {
    fortes[niveau] = fortesDe(tables[niveau], base)
    totalFortes += fortes[niveau].length
    console.log('  ══ ' + niveau.toUpperCase() + ' : ' + fortes[niveau].length + ' formes fortes ══')
    for (const f of fortes[niveau].slice(0, 10)) {
      console.log('   ' + f.forme.padEnd(14) + ' n=' + String(f.n).padStart(4)
        + '   ' + f.lignes.map((l) => l.q.split(' ')[0] + '=' + l.taux + '%').join('  '))
    }
    if (!fortes[niveau].length) console.log('   (aucune)')
    console.log('')
  }

  // TEST : on joue quand AU MOINS une réponse est forte, sur n'importe quel niveau
  const clefs = {}
  for (const niveau of Object.keys(fortes)) clefs[niveau] = new Set(fortes[niveau].map((f) => f.forme))
  let jouees = 0, gagnees = 0, gagnees2 = 0, baseExact = 0
  for (const c of test) {
    const tri = candidat(c)
    if (c.arrivee[0] === tri[0] && c.arrivee[1] === tri[1] && c.arrivee[2] === tri[2]) baseExact++
    const niv = niveauxDe(c, tri)
    const touche = Object.keys(clefs).some((niveau) => clefs[niveau].has(niv[niveau]))
    if (!touche) continue
    jouees++
    const a = c.arrivee
    if (a[0] === tri[0] && a[1] === tri[1] && a[2] === tri[2]) gagnees++
    const set = new Set(tri)
    if (a.slice(0, 3).filter((x) => set.has(x)).length >= 2) gagnees2++
  }
  console.log('  ══ TEST (' + test.length + ' courses jamais vues) ══')
  console.log('   baseline (toujours joué) : 3/3 = ' + baseExact + '/' + test.length + ' = ' + (baseExact / test.length * 100).toFixed(2) + '%')
  if (jouees) {
    console.log('   moteur (≥1 réponse forte) : 3/3 = ' + gagnees + '/' + jouees + ' = ' + (gagnees / jouees * 100).toFixed(2) + '%'
      + '   ≥2/3 = ' + gagnees2 + '/' + jouees + ' = ' + (gagnees2 / jouees * 100).toFixed(2) + '%'
      + '   (' + (jouees / test.length * 100).toFixed(1) + '% des courses jouées)')
  } else console.log('   moteur : RIEN JOUÉ')
  console.log('')

  const sortie = {
    genere: new Date().toISOString(),
    train: train.length, test: test.length,
    seuils: { n: SEUIL_N, facteur: FACTEUR },
    baselines: base,
    niveaux: Object.fromEntries(Object.entries(tables).map(([niveau, table]) => [niveau,
      [...table.entries()].map(([forme, e]) => ({ forme, ...e }))
        .sort((a, b) => b.n - a.n)])),
  }
  fs.mkdirSync(path.dirname(F_SORTIE), { recursive: true })
  fs.writeFileSync(F_SORTIE, JSON.stringify(sortie, null, 1))
  console.log('  base écrite : public/data/empreinte.json')
  console.log('    complet=' + tables.complet.size + '  marche=' + tables.marche.size
    + '  forme=' + tables.forme.size + '  palmares=' + tables.palmares.size)
  console.log('')
}

const args = process.argv.slice(2)
const dem = args.find((a) => a.startsWith('--course='))
/* 11/10/2026 — garde-fou import : ce module est aussi importé (formeScore)
 * par tools/basmah.mjs. Sans ça, l'import lançait principale() et
 * RÉÉCRIVAIT public/data/empreinte.json par surprise (constaté le 11/10).
 * Le run ne part que si CE FICHIER est le lanceur (cf. daily.mjs). */
const EST_LANCEUR = !!process.argv[1]
  && path.resolve(process.argv[1]) === path.join(path.dirname(fileURLToPath(import.meta.url)), 'moteur-couple.mjs')
if (dem) {
  const tout = charger()
  const c = tout.find((x) => x.cle === dem.split('=')[1])
  if (!c) console.log('  course introuvable')
  else {
    const tri = candidat(c)
    console.log('')
    console.log('  ' + c.cle + '  ' + c.hippodrome + '  ' + c.date)
    console.log('  trio : ' + tri.join(' - '))
    console.log('  niveaux : ' + JSON.stringify(niveauxDe(c, tri)))
    console.log('  arrivée : ' + c.arrivee.slice(0, 5).join(' - '))
    console.log('')
  }
} else if (EST_LANCEUR) principale()