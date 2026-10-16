/* =============================================================================
 * tools/lab-variantes.mjs — LABO DE VARIANTES (16/10/2026).
 *
 * Le vrai moteur (`remplirGrille`) remplit chaque bloc G1..G5 par un score
 * « 0.9 × podium(P) + 0.1 × marché ». Ici on rejoue LE MÊME protocole que
 * `tools/test-nonregression.mjs` (mêmes 14 courses, mêmes stats non-LOO,
 * mêmes cotes, mêmes quotas 3-2-1-1-1) en changeant SEULEMENT le score de
 * remplissage. On ne touche à rien : on choisit.
 *
 * Métrique : x/5 total /70, distribution 5/5→2/5, gagnant pris,
 * trio exact (les 3 premiers présents dans le ticket avec 8 chevaux).
 *
 * Usage : node tools/lab-variantes.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, classerPhysique, computeStats } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}
const archive = Object.values(db).filter((r) => (r.arrivee || []).length)

const coteDe = (cotes, num) => {
  const v = cotes?.[num]
  const x = Number(typeof v === 'object' ? (v?.cote ?? null) : v)
  return Number.isFinite(x) && x > 0 ? x : null
}

/* les sources de score, construites pour un `stats` donné (LOO) */
const sources = (stats) => {
  const podMap = new Map()
  for (const b of stats.podiumBloc || []) for (const d of b.detail || []) podMap.set(d.p, (d.n || 0) / Math.max(1, stats.nb))
  const parPlace = stats.parPlace || []
  const forceDe = (slot) => {
    const st = parPlace[slot - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return 0
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? st.p[best] / 100 : 0
  }
  return { podMap, forceDe }
}
const VARIANTES = {
  'podium (actuel)': (c, x, s) => 0.9 * (s.podMap.get(c.slot) ?? 0) + 0.1 * x.mkt(c),
  'force': (c, x, s) => 0.9 * s.forceDe(c.slot) + 0.1 * x.mkt(c),
  'force seul': (c, x, s) => s.forceDe(c.slot),
  'podium seul': (c, x, s) => s.podMap.get(c.slot) ?? 0,
  'cote seule': (c, x) => x.cote(c),
  '0.5 podium + 0.5 mkt': (c, x, s) => 0.5 * (s.podMap.get(c.slot) ?? 0) + 0.5 * x.mkt(c),
  '1/3 podium+force+mkt': (c, x, s) => (s.podMap.get(c.slot) ?? 0) / 3 + s.forceDe(c.slot) / 3 + x.mkt(c) / 3,
  '0.45 podium + 0.45 force + 0.1 mkt': (c, x, s) => 0.45 * (s.podMap.get(c.slot) ?? 0) + 0.45 * s.forceDe(c.slot) + 0.1 * x.mkt(c),
  'physique (classement)': (c, x) => -(x.rang(c) ?? 999),
}

const res = {}
for (const k of Object.keys(VARIANTES)) res[k] = { hits: 0, d: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }, win: 0, trio: 0, n: 0 }

for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.synthese?.length || !(r.arrivee || []).length) continue
  const grille = buildGrid(r.synthese, r.runners)
  const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
  const classement = brut.length ? classerPhysique(brut) : []
  const rangMap = new Map(classement.map((x, i) => [x.p.num, i]))
  const cotes = Object.fromEntries((eq[r.courseId]?.cotes || []).map((x) => [x.num, x]))
  const arr = (r.arrivee || []).slice(0, 5)
  /* ⚠ ANTI-FUITE : la course testée ne compte pas dans ses propres stats. */
  const stats = computeStats(archive.filter((x) => x !== r))
  const s = sources(stats)

  for (const [nom, score] of Object.entries(VARIANTES)) {
    const ticket = []
    for (const g of grille.groupes) {
      const cases = g.cases.map((c) => ({ ...c }))
      if (!cases.length) continue
      const connues = cases.filter((c) => coteDe(cotes, c.num) != null).map((c) => coteDe(cotes, c.num))
      const cMin = connues.length ? Math.min(...connues) : 0
      const cMax = connues.length ? Math.max(...connues) : 0
      const x = {
        cote: (c) => { const v = coteDe(cotes, c.num); return v == null ? 0.5 : (cMax > cMin ? (cMax - v) / (cMax - cMin) : 0.5) },
        mkt: (c) => { const v = coteDe(cotes, c.num); return v == null || !(cMax > cMin) ? 0.5 : (cMax - v) / (cMax - cMin) },
        rang: (c) => rangMap.get(c.num),
      }
      const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota
      cases.slice().sort((a, b) => (score(b, x, s) - score(a, x, s)) || (a.slot - b.slot)).slice(0, quota).forEach((c) => ticket.push(c.num))
    }
    const T = [...new Set(ticket)]
    const hits = arr.filter((n) => T.includes(n)).length
    const o = res[nom]
    o.hits += hits; o.d[hits] = (o.d[hits] || 0) + 1; o.n++
    if (T.includes(arr[0])) o.win++
    if (arr.slice(0, 3).every((n) => T.includes(n))) o.trio++
  }
}

const n = res['podium (actuel)'].n
console.log('\n' + '='.repeat(96))
console.log('  VARIANTES DE REMPLISSAGE — ' + n + ' courses, quotas 3-2-1-1-1, STATS LEAVE-ONE-OUT')
console.log('='.repeat(96))
console.log('  ' + 'variante'.padEnd(36) + 'x/5   moy   5/5  4/5  3/5  2/5  1er  trio')
console.log('  ' + '-'.repeat(92))
const base = res['podium (actuel)'].hits
for (const [nom, o] of Object.entries(res)) {
  console.log('  ' + nom.padEnd(36)
    + String(o.hits + '/' + o.n * 5).padEnd(6)
    + (o.hits / (o.n * 5)).toFixed(3).padStart(6)
    + String(o.d[5]).padStart(5) + String(o.d[4]).padStart(5) + String(o.d[3]).padStart(5) + String(o.d[2]).padStart(5)
    + String(o.win + '/' + o.n).padStart(6) + String(o.trio + '/' + o.n).padStart(6)
    + (nom === 'podium (actuel)' ? '   ← actuel' : (o.hits - base > 0 ? '   +' + (o.hits - base) : o.hits - base === 0 ? '   =' : '   ' + (o.hits - base))))
}
console.log('='.repeat(96) + '\n')
