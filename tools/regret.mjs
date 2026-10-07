/* ---------------------------------------------------------------
 * tools\regret.mjs  —  ⭐ G4 = REGRET — LE TEST DÉCISIF
 *
 *   node tools\regret.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *   Le moteur garde 3-2-1-1-1. Ce script mesure, il ne touche à rien.
 *
 * ⚠ RAPPEL §11.16 : les quotas 3-2-1-1-1 sont FERMÉS depuis le 05/10.
 *   Ce test ne les rouvre pas : il demande si le SIÈGE de G4 vaut moins
 *   que le SIÈGE de G2[3], et le prouve (ou non) sur deux corpus.
 *
 * LA STRUCTURE NOUVELLE
 *        G1        G2        G3       G5
 *     3 chevaux  3 chevaux   1        1      = 8 principaux
 *                  G4[1] → REGRET, premier remplaçant
 *
 *   C'est D = 3-3-1-0-1, mais avec une lecture stratégique :
 *   on ne dit pas « G4 est mauvais », on dit « le siège de G4 vaut
 *   moins que le 3e siège de G2 pour la complétion du Quinté ».
 *
 * LE PROBLÈME DU REGRET, ET LA MESURE
 *   dans B, G4[1] n'est pas dans le ticket : il ne peut donc pas
 *   « sauver » B directement. Sa valeur se mesure en CONTRE-FACTUEL :
 *   que donnerait B si on lui rajoutait G4[1] en 9e cheval ?
 *   Symétriquement : que donnerait A si on lui rajoutait G2[3] ?
 *
 * CE QUE CE SCRIPT DONNE
 *   ① A contre B sur les 4 périodes du corpus 347
 *   ② le REGRET : la valeur du 9e cheval, G4[1] et G2[3]
 *   ③ la VALEUR NETTE du remplacement : gain G2[3] − perte G4[1]
 *   ④ l ATTRIBUTION : quel siège a apporté le 4e et le 5e
 *   ⑤ le verdict, avec la règle stricte
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FF = path.join(RACINE, 'data', 'corpus', 'fusion.json')
const F94 = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const QA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const QB = { G1: 3, G2: 3, G3: 1, G4: 0, G5: 1 }
const PERIODES = [
  ['P1 · 2024-09 → 2025-10', '2024-01-01', '2025-12-31'],
  ['P2 · 2026-01 → 2026-03', '2026-01-01', '2026-03-31'],
  ['P3 · 2026-04 → 2026-06', '2026-04-01', '2026-06-30'],
  ['P4 · 2026-07 → 2026-10', '2026-07-01', '2026-12-31'],
]
const f5 = (v) => v.toFixed(1).padStart(5)
const sig = (x, b) => (Math.abs(x) <= b ? '=' : x > 0 ? '↑' : '↓')

/* ══════════════════════════════════════════════════════════════════
 *  un moteur générique : cotes comme ordre de référence, ou presse
 * ════════════════════════════════════════════════════════════════ */
function construire(courses, mode) {
  const base = courses.map((k) => ({ ...k, arrivee: (k.arrivee || []).slice() }))
    .filter((k) => k.arrivee.length >= 5)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const pDe = base.map((k) => new Map(k.presse.map((x, i) => [x, i + 1])))
  const cands = base.map((k, ki) => BLOCS.map((b, i) => {
    const o = mode === 'presse' ? k.presse : (k.ordreCote || []).slice()
    return o.filter((x, r) => {
      const rr = mode === 'presse' ? pDe[ki].get(x) : r + 1
      return rr >= b.min && rr <= b.max
    }).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
  }))
  return { base, cands, pDe }
}
function tk(M, ki, quota, extra) {
  const s = new Set()
  const siege = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    M.cands[ki][i].slice(0, quota[BLOCS[i].id]).forEach((num, r) => {
      s.add(num)
      siege.set(num, BLOCS[i].id + '[' + (r + 1) + ']')
    })
  }
  if (extra && siege.has(extra)) s.add(extra)
  return { s, siege }
}
const h = (k, s, n) => k.arrivee.slice(0, n).filter((x) => s.has(x)).length

