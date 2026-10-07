/* ---------------------------------------------------------------
 * tools\tranches-d.mjs  —  ⭐ D = 3-3-1-0-1, VU DANS LE TEMPS
 *
 *   node tools\tranches-d.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *   Le moteur garde 3-2-1-1-1. Ce script mesure, il ne touche à rien.
 *
 * ⚠ RAPPEL §11.16 : les quotas 3-2-1-1-1 sont FERMÉS. Une mesure qui
 *   les contredit ne les change pas : elle demande à être vérifiée une
 *   deuxième fois, sur d'autres données, avant toute décision.
 *
 * L HYPOTHÈSE PRÉCISE (ce que D dit, mot pour mot)
 *   D ne dit pas « G4 est mauvais ».
 *   D dit : le SIÈGE qui était donné à G4 vaut mieux s'il va à G2.
 *   C'est une comparaison de deux sièges, pas un procès de G4.
 *   Donc la question qui décide est :   G2[3]  contre  G4[1].
 *
 * CE QUE FAIT CE SCRIPT, en quatre temps
 *   ① les 4 TRANCHES chronologiques — le stabilite
 *   ② les courses RÉELLEMENT CHANGÉES — pas les NO-OP
 *   ③ l ATTRIBUTION : quand D gagne, c'est grâce à G2[3] ou malgré lui ?
 *   ④ la comparaison frontale  G2[3]  contre  G4[1]
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const QUOTA_A = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const QUOTA_D = { G1: 3, G2: 3, G3: 1, G4: 0, G5: 1 }
const NB_TRANCHES = 4

const corpus = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = corpus.length

const cands = corpus.map((k) => BLOCS.map((b, i) =>
  k.presse.filter((x) => { const r = k.pDe.get(x); return r >= b.min && r <= b.max })
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))

/** le ticket, avec le siège exact de chaque cheval */
function ticket(ki, quota) {
  const nums = []
  const siege = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    cands[ki][i].slice(0, quota[BLOCS[i].id]).forEach((num, r) => {
      nums.push(num)
      siege.set(num, BLOCS[i].id + '[' + (r + 1) + ']')
    })
  }
  return { nums, siege }
}
const TA = corpus.map((k, ki) => ticket(ki, QUOTA_A))
const TD = corpus.map((k, ki) => ticket(ki, QUOTA_D))

function mesurer(idx, T) {
  const portes = []
  let n3 = 0; let ge2 = 0; let p4 = 0; let ge34 = 0
  let p5 = 0; let ge4 = 0; let ge35 = 0
  for (const ki of idx) {
    const k = corpus[ki]
    const s = new Set(T[ki].nums)
    const a = k.arrivee
    const h3 = a.slice(0, 3).filter((x) => s.has(x)).length
    const h4 = a.slice(0, 4).filter((x) => s.has(x)).length
    const h5 = a.slice(0, 5).filter((x) => s.has(x)).length
    if (h3 === 3) { n3++; portes.push({ h4, h5 }) }
    if (h3 >= 2) ge2++
    if (h4 === 4) p4++
    if (h4 >= 3) ge34++
    if (h5 === 5) p5++
    if (h4 === 4) ge4++
    if (h5 >= 3) ge35++
  }
  const nb = idx.length
  const np = portes.length
  return {
    nb, np, n3, n5: p5,
    p3: n3 / nb * 100, ge2: ge2 / nb * 100,
    p4: p4 / nb * 100, ge34: ge34 / nb * 100,
    p5: p5 / nb * 100, ge4: ge4 / nb * 100, ge35: ge35 / nb * 100,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    c45: np ? portes.filter((r) => r.h5 >= 4).length / np * 100 : null,
    moy: np ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
  }
}

const f = (v) => (v == null ? '  —  ' : v.toFixed(1).padStart(5))
const sig = (d, b) => (Math.abs(d) <= b ? '=' : d > 0 ? '↑' : '↓')

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ D = 3-3-1-0-1, VU DANS LE TEMPS')
console.log('     ' + n + ' Quintés · ' + corpus[0].date + ' → ' + corpus[n - 1].date)
console.log('     A = 3-2-1-1-1   D = 3-3-1-0-1   (laboratoire, moteur inchangé)')
console.log('')

