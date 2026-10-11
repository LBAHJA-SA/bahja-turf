/* =============================================================================
 * tools/lab-paires.mjs — LABO : le COUPLÉ se joue PAR PAIRE, pas par cheval.
 *
 * Diagnostic utilisateur (11/10/2026) : « on analyse le trio ENSEMBLE, et
 * 1er+2e ENSEMBLE, 1er+3e ENSEMBLE — pas chacun seul. C'est ça, le couplé ».
 * Fond mesuré : 2196 motifs FULL pour 3115 courses (la plupart vus 1 fois :
 * support ≈ bruit) alors que les paires (fam_pair|rank_pair) reviennent
 * sans arrêt. Le verdict actuel met rel_freq en DERNIER critère.
 *
 * R-PAIRES (pré-enregistrée) : pour chaque paire de places ((1,2),(1,3),
 * (2,3)), table causale clé = fam_pair|rank_pair des chevaux À CES RANGS
 * de marché → {starts, wins}. Candidat (a,b,c) : r12, r13, r23 avec lissage
 * de Laplace (w+1)/(s+2) → score = moyenne géométrique, départage support
 * min. Face-à-face avec le verdict causal (même index causal, mêmes
 * courses) + top3cote. Usage : node tools/lab-paires.mjs [N=150]
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'
import { construireIndex, famille } from './empreinte-v3.mjs'
import { verdict, trioCandidat } from '../backend/COUPLE/moteur.js'

const N = Math.max(1, Number(process.argv[2]) || 150)

const rangsDe = (partants) => {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c))
    .sort((a, b) => a.c - b.c)
  return { ordre, parRang: new Map(ordre.map((x, i) => [x.num, i + 1])) }
}
const famDe = (partants) => {
  const m = new Map()
  for (const p of partants) m.set(p.num, famille(Number(p.cote_pmu ?? NaN)))
  return m
}
const FIABLE = (f) => f != null

function tablesPaires(passe) {
  const T = { '12': new Map(), '13': new Map(), '23': new Map() }
  const touche = (map, cle, gagne) => {
    let e = map.get(cle)
    if (!e) { e = { s: 0, w: 0 }; map.set(cle, e) }
    e.s++
    if (gagne) e.w++
  }
  for (const c of passe) {
    const { ordre, parRang } = rangsDe(c.partants)
    if (ordre.length < 3) continue
    const fams = famDe(c.partants)
    const h = [ordre[0].num, ordre[1].num, ordre[2].num]
    if (h.some((n) => !FIABLE(fams.get(n)))) continue
    const a = (c.arrivee || []).slice(0, 3)
    const cle = (x, y, rx, ry) => fams.get(x) + '-' + fams.get(y) + '|' + rx + '-' + ry
    touche(T['12'], cle(h[0], h[1], 1, 2), a[0] === h[0] && a[1] === h[1])
    touche(T['13'], cle(h[0], h[2], 1, 3), a[0] === h[0] && a[2] === h[2])
    touche(T['23'], cle(h[1], h[2], 2, 3), a[1] === h[1] && a[2] === h[2])
  }
  return T
}
const taux = (map, cle) => {
  const e = map.get(cle)
  if (!e) return { r: 0, s: 0 }
  return { r: (e.w + 1) / (e.s + 2), s: e.s }
}

function* triples(partants) {
  const nums = partants.map((p) => p.num)
  const cotes = new Map(partants.map((p) => [p.num, Number(p.cote_pmu ?? Infinity)]))
  const ok = (n) => Number.isFinite(cotes.get(n))
  for (const a of nums) {
    if (!ok(a)) continue
    for (const b of nums) {
      if (b === a || !ok(b)) continue
      for (const c of nums) {
        if (c === a || c === b || !ok(c)) continue
        yield [a, b, c]
      }
    }
  }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
console.log('corpus : ' + tout.length + ' · test : ' + tests.length + ' dernières (' + tests[0].date + ' → ' + tests[tests.length - 1].date + ')')

let pJ = 0, pExact = 0, pDeux = 0, pC1 = 0, pC2 = 0
let vJ = 0, vExact = 0, vDeux = 0, vC1 = 0, vC2 = 0
let bExact = 0, bDeux = 0, bC1 = 0, bC2 = 0
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const T = tablesPaires(passe)
  const { parRang } = rangsDe(course.partants)
  const fams = famDe(course.partants)
  let best = null
  for (const t of triples(course.partants)) {
    if (t.some((n) => !FIABLE(fams.get(n)) || parRang.get(n) == null)) continue
    const k12 = fams.get(t[0]) + '-' + fams.get(t[1]) + '|' + parRang.get(t[0]) + '-' + parRang.get(t[1])
    const k13 = fams.get(t[0]) + '-' + fams.get(t[2]) + '|' + parRang.get(t[0]) + '-' + parRang.get(t[2])
    const k23 = fams.get(t[1]) + '-' + fams.get(t[2]) + '|' + parRang.get(t[1]) + '-' + parRang.get(t[2])
    const r12 = taux(T['12'], k12), r13 = taux(T['13'], k13), r23 = taux(T['23'], k23)
    const score = Math.cbrt(r12.r * r13.r * r23.r)
    const sup = Math.min(r12.s, r13.s, r23.s)
    if (!best || score > best.score || (score === best.score && sup > best.sup)) best = { trio: t, score, sup }
  }
  const a = course.arrivee.slice(0, 3)
  if (best) {
    pJ++
    const s = new Set(best.trio)
    if (best.trio[0] === a[0] && best.trio[1] === a[1] && best.trio[2] === a[2]) pExact++
    if (a.filter((x) => s.has(x)).length >= 2) pDeux++
    if (best.trio[0] === a[0]) pC1++
    if (best.trio[1] === a[1]) pC2++
  }
  const v = verdict(course.partants, construireIndex(passe))
  if (v && v.trio) {
    vJ++
    if (v.trio[0] === a[0] && v.trio[1] === a[1] && v.trio[2] === a[2]) vExact++
    const s = new Set(v.trio)
    if (a.filter((x) => s.has(x)).length >= 2) vDeux++
    if (v.trio[0] === a[0]) vC1++
    if (v.trio[1] === a[1]) vC2++
  }
  const tri = trioCandidat(course.partants)
  if (tri) {
    if (tri[0] === a[0] && tri[1] === a[1] && tri[2] === a[2]) bExact++
    const s = new Set(tri)
    if (a.filter((x) => s.has(x)).length >= 2) bDeux++
    if (tri[0] === a[0]) bC1++
    if (tri[1] === a[1]) bC2++
  }
  if ((i + 1) % 50 === 0) console.log('  … ' + (i + 1) + '/' + tests.length)
})
const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('══ PAIRES vs VERDICT (' + tests.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s) ══')
console.log('  R-PAIRES (' + pJ + ') : exact=' + pExact + ' ' + pct(pExact, pJ) + ' · ≥2=' + pDeux + ' ' + pct(pDeux, pJ) + ' · 1er=' + pC1 + ' ' + pct(pC1, pJ) + ' · 2e=' + pC2 + ' ' + pct(pC2, pJ))
console.log('  verdict  (' + vJ + ') : exact=' + vExact + ' ' + pct(vExact, vJ) + ' · ≥2=' + vDeux + ' ' + pct(vDeux, vJ) + ' · 1er=' + vC1 + ' ' + pct(vC1, vJ) + ' · 2e=' + vC2 + ' ' + pct(vC2, vJ))
console.log('  top3cote        : exact=' + bExact + ' ' + pct(bExact, tests.length) + ' · ≥2=' + bDeux + ' ' + pct(bDeux, tests.length) + ' · 1er=' + bC1 + ' ' + pct(bC1, tests.length) + ' · 2e=' + bC2 + ' ' + pct(bC2, tests.length))
console.log('')
