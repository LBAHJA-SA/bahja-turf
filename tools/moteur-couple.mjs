/* ══════════════════════════════════════════════════════════════════════════
 *  tools/moteur-couple.mjs — LE MOTEUR « EMPREINTE DU COUPLÉ ».
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Ce fichier ÉCRIT un seul artefact :
 *  `public/data/empreinte.json` (la base des formes). Rien d'autre.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  LA MÉTHODE (vision du 07/10/2026, §20)
 *
 *  1. On ne cherche pas UNE forme, on compare : qu'est-ce qui était commun
 *     aux courses où le trio proposé a fait 3/3, contre celles où il a raté ?
 *  2. Le trio CANDIDAT vient d'une règle simple (top-3 de la cote : le
 *     meilleur critère isolé, 1.7% de podiums sur 3 986 courses).
 *  3. Sa FORME = tiers(marché) + tiers(forme) + tiers(palmarès), calculés
 *     DANS LA COURSE (jamais de seuils absolus).
 *  4. Sur le TRAIN (80% les plus anciennes) : pour chaque forme,
 *     P(3/3 | forme) et P(les 3 dans le top 3 | forme).
 *  5. On ne garde que les formes FORTES : n ≥ 10 (sinon c'est du bruit).
 *  6. Sur le TEST (20% les plus récentes, jamais vues) : le moteur ne joue
 *     que les formes fortes, et on mesure contre la baseline (toujours le
 *     top-3 de la cote = 1.7%).
 *
 *  USAGE
 *    node tools/moteur-couple.mjs               → train/test + base des formes
 *    node tools/moteur-couple.mjs --course=R1_C1_2024-09-30
 *      → le trio proposé pour une course d'archives + sa force
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_SORTIE = path.join(RACINE, 'public', 'data', 'empreinte.json')

/* ───────────────────────────────────────────────────────── les couches ── */