/* ═══ ① les 4 tranches ════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LES 4 TRANCHES CHRONOLOGIQUES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const taille = Math.ceil(n / NB_TRANCHES)
const tranches = []
for (let t = 0; t < NB_TRANCHES; t++) {
  const idx = corpus.map((_, i) => i).slice(t * taille, Math.min((t + 1) * taille, n))
  if (idx.length) tranches.push({ t, idx, lib: corpus[idx[0]].date.slice(5) + ' → ' + corpus[idx[idx.length - 1]].date.slice(5) })
}

console.log('  tranche          nb   3/3              5/5 | 3/3         ≥4/5 | 3/3      moyenne')
console.log('                        A →   D     Δ    A →   D     Δ    A →   D     Δ    A →   D')
console.log('  ' + '-'.repeat(100))
const sens = []
for (const tr of tranches) {
  const a = mesurer(tr.idx, TA)
  const b = mesurer(tr.idx, TD)
  const bp = 100 / a.nb / 2
  const bc = a.np ? 100 / a.np / 2 : 1
  const d3 = b.p3 - a.p3
  const d5 = (b.c55 == null ? 0 : b.c55) - (a.c55 == null ? 0 : a.c55)
  const d45 = (b.c45 == null ? 0 : b.c45) - (a.c45 == null ? 0 : a.c45)
  const dm = b.moy - a.moy
  sens.push({ d3, d5, d45, dm, bp, bc, a, b })
  console.log('  ' + ('T' + (tr.t + 1) + ' ' + tr.lib).padEnd(14) + String(a.nb).padStart(3)
    + '  ' + f(a.p3) + ' → ' + f(b.p3) + sig(d3, bp).padStart(3)
    + '   ' + f(a.c55) + ' → ' + f(b.c55) + sig(d5, bc).padStart(3)
    + '   ' + f(a.c45) + ' → ' + f(b.c45) + sig(d45, bc).padStart(3)
    + '   ' + a.moy.toFixed(2) + ' → ' + b.moy.toFixed(2) + sig(dm, 0.03).padStart(3))
}
const A = mesurer(corpus.map((_, i) => i), TA)
const B = mesurer(corpus.map((_, i) => i), TD)
console.log('  ' + '-'.repeat(100))
console.log('  ' + 'TOUTES'.padEnd(14) + String(n).padStart(3)
  + '  ' + f(A.p3) + ' → ' + f(B.p3) + sig(B.p3 - A.p3, 100 / n / 2).padStart(3)
  + '   ' + f(A.c55) + ' → ' + f(B.c55) + sig((B.c55 - A.c55), 100 / A.np / 2).padStart(3)
  + '   ' + f(A.c45) + ' → ' + f(B.c45) + sig((B.c45 - A.c45), 100 / A.np / 2).padStart(3)
  + '   ' + A.moy.toFixed(2) + ' → ' + B.moy.toFixed(2) + sig(B.moy - A.moy, 0.03).padStart(3))
console.log('')

console.log('  ⭐ LE SENS DANS LE TEMPS')
const bruitDe = (cle, x) => (cle === 'dm' ? 0.03 : cle === 'd3' ? x.bp : x.bc)

for (const [lib, cle] of [
  ['porte 3/3', 'd3'], ['5/5 | 3/3', 'd5'], ['≥4/5 | 3/3', 'd45'], ['moyenne', 'dm'],
]) {
  const s = sens.map((x) => sig(x[cle], bruitDe(cle, x)))
  const pos = sens.filter((x) => sig(x[cle], bruitDe(cle, x)) === '↑').length
  const neg = sens.filter((x) => sig(x[cle], bruitDe(cle, x)) === '↓').length
  console.log('     ' + lib.padEnd(13) + s.join('  ') + '   → ' + pos + '↑ / ' + neg + '↓'
    + '     (Δ réels : ' + sens.map((x) => (x[cle] > 0 ? '+' : '') + x[cle].toFixed(1)).join('  ') + ')')
}
console.log('')

/* ═══ ② les courses RÉELLEMENT changées ═══════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LES COURSES RÉELLEMENT CHANGÉES — pas les NO-OP')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const changees = []
for (let ki = 0; ki < n; ki++) {
  const sa = new Set(TA[ki].nums)
  const sd = new Set(TD[ki].nums)
  const sort = [...sa].filter((x) => !sd.has(x))
  const entre = [...sd].filter((x) => !sa.has(x))
  if (!sort.length && !entre.length) continue
  const k = corpus[ki]
  const ha = k.arrivee.slice(0, 5).filter((x) => sa.has(x)).length
  const hd = k.arrivee.slice(0, 5).filter((x) => sd.has(x)).length
  const p3a = k.arrivee.slice(0, 3).filter((x) => sa.has(x)).length
  const p3d = k.arrivee.slice(0, 3).filter((x) => sd.has(x)).length
  changees.push({
    ki, cle: k.cle, date: k.date, t: Math.floor(ki / taille),
    sort: sort.map((x) => TA[ki].siege.get(x)),
    entre: entre.map((x) => TD[ki].siege.get(x)),
    p3a, p3d, ha, hd,
  })
}
console.log('  ' + changees.length + ' courses sur ' + n + ' changent RÉELLEMENT le ticket.')
console.log('  les ' + (n - changees.length) + ' autres sont des NO-OP (les deux quotas donnent le même ticket).')
console.log('')

/* le compteur STRICT : on compte les Truly 3/3 gagnés ou perdus,
   pas les simples « un rung de plus » */