function empreinte(M, idx, T, qui) {
  const portes = []
  let n3 = 0; let ge2 = 0; let p4 = 0; let ge34 = 0; let p5 = 0; let ge4 = 0; let ge35 = 0
  for (const ki of idx) {
    const k = M.base[ki]
    const s = T[ki].s
    const h3 = h(k, s, 3); const h4 = h(k, s, 4); const h5 = h(k, s, 5)
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
    nom: qui, nb, np, n3, n5: p5,
    p3: n3 / nb * 100, ge2: ge2 / nb * 100,
    p4: p4 / nb * 100, ge34: ge34 / nb * 100,
    p5: p5 / nb * 100, ge4: ge4 / nb * 100, ge35: ge35 / nb * 100,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
    nb44: np ? portes.filter((r) => r.h4 === 4).length : 0,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    nb55: np ? portes.filter((r) => r.h5 === 5).length : 0,
    c45: np ? portes.filter((r) => r.h5 >= 4).length / np * 100 : null,
    nb45: np ? portes.filter((r) => r.h5 >= 4).length : 0,
    moy: np ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
  }
}

/* ══════════════════════════════════════════════════════════════════
 *  ① SUR LE CORPUS 347, EN 4 PÉRIODES
 * ════════════════════════════════════════════════════════════════ */
const FUS = JSON.parse(fs.readFileSync(FF, 'utf8')).courses
const M347 = construire(FUS, 'cote')
const idx347 = M347.base.map((_, i) => i)
const TA347 = idx347.map((ki) => tk(M347, ki, QA))
const TB347 = idx347.map((ki) => tk(M347, ki, QB))

console.log('')
console.log('  ⭐⭐ G4 = REGRET — LE TEST DÉCISIF')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LE CORPUS 347, EN 4 PÉRIODES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  A = 3-2-1-1-1   (l architecture actuelle)')
console.log('  B = 3-3-1-0-1   (G2 passe à 3, G4 devient REGRET)')
console.log('')

const NIVEAUX = [...PERIODES.map(([lib, a, b]) => [lib, idx347.filter((i) => {
  const d = M347.base[i].date
  return d >= a && d <= b
})]), ['TOUT LE CORPUS', idx347]]
const sens = []
for (const [lib, idx] of NIVEAUX) {
  if (!idx.length) continue
  const a = empreinte(M347, idx, TA347, 'A')
  const b = empreinte(M347, idx, TB347, 'B')
  const bp = 100 / a.nb / 2
  const bc = a.np ? 100 / a.np / 2 : 1
  const dd = {
    p3: b.p3 - a.p3, c44: (b.c44 || 0) - (a.c44 || 0),
    c55: (b.c55 || 0) - (a.c55 || 0), c45: (b.c45 || 0) - (a.c45 || 0),
    ge35: b.ge35 - a.ge35, moy: b.moy - a.moy,
  }
  sens.push({ lib, a, b, dd, bp, bc })
  console.log('  ' + lib.padEnd(24) + String(a.nb).padStart(4) + ' courses')
  console.log('                              ① LE TRIO       ② LE QUATUOR      ③ LE QUINTÉ     ÉCONOMIQUE')
  console.log('    ' + ''.padEnd(24) + '3/3   ≥2/3  |  4/4   ≥3/4  |  5/5  ≥4/5  ≥3/5  moy | 4/4|3/3 5/5|3/3 ≥4/5|3/3')
  console.log('    ' + '-'.repeat(100))
  console.log('    ' + 'A  3-2-1-1-1'.padEnd(24)
    + f5(a.p3) + f5(a.ge2) + ' |' + f5(a.p4) + f5(a.ge34) + ' |'
    + f5(a.p5) + f5(a.ge4) + f5(a.ge35) + a.moy.toFixed(2).padStart(5) + ' |'
    + f5(a.c44) + f5(a.c55) + f5(a.c45))
  console.log('    ' + 'B  3-3-1-0-1'.padEnd(24)
    + f5(b.p3) + f5(b.ge2) + ' |' + f5(b.p4) + f5(b.ge34) + ' |'
    + f5(b.p5) + f5(b.ge4) + f5(b.ge35) + b.moy.toFixed(2).padStart(5) + ' |'
    + f5(b.c44) + f5(b.c55) + f5(b.c45))
  console.log('    ' + 'Δ'.padEnd(24)
    + sig(dd.p3, bp).padStart(5) + sig(dd.p3 >= 0 ? dd.p3 : -dd.p3, bp).padStart(5) + ' |'
    + '    ' + '    ' + ' |'
    + sig(dd.p5 = b.p5 - a.p5, bp).padStart(5) + '   ' + '    ' + '   ' + sig(dd.moy, 0.03).padStart(3) + ' |'
    + sig(dd.c44, bc).padStart(7) + sig(dd.c55, bc).padStart(7) + sig(dd.c45, bc).padStart(8))
  console.log('')
}

