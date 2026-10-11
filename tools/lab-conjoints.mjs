/* =============================================================================
 * tools/lab-conjoints.mjs — LABO : les 4 TESTS de l'utilisateur (11/10/2026).
 *
 *   1) 1er avec 2e avec 3e (trio)   3) 1er avec 3e (paire 1-3)
 *   2) 1er avec 2e (paire 1-2)      4) 2e avec 3e (paire 2-3)
 *
 * Chaque configuration mesurée SÉPARÉMENT (pas de moyenne géométrique qui
 * écrase tout sur les favoris — l'erreur de R-PAIRES). Clés sur TOUS les
 * candidats ordonnés du champ (pas seulement les rangs 1-2-3 du marché) :
 * starts = fois où la clé est apparue, wins = fois où elle a fini ENSEMBLE
 * aux places visées. Taux de Laplace (w+1)/(s+2), départage support.
 * Marche chronologique (tables incrémentales, que du passé), N dernières.
 * Références sur les mêmes courses : verdict causal + top3cote.
 * Usage : node tools/lab-conjoints.mjs [N=100]
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'
import { construireIndex, famille } from './empreinte-v3.mjs'
import { verdict, trioCandidat } from '../backend/COUPLE/moteur.js'

const N = Math.max(1, Number(process.argv[2]) || 100)

const rangsDe = (partants, champ) => {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p[champ] ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c))
    .sort((a, b) => a.c - b.c)
  return { ordre, parRang: new Map(ordre.map((x, i) => [x.num, i + 1])) }
}
const famDe = (partants) => {
  const m = new Map()
  for (const p of partants) {
    const f = famille(Number(p.cote_pmu ?? NaN))
    if (f) m.set(p.num, f)
  }
  return m
}

function* permutations(nums, k, pref = []) {
  if (pref.length === k) { yield pref; return }
  for (const n of nums) {
    if (pref.includes(n)) continue
    yield* permutations(nums, k, [...pref, n])
  }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
console.log('corpus : ' + tout.length + ' · test : ' + tests.length + ' (' + tests[0].date + ' → ' + tests[tests.length - 1].date + ')')

// tables incrémentales : clé -> {s, w} pour trio + 3 paires
const T = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
const touche = (map, cle, gagne) => {
  let e = map.get(cle)
  if (!e) { e = { s: 0, w: 0 }; map.set(cle, e) }
  e.s++
  if (gagne) e.w++
}
const taux = (map, cle) => {
  const e = map.get(cle)
  if (!e) return { r: 0, s: 0 }
  return { r: (e.w + 1) / (e.s + 2), s: e.s }
}
function nourrir(c) {
  const { parRang } = rangsDe(c.partants, 'cote_pmu')
  const fams = famDe(c.partants)
  const nums = c.partants.map((p) => p.num).filter((n) => fams.get(n) && parRang.get(n) != null)
  const a = (c.arrivee || []).slice(0, 3)
  for (const t of permutations(nums, 3)) {
    const k = t.map((n) => fams.get(n)).join('-') + '|' + t.map((n) => parRang.get(n)).join('-')
    touche(T.trio, k, a[0] === t[0] && a[1] === t[1] && a[2] === t[2])
  }
  for (const t of permutations(nums, 2)) {
    const k = t.map((n) => fams.get(n)).join('-') + '|' + t.map((n) => parRang.get(n)).join('-')
    touche(T.p12, k, a[0] === t[0] && a[1] === t[1])
    touche(T.p13, k, a[0] === t[0] && a[2] === t[1])
    touche(T.p23, k, a[1] === t[0] && a[2] === t[1])
  }
}
// pré-charge : tout le passé avant la 1re course testée
const t0 = Date.now()
for (const c of tout) {
  if (c.date >= tests[0].date) break
  nourrir(c)
}
console.log('tables initiales : trio=' + T.trio.size + ' p12=' + T.p12.size + ' p13=' + T.p13.size + ' p23=' + T.p23.size
  + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)')

const R = {
  trio: { j: 0, hit: 0 }, p12: { j: 0, hit: 0 }, p13: { j: 0, hit: 0 }, p23: { j: 0, hit: 0 },
  verdict: { j: 0, exact: 0, deux: 0, c1: 0 }, top3: { exact: 0, deux: 0, c1: 0 },
}
const topMotifs = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
const passe = []
for (const c of tout) {
  if (c.date < tests[0].date) { passe.push(c); continue }
  break
}
tests.forEach((course, i) => {
  const { parRang } = rangsDe(course.partants, 'cote_pmu')
  const fams = famDe(course.partants)
  const nums = course.partants.map((p) => p.num).filter((n) => fams.get(n) && parRang.get(n) != null)
  const a = course.arrivee.slice(0, 3)
  const meilleur = (map, k, nplaces) => {
    let best = null
    for (const t of permutations(nums, nplaces)) {
      const cle = t.map((n) => fams.get(n)).join('-') + '|' + t.map((n) => parRang.get(n)).join('-')
      const { r, s } = taux(map, cle)
      if (!best || r > best.r || (r === best.r && s > best.s)) best = { trio: t, r, s, cle }
      if (s >= 5) {
        const e = topMotifs[k === T.trio ? 'trio' : k === T.p12 ? 'p12' : k === T.p13 ? 'p13' : 'p23'].get(cle)
        if (!e) topMotifs[k === T.trio ? 'trio' : k === T.p12 ? 'p12' : k === T.p13 ? 'p13' : 'p23'].set(cle, { r, s })
      }
    }
    return best
  }
  const mT = meilleur(T.trio, T.trio, 3)
  if (mT) { R.trio.j++; if (a[0] === mT.trio[0] && a[1] === mT.trio[1] && a[2] === mT.trio[2]) R.trio.hit++ }
  const m12 = meilleur(T.p12, T.p12, 2)
  if (m12) { R.p12.j++; if (a[0] === m12.trio[0] && a[1] === m12.trio[1]) R.p12.hit++ }
  const m13 = meilleur(T.p13, T.p13, 2)
  if (m13) { R.p13.j++; if (a[0] === m13.trio[0] && a[2] === m13.trio[1]) R.p13.hit++ }
  const m23 = meilleur(T.p23, T.p23, 2)
  if (m23) { R.p23.j++; if (a[1] === m23.trio[0] && a[2] === m23.trio[1]) R.p23.hit++ }
  const v = verdict(course.partants, construireIndex(passe))
  if (v && v.trio) {
    R.verdict.j++
    if (v.trio[0] === a[0] && v.trio[1] === a[1] && v.trio[2] === a[2]) R.verdict.exact++
    const s = new Set(v.trio)
    if (a.filter((x) => s.has(x)).length >= 2) R.verdict.deux++
    if (v.trio[0] === a[0]) R.verdict.c1++
  }
  const tri = trioCandidat(course.partants)
  if (tri) {
    if (tri[0] === a[0] && tri[1] === a[1] && tri[2] === a[2]) R.top3.exact++
    const s = new Set(tri)
    if (a.filter((x) => s.has(x)).length >= 2) R.top3.deux++
    if (tri[0] === a[0]) R.top3.c1++
  }
  nourrir(course)
  passe.push(course)
  if ((i + 1) % 25 === 0) console.log('  … ' + (i + 1) + '/' + tests.length)
})
const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('══ LES 4 TESTS (' + tests.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s) ══')
console.log('  1) trio 1-2-3 : ' + R.trio.hit + '/' + R.trio.j + ' = ' + pct(R.trio.hit, R.trio.j))
console.log('  2) paire 1-2  : ' + R.p12.hit + '/' + R.p12.j + ' = ' + pct(R.p12.hit, R.p12.j))
console.log('  3) paire 1-3  : ' + R.p13.hit + '/' + R.p13.j + ' = ' + pct(R.p13.hit, R.p13.j))
console.log('  4) paire 2-3  : ' + R.p23.hit + '/' + R.p23.j + ' = ' + pct(R.p23.hit, R.p23.j))
console.log('  verdict causal : exact=' + R.verdict.exact + ' ' + pct(R.verdict.exact, R.verdict.j)
  + ' · ≥2=' + R.verdict.deux + ' ' + pct(R.verdict.deux, R.verdict.j) + ' · 1er=' + R.verdict.c1 + ' ' + pct(R.verdict.c1, R.verdict.j))
console.log('  top3cote       : exact=' + R.top3.exact + ' ' + pct(R.top3.exact, tests.length)
  + ' · ≥2=' + R.top3.deux + ' ' + pct(R.top3.deux, tests.length) + ' · 1er=' + R.top3.c1 + ' ' + pct(R.top3.c1, tests.length))
for (const [nom, map] of Object.entries(topMotifs)) {
  const top = [...map.entries()].sort((a, b) => b[1].r - a[1].r).slice(0, 5)
  console.log('  top ' + nom + ' : ' + top.map(([k, v]) => k + '=' + (v.r * 100).toFixed(1) + '%(n=' + v.s + ')').join('  '))
}
console.log('')