const gain3 = changees.filter((c) => c.p3a < 3 && c.p3d === 3)
const perte3 = changees.filter((c) => c.p3a === 3 && c.p3d < 3)
console.log('  sur les ' + changees.length + ' courses changées :')
console.log('     un ticket devient 3/3   : ' + gain3.length)
console.log('     un ticket cesse d être 3/3 : ' + perte3.length)
console.log('     solde net                     : ' + (gain3.length - perte3.length > 0 ? '+' : '') + (gain3.length - perte3.length))
console.log('')
console.log(' .detail des 3/3 gagnées :')
gain3.forEach((c) => {
  console.log('     ' + c.cle.padEnd(20) + 'sort ' + c.sort.join(',').padEnd(10)
    + '→ entre ' + c.entre.join(',').padEnd(10) + ' 3/3 ' + c.p3a + '→' + c.p3d)
})
if (perte3.length) {
  console.log('')
  console.log('  .detail des 3/3 perdues :')
  perte3.forEach((c) => {
    console.log('     ' + c.cle.padEnd(20) + 'sort ' + c.sort.join(',').padEnd(10)
      + '→ entre ' + c.entre.join(',').padEnd(10) + ' 3/3 ' + c.p3a + '→' + c.p3d)
  })
}
console.log('')

/* ═══ ③ l ATTRIBUTION ═════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ QUI FAIT LE TRAVAIL ? — l ATTRIBUTION DES SIÈGES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⭐ D ne dit pas « G4 est mauvais ». D dit : le siège de G4 vaut')
console.log('    mieux s il va à G2. Donc on regarde QUEL SIÈGEremplace QUEL.')
console.log('')

const paires = new Map()
for (const c of changees) {
  const cle = c.sort.join('+') + '  →  ' + c.entre.join('+')
  if (!paires.has(cle)) paires.set(cle, { nb: 0, g3: 0, p3: 0, g5: 0 })
  const e = paires.get(cle)
  e.nb++
  if (c.p3d > c.p3a) e.g3++
  if (c.p3d < c.p3a) e.p3++
  if (c.hd > c.ha) e.g5++
}
console.log('  substitution                       courses   3/3 monté   3/3 baissé   5/5 monté')
console.log('  ' + '-'.repeat(84))
for (const [cle, e] of [...paires.entries()].sort((a, b) => b[1].nb - a[1].nb)) {
  console.log('  ' + cle.padEnd(34) + String(e.nb).padStart(7) + String(e.g3).padStart(12)
    + String(e.p3).padStart(12) + String(e.g5).padStart(13))
}
console.log('')

/* ═══ ④ G2[3] contre G4[1], front à front ════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ G2[3]  contre  G4[1] — le duel qui décide')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

/* sur toutes les courses où les deux sièges existent, on regarde
   ce que chacun a donné comme PLACE, quand il a été pris */
/* le duel, à périmètre égal : G2[3] est mesuré DANS D (là où il est
   pris), G4[1] dans A (là où il est pris). Sinon on compare 0 contre 89. */