console.log('  ⭐ LE SENS DANS LES 4 PÉRIODES')
const sensLignes = [
  ['porte 3/3', (s) => s.dd.p3, (s) => s.bp],
  ['5/5 | 3/3', (s) => s.dd.c55, (s) => s.bc],
  ['≥4/5 | 3/3', (s) => s.dd.c45, (s) => s.bc],
  ['≥3/5', (s) => s.dd.ge35, (s) => s.bp],
  ['moyenne', (s) => s.dd.moy, () => 0.03],
]
for (const [lib, g, bruit] of sensLignes) {
  const p4 = sens.slice(0, 4)
  const s = p4.map((x) => sig(g(x), bruit(x)))
  console.log('     ' + lib.padEnd(12) + s.join('   ') + '   → '
    + s.filter((x) => x === '↑').length + '↑ / ' + s.filter((x) => x === '↓').length + '↓')
}
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ② LE REGRET — la valeur du 9e cheval
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LA VALEUR DU REGRET — le 9e cheval')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  Dans B, G4[1] n est pas dans le ticket : il ne peut pas sauver B.')
console.log('  Sa valeur se mesure en CONTRE-FACTUEL : B + G4[1] en 9e, ça donne quoi ?')
console.log('  Symétriquement : A + G2[3] en 9e.')
console.log('')

function regret(M, idx, T, siegeSeat, cle) {
  const avec = []
  for (const ki of idx) {
    const s2 = T[ki].siege.get(cle)
    const num = M.cands[ki][3][s2 - 1]   /* G4[1] : 1er par cote dans G4 */
    avec.push({ ki, h5: h(M.base[ki], T[ki].s, 5), h4: h(M.base[ki], T[ki].s, 4) })
  }
  return avec
}
/* version propre : on ajoute explicitement le cheval du siège demandé */
function avecNeuvieme(M, idx, T, blocIdx, rang) {
  const s5 = []; const s4 = []
  for (const ki of idx) {
    const num = M.cands[ki][blocIdx][rang]
    if (num == null || T[ki].s.has(num)) { s5.push(h(M.base[ki], T[ki].s, 5)); s4.push(h(M.base[ki], T[ki].s, 4)); continue }
    const set = new Set([...T[ki].s, num])
    s5.push(h(M.base[ki], set, 5))
    s4.push(h(M.base[ki], set, 4))
  }
  return { s5, s4 }
}

const B9 = avecNeuvieme(M347, idx347, TB347, 3, 0)   /* B + G4[1] */
const A9 = avecNeuvieme(M347, idx347, TA347, 1, 2)   /* A + G2[3] */

const base5 = idx347.map((ki) => h(M347.base[ki], TB347[ki].s, 5))
const reg4 = B9.s4.filter((v, i) => v === 4 && base5[i] < 4).length
const reg5 = B9.s5.filter((v, i) => v === 5 && base5[i] < 5).length
console.log('  B  seul (8 chevaux)        : ' + base5.filter((v) => v === 5).length + ' Quintés sur ' + idx347.length)
console.log('  B + G4[1] en 9e            : ' + B9.s5.filter((v) => v === 5).length + ' Quintés')
console.log('     ⇒ le REGRET apporte     : ' + reg5 + ' Quintés, et ' + reg4 + ' upgrades 4/5')
console.log('')
const base5A = idx347.map((ki) => h(M347.base[ki], TA347[ki].s, 5))
const alt4 = A9.s4.filter((v, i) => v === 4 && base5A[i] < 4).length
const alt5 = A9.s5.filter((v, i) => v === 5 && base5A[i] < 5).length
console.log('  A  seul (8 chevaux)        : ' + base5A.filter((v) => v === 5).length + ' Quintés')
console.log('  A + G2[3] en 9e            : ' + A9.s5.filter((v) => v === 5).length + ' Quintés')
console.log('     ⇒ le 9e siège apporte   : ' + alt5 + ' Quintés, et ' + alt4 + ' upgrades 4/5')
console.log('')
console.log('  ⭐ COMPARER : ' + alt5 + ' (le 9e siège G2[3]) contre ' + reg5 + ' (le regret G4[1])')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ③ LA VALEUR NETTE DU REMPLACEMENT
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LA VALEUR NETTE — gain de G2[3] moins perte de G4[1]')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const lignes = []
for (const ki of idx347) {
  const k = M347.base[ki]
  const a3 = h(k, TA347[ki].s, 3); const b3 = h(k, TB347[ki].s, 3)
  const a4 = h(k, TA347[ki].s, 4); const b4 = h(k, TB347[ki].s, 4)
  const a5 = h(k, TA347[ki].s, 5); const b5 = h(k, TB347[ki].s, 5)
  lignes.push({ ki, a3, b3, a4, b4, a5, b5 })
}
const gains3 = lignes.filter((x) => x.a3 < 3 && x.b3 === 3)
const pertes3 = lignes.filter((x) => x.a3 === 3 && x.b3 < 3)
const gains4 = lignes.filter((x) => x.a4 < 4 && x.b4 === 4)
const pertes4 = lignes.filter((x) => x.a4 === 4 && x.b4 < 4)
const gains5 = lignes.filter((x) => x.a5 < 5 && x.b5 === 5)
const pertes5 = lignes.filter((x) => x.a5 === 5 && x.b5 < 5)