function formeScore(mus) {
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

/* Le trio CANDIDAT : top-3 de la cote (le meilleur critère isolé). */
function candidat(course) {
  const ps = course.partants
    .map((p) => ({ num: p.num, v: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v)
  if (ps.length < 3) return null
  return [ps[0].num, ps[1].num, ps[2].num]
}

/* La forme D'UN trio proposé : les trois couches, dans la course. */
function formeDe(course, trio) {
  const ps = course.partants
  const parNum = new Map(ps.map((p) => [p.num, p]))
  if (trio.some((n) => !parNum.get(n))) return null
  const tC = tiers(ps.map((p) => Number(p.cote_pmu ?? Infinity)).filter(Number.isFinite), 'bas')
  const tF = tiers(ps.map((p) => formeScore(p.musique)), 'haut')
  const tP = tiers(ps.map((p) => palmares(p)), 'haut')
  return trio.map((n) => {
    const p = parNum.get(n)
    return tC(Number(p.cote_pmu ?? Infinity)) + tF(formeScore(p.musique)) + tP(palmares(p))
  }).join(' ')
}

/* ───────────────────────────────────────────────────────── le moteur ──── */

function construire(courses) {
  const db = new Map()
  for (const c of courses) {
    const tri = candidat(c)
    if (!tri) continue
    const f = formeDe(c, tri)
    if (!f) continue
    if (!db.has(f)) db.set(f, { n: 0, exact: 0, les3: 0 })
    const e = db.get(f)
    e.n++
    const a = c.arrivee
    if (a[0] === tri[0] && a[1] === tri[1] && a[2] === tri[2]) e.exact++
    const set = new Set(tri)
    if (a.slice(0, 3).every((x) => set.has(x))) e.les3++
  }
  return [...db.entries()].map(([forme, e]) => ({
    forme,
    n: e.n,
    pExact: +(e.exact / e.n * 100).toFixed(1),
    pLes3: +(e.les3 / e.n * 100).toFixed(1),
    nbExact: e.exact,
  }))
}

function principale() {
  const t0 = Date.now()
  const tout = charger().filter((c) => candidat(c) && formeDe(c, candidat(c)))
  const coupe = Math.floor(tout.length * 0.8)
  const train = tout.slice(0, coupe)
  const test = tout.slice(coupe)
  console.log('')
  console.log('  MOTEUR COPLY — train ' + train.length + ' / test ' + test.length
    + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)')

  const db = construire(train)
  // la baseline : toujours le top-3 de la cote, sans regarder la forme
  let baseExact = 0
  for (const c of train) {
    const t = candidat(c)
    if (c.arrivee[0] === t[0] && c.arrivee[1] === t[1] && c.arrivee[2] === t[2]) baseExact++
  }
  const pBase = baseExact / train.length * 100
  console.log('  baseline (top-3 cote, SANS forme) : ' + pBase.toFixed(2) + '% de 3/3 sur le train')
  console.log('')

  // les formes FORTES : assez vues (n≥10) ET meilleures que la baseline ×2
  const fortes = db.filter((e) => e.n >= 10 && e.pExact >= pBase * 2)
    .sort((a, b) => b.pExact - a.pExact)
  console.log('  ══ LES FORMES FORTES (n≥10, ≥2× baseline) : ' + fortes.length + ' ══')
  for (const f of fortes.slice(0, 20)) {
    console.log('   ' + f.forme.padEnd(14) + ' n=' + String(f.n).padStart(4)
      + '  3/3=' + String(f.pExact).padStart(5) + '% (' + f.nbExact + ')'
      + '  les3=' + String(f.pLes3).padStart(5) + '%')
  }
  if (!fortes.length) console.log('   (aucune — le marché seul ne sépare rien, il faut une autre couche)')
  console.log('')

  // le TEST : on ne joue QUE les formes fortes
  const fortesSet = new Set(fortes.map((f) => f.forme))
  let jouees = 0, gagnees = 0, baseT = 0
  for (const c of test) {
    const t = candidat(c)
    if (c.arrivee[0] === t[0] && c.arrivee[1] === t[1] && c.arrivee[2] === t[2]) baseT++
    const f = formeDe(c, t)
    if (!fortesSet.has(f)) continue
    jouees++
    if (c.arrivee[0] === t[0] && c.arrivee[1] === t[1] && c.arrivee[2] === t[2]) gagnees++
  }
  console.log('  ══ TEST (' + test.length + ' courses jamais vues) ══')
  console.log('   baseline (toujours joué) : ' + baseT + '/' + test.length + ' = ' + (baseT / test.length * 100).toFixed(2) + '%')
  if (jouees) {
    console.log('   moteur (formes fortes)  : ' + gagnees + '/' + jouees + ' = ' + (gagnees / jouees * 100).toFixed(2) + '%'
    + '  (on ne joue que ' + (jouees / test.length * 100).toFixed(1) + '% des courses)')
  } else {
    console.log('   moteur : RIEN JOUÉ — aucune forme forte ne sort sur le test')
  }
  console.log('')

  // la base des formes, pour la page (backend/COUPLE la lira)
  const sortie = {
    genere: new Date().toISOString(),
    train: train.length, test: test.length,
    baseline: +pBase.toFixed(2),
    formes: db.sort((a, b) => b.n - a.n),
  }
  fs.mkdirSync(path.dirname(F_SORTIE), { recursive: true })
  fs.writeFileSync(F_SORTIE, JSON.stringify(sortie, null, 1))
  console.log('  base écrite : public/data/empreinte.json (' + db.length + ' formes)')
  console.log('')
}

function courseDemandee(cle) {
  const tout = charger()
  const c = tout.find((x) => x.cle === cle)
  if (!c) { console.log('  course introuvable : ' + cle); return }
  const tri = candidat(c)
  const f = formeDe(c, tri)
  let db = null
  try { db = JSON.parse(fs.readFileSync(F_SORTIE, 'utf8')) } catch { /* pas encore construite */ }
  const e = db?.formes?.find((x) => x.forme === f)
  console.log('')
  console.log('  ' + c.cle + '  ' + c.hippodrome + '  ' + c.date)
  console.log('  trio proposé (top-3 cote) : ' + tri.join(' - '))
  console.log('  forme : ' + f)
  if (e) {
    console.log('  historique : n=' + e.n + '  3/3=' + e.pExact + '%  les3=' + e.pLes3 + '%'
      + (e.n >= 10 && e.pExact >= (db.baseline || 0) * 2 ? '  ★ FORME FORTE — on joue' : '  · forme faible — on passe'))
  } else console.log('  forme jamais vue — on passe')
  console.log('  arrivée réelle : ' + c.arrivee.slice(0, 5).join(' - '))
  console.log('')
}

const args = process.argv.slice(2)
const dem = args.find((a) => a.startsWith('--course='))
if (dem) courseDemandee(dem.split('=')[1])
else principale()