const duel = {
  'G2[3] dans D': { n: 0, places: [0, 0, 0, 0, 0, 0], top3: 0, top5: 0 },
  'G4[1] dans A': { n: 0, places: [0, 0, 0, 0, 0, 0], top3: 0, top5: 0 },
}
for (let ki = 0; ki < n; ki++) {
  const k = corpus[ki]
  const paires = [
    ['G2[3] dans D', 'G2[3]', TD[ki].siege],
    ['G4[1] dans A', 'G4[1]', TA[ki].siege],
  ]
  for (const [nom, cle, siege] of paires) {
    const found = [...siege.entries()].find(([, v]) => v === cle)
    if (!found) continue
    const num = found[0]
    duel[nom].n++
    const p = k.arrivee.indexOf(num) + 1
    duel[nom].places[Math.min(p, 6) - 1]++
    if (p >= 1 && p <= 3) duel[nom].top3++
    if (p >= 1 && p <= 5) duel[nom].top5++
  }
}
console.log('  siège            pris   1er    2e    3e    4e    5e    6e+   |  podium   Top5')
console.log('  ' + '-'.repeat(80))
for (const s of ['G2[3] dans D', 'G4[1] dans A']) {
  const d = duel[s]
  console.log('  ' + s.padEnd(16) + String(d.n).padStart(4)
    + String(d.places[0]).padStart(7) + String(d.places[1]).padStart(6) + String(d.places[2]).padStart(6)
    + String(d.places[3]).padStart(6) + String(d.places[4]).padStart(6) + String(d.places[5]).padStart(7)
    + '   |  ' + (d.n ? (d.top3 / d.n * 100).toFixed(1).padStart(5) : '  —  ')
    + (d.n ? (d.top5 / d.n * 100).toFixed(1).padStart(6) + ' %' : ''))
}
console.log('')
const d2 = duel['G2[3] dans D']
const d4 = duel['G4[1] dans A']
console.log('  ⭐ podium : G2[3] ' + (d2.n ? (d2.top3 / d2.n * 100).toFixed(1) : '—') + ' %'
  + '   contre   G4[1] ' + (d4.n ? (d4.top3 / d4.n * 100).toFixed(1) : '—') + ' %')
console.log('    Top 5  : G2[3] ' + (d2.n ? (d2.top5 / d2.n * 100).toFixed(1) : '—') + ' %'
  + '   contre   G4[1] ' + (d4.n ? (d4.top5 / d4.n * 100).toFixed(1) : '—') + ' %')
console.log('')
if (d2.n && d4.n) {
  const ecart = d2.top3 / d2.n * 100 - d4.top3 / d4.n * 100
  console.log('    écart de podium : ' + (ecart > 0 ? '+' : '') + ecart.toFixed(1) + ' point(s)')
  console.log('    ⚠ ' + d2.n + ' et ' + d4.n + ' observations : 1 erreur = 3 à 5 points.')
  console.log('      Ne pas conclure sur un écart de moins de 10 points.')
}
console.log('')

/* ═══ ⑤ le verdict ═══════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LE VERDICT')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const pos3 = sens.filter((x) => sig(x.d3, x.bp) === '↑').length
const neg3 = sens.filter((x) => sig(x.d3, x.bp) === '↓').length
const pos5 = sens.filter((x) => sig(x.d5, x.bc) === '↑').length
const neg5 = sens.filter((x) => sig(x.d5, x.bc) === '↓').length
console.log('  ① la porte 3/3 monte dans ' + pos3 + ' tranche(s), baisse dans ' + neg3)
console.log('  ② la conversion 5/5|3/3 monte dans ' + pos5 + ', baisse dans ' + neg5)
console.log('')
if (pos3 >= 3 && neg5 === 0 && neg3 === 0) {
  console.log('  ⭐ D PASSE LE CRITÈRE DE STABILITÉ.')
  console.log('    Mais : ' + changees.length + ' courses changées seulement sur ' + n + '.')
  console.log('    ⇒ il faut confirmer sur le corpus 347 AVANT toute décision.')
} else if (pos3 >= 3 && neg5 > 0) {
  console.log('  ⚠ D monte la porte mais casse la conversion dans au moins une tranche.')
  console.log('    ⇒ REFUSÉE pour l’instant.')
} else {
  console.log('  ⭐ D N EST PAS STABLE DANS LE TEMPS.')
  console.log('    ⇒ le gain des 94 courses vient d une période précise, pas d un motif.')
}
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Rappel §11.16 : les quotas 3-2-1-1-1 sont FERMÉS depuis le 05/10.')
console.log('    Ce script ne change rien. Il mesure.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')