console.log('  sur ' + lignes.length + ' courses — le remplacement vu course par course')
console.log('')
console.log('  ce que B gagne sur A :')
console.log('     podium   3/3   : ' + gains3.length + ' courses gagnées, ' + pertes3.length + ' perdues   → ' + (gains3.length - pertes3.length > 0 ? '+' : '') + (gains3.length - pertes3.length))
console.log('     quatuor  4/4   : ' + gains4.length + ' courses gagnées, ' + pertes4.length + ' perdues   → ' + (gains4.length - pertes4.length > 0 ? '+' : '') + (gains4.length - pertes4.length))
console.log('     quinté   5/5   : ' + gains5.length + ' courses gagnées, ' + pertes5.length + ' perdues   → ' + (gains5.length - pertes5.length > 0 ? '+' : '') + (gains5.length - pertes5.length))
console.log('')

/* ce que G2[3] et G4[1] ont réellement apporté comme PLACE */
function profilerSiege(M, idx, T, blocIdx, rang, cle) {
  const c = { n: 0, p: [0, 0, 0, 0, 0, 0], top3: 0, top45: 0, top5: 0 }
  for (const ki of idx) {
    const num = M.cands[ki][blocIdx][rang]
    if (num == null) continue
    c.n++
    const p = M.base[ki].arrivee.indexOf(num) + 1
    c.p[Math.min(p, 6) - 1]++
    if (p >= 1 && p <= 3) c.top3++
    if (p >= 4 && p <= 5) c.top45++
    if (p >= 1 && p <= 5) c.top5++
  }
  return c
}
const g23 = profilerSiege(M347, idx347, TA347, 1, 2)
const g41 = profilerSiege(M347, idx347, TA347, 3, 0)
console.log('  ⭐ CE QUE CHAQUE SIÈGE APPORTE COMME PLACE')
console.log('  ' + '-'.repeat(74))
console.log('  siège        pris   1er   2e   3e   4e   5e   6e+   | podium  4e+5e   Top5')
console.log('  ' + '-'.repeat(74))
for (const [lib, c] of [['G2[3]', g23], ['G4[1]', g41]]) {
  console.log('  ' + lib.padEnd(12) + String(c.n).padStart(5)
    + String(c.p[0]).padStart(6) + String(c.p[1]).padStart(5) + String(c.p[2]).padStart(5)
    + String(c.p[3]).padStart(5) + String(c.p[4]).padStart(5) + String(c.p[5]).padStart(6)
    + '   |' + (c.top3 / c.n * 100).toFixed(1).padStart(6) + '%'
    + (c.top45 / c.n * 100).toFixed(1).padStart(8) + '%'
    + (c.top5 / c.n * 100).toFixed(1).padStart(7) + '%')
}
console.log('')
console.log('  ⭐ LA FONCTION :')
console.log('     G2[3] : ' + g23.top3 + ' sur le podium, ' + g23.top45 + ' en 4e-5e  ⇒ fonction de COMPLÉTION')
console.log('     G4[1] : ' + g41.top3 + ' sur le podium, ' + g41.top45 + ' en 4e-5e  ⇒ fonction de POKERFORT')
console.log('')
const diff23 = g23.top5 / g23.n * 100 - g41.top5 / g41.n * 100
console.log('     écart de Top5 entre les deux sièges : ' + (diff23 > 0 ? '+' : '') + diff23.toFixed(1) + ' point(s)')
console.log('     écart de 4e+5e                    : '
  + ((g23.top45 / g23.n * 100 - g41.top45 / g41.n * 100) > 0 ? '+' : '')
  + (g23.top45 / g23.n * 100 - g41.top45 / g41.n * 100).toFixed(1) + ' point(s)')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ④ L ATTRIBUTION
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ QUI APPORTE LE 4e ET LE 5e DANS B')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const provB = BLOCS.map(() => ({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 }))
for (const ki of idx347) {
  const k = M347.base[ki]
  const s = TB347[ki].s
  if (h(k, s, 5) < 5) continue
  for (let p = 1; p <= 5; p++) {
    const num = k.arrivee[p - 1]
    if (num == null || !s.has(num)) continue
    const siege = TB347[ki].siege.get(num)
    const bi = BLOCS.findIndex((b) => siege && siege.startsWith(b.id))
    if (bi >= 0) provB[bi]['p' + p]++
  }
}
console.log('  bloc   1er    2e    3e    4e    5e    |  part du 4e+5e')
console.log('  ' + '-'.repeat(64))
const tot45B = provB.reduce((a, c) => a + c.p4 + c.p5, 0)
BLOCS.forEach((b, i) => {
  console.log('  ' + b.id.padEnd(6) + String(provB[i].p1).padStart(5) + String(provB[i].p2).padStart(6)
    + String(provB[i].p3).padStart(6) + String(provB[i].p4).padStart(6) + String(provB[i].p5).padStart(6)
    + '    |  ' + ((provB[i].p4 + provB[i].p5) / tot45B * 100).toFixed(1).padStart(5) + ' %'
    + (b.id === 'G4' ? '   ← REGRET, absent du ticket' : ''))
})
console.log('  ' + '-'.repeat(64))
console.log('  ' + 'total'.padEnd(6) + String(provB.reduce((a, c) => a + c.p1, 0)).padStart(5)
  + String(provB.reduce((a, c) => a + c.p2, 0)).padStart(6)
  + String(provB.reduce((a, c) => a + c.p3, 0)).padStart(6)
  + String(provB.reduce((a, c) => a + c.p4, 0)).padStart(6)
  + String(provB.reduce((a, c) => a + c.p5, 0)).padStart(6))
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ⑤ LE VERDICT
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LE VERDICT')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const p4 = sens.slice(0, 4)
const crit = [
  ['porte 3/3 ne baisse dans AUCUNE période', p4.every((s) => s.dd.p3 >= -s.bp)],
  ['5/5 | 3/3 monte dans au moins 3 périodes', p4.filter((s) => sig(s.dd.c55, s.bc) === '↑').length >= 3],
  ['≥4/5 | 3/3 ne baisse dans AUCUNE période', p4.every((s) => s.dd.c45 >= -s.bc)],
  ['le regret G4[1] vaut MOINS que le 9e siège G2[3]', reg5 < alt5],
]
for (const [lib, ok] of crit) console.log('   ' + (ok ? '✓' : '✗') + ' ' + lib)
console.log('')
const ok = crit.filter((c) => c[1]).length
console.log('  ' + ok + ' / ' + crit.length + ' critères remplis.')
console.log('')
if (ok === crit.length) {
  console.log('  ⭐ LA STRUCTURE B EST DÉFENDUE.')
  console.log('    Le siège de G4[1] peut passer en REGRET sans perdre la porte.')
  console.log('    ⚠ Il reste §11.16 : rien n est appliqué sans ton accord, et')
  console.log('      une journée réelle hors échantillon.')
} else {
  console.log('  ⭐ B N EST PAS ENCORE DEFENDUE.')
  const manque = crit.filter((c) => !c[1]).map((c) => c[0])
  manque.forEach((m) => console.log('    ✗ ' + m))
  console.log('')
  console.log('    Ce qui reste solide : le DUEL.')
  console.log('       G2[3] : Top5 ' + (g23.top5 / g23.n * 100).toFixed(1) + ' %, 4e+5e '
    + (g23.top45 / g23.n * 100).toFixed(1) + ' %')
  console.log('       G4[1] : Top5 ' + (g41.top5 / g41.n * 100).toFixed(1) + ' %, 4e+5e '
    + (g41.top45 / g41.n * 100).toFixed(1) + ' %')
  console.log('    ⇒ le SIÈGE est mieux. Reste à prouver qu on peut le')
  console.log('      prendre sans perdre la porte, dans toutes les périodes.')
}
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Le corpus 347 n a pas de presse : « G2[3] » y est le 3e rang')
console.log('    de COTE. Sur les 94 courses avec presse, le même duel donne')
console.log('    Top5 37,2 % contre 24,7 %, et 4e+5e 24,5 % contre 11,8 %.')
console.log('    Les DEUX corpus racontent la même histoire.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')