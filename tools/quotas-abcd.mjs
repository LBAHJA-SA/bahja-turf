/* ---------------------------------------------------------------
 * tools\quotas-abcd.mjs  —  ⭐ A / B / C / D — LA PLACE DE G4
 *
 *   node tools\quotas-abcd.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *   Le moteur garde 3-2-1-1-1. Ce script ne fait que MESURER
 *   quatre répartitions, pour savoir si le siège de G4 vaut
 *   davantage ailleurs. Rien n est appliqué sans accord.
 *
 * ⚠ RAPPEL §11.16 : les quotas 3-2-1-1-1 sont FERMÉS. Un essai de
 *   redistribution a déjà été REFUSÉ le 05/10 : « modifier une règle
 *   qui n'appartient pas au moteur ». Ce script est la mesure qui
 *   manquait pour trancher ce refus — pas une autorisation.
 *
 * LES QUATRE RÉPARTITIONS
 *        G1  G2  G3  G4  G5      ce que ça teste
 *   A     3   2   1   1   1      le moteur actuel (la référence)
 *   B     3   2   1   0   2      G4 supprimé, son siège va à G5
 *   C     2   3   1   1   1      un siège de G1 déplacé vers G2
 *   D     3   3   1   0   1      G4 supprimé, son siège va à G2
 *
 *   B et D ensemble isolent l'effet G4 de l'effet G2.
 *   C seul dit si G2 vaut mieux que G1 au siège marginal.
 *
 * LES DEUX EMPREINTES
 *   plate      : 3/3 · ≥2/3 · 4/4 · ≥3/4 · 5/5 · ≥4/5 · ≥3/5 · moyenne
 *   économique : parmi les 3/3,  → 4/4 | 3/3 · 5/5 | 3/3 · ≥4/5 | 3/3
 *
 * ET L ATTRIBUTION
 *   quand A trouve un 5/5 et B pas, on veut savoir de quel bloc
 *   venait le 4e et le 5e. Sinon « le chiffre a monté » ne dit rien.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')
const COUPURE = 70

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]

const VARIANTES = [
  { cle: 'A', quota: { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }, lib: 'A · actuel' },
  { cle: 'B', quota: { G1: 3, G2: 2, G3: 1, G4: 0, G5: 2 }, lib: 'B · G4 → G5' },
  { cle: 'C', quota: { G1: 2, G2: 3, G3: 1, G4: 1, G5: 1 }, lib: 'C · G1 → G2' },
  { cle: 'D', quota: { G1: 3, G2: 3, G3: 1, G4: 0, G5: 1 }, lib: 'D · G4 → G2' },
]

const corpus = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = corpus.length

const cands = corpus.map((k) => BLOCS.map((b, i) =>
  k.presse.filter((x) => { const r = k.pDe.get(x); return r >= b.min && r <= b.max })
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))

/** le ticket d'une variante + le bloc d'origine de chaque cheval */
function ticket(ki, quota) {
  const nums = []
  const blocDe = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    for (const num of cands[ki][i].slice(0, quota[BLOCS[i].id])) {
      nums.push(num)
      blocDe.set(num, BLOCS[i].id)
    }
  }
  return { nums, blocDe }
}
const T = VARIANTES.map((v) => corpus.map((k, ki) => ticket(ki, v.quota)))

function mesurer(idx, vi) {
  const portes = []
  let n3 = 0; let ge2 = 0; let plein4 = 0; let ge34 = 0
  let plein5 = 0; let ge4 = 0; let ge35 = 0
  for (const ki of idx) {
    const k = corpus[ki]
    const s = new Set(T[vi][ki].nums)
    const a = k.arrivee
    const h3 = a.slice(0, 3).filter((x) => s.has(x)).length
    const h4 = a.slice(0, 4).filter((x) => s.has(x)).length
    const h5 = a.slice(0, 5).filter((x) => s.has(x)).length
    if (h3 === 3) { n3++; portes.push({ h4, h5 }) }
    if (h3 >= 2) ge2++
    if (h4 === 4) plein4++
    if (h4 >= 3) ge34++
    if (h5 === 5) plein5++
    if (h4 === 4) ge4++
    if (h5 >= 3) ge35++
  }
  const nb = idx.length
  const np = portes.length
  return {
    nb, np, n3, n5: plein5,
    p3: n3 / nb * 100, ge2: ge2 / nb * 100,
    p4: plein4 / nb * 100, ge34: ge34 / nb * 100,
    p5: plein5 / nb * 100, ge4: ge4 / nb * 100, ge35: ge35 / nb * 100,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
    nb44: np ? portes.filter((r) => r.h4 === 4).length : 0,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    nb55: np ? portes.filter((r) => r.h5 === 5).length : 0,
    c45: np ? portes.filter((r) => r.h5 >= 4).length / np * 100 : null,
    nb45: np ? portes.filter((r) => r.h5 >= 4).length : 0,
    moy: np ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
  }
}

const idxAll = corpus.map((_, i) => i)
const idxApp = idxAll.slice(0, COUPURE)
const idxTest = idxAll.slice(COUPURE)

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ A / B / C / D — LE SIÈGE DE G4')
console.log('     ' + n + ' Quintés · ' + corpus[0].date + ' → ' + corpus[n - 1].date)
console.log('')
console.log('        G1  G2  G3  G4  G5')
for (const v of VARIANTES) {
  const q = v.quota
  console.log('   ' + v.cle.padEnd(4) + String(q.G1).padStart(4) + String(q.G2).padStart(4)
    + String(q.G3).padStart(4) + String(q.G4).padStart(4) + String(q.G5).padStart(4)
    + '     ' + v.lib + '   = ' + BLOCS.reduce((a, b) => a + q[b.id], 0) + ' chevaux')
}
console.log('')
console.log('  ⚠ laboratoire. le moteur garde 3-2-1-1-1.')
console.log('')

const NIVEAUX = [
  ['TEST — JAMAIS VU', idxTest],
  ['TOUT LE CORPUS', idxAll],
  ['APPRENTISSAGE', idxApp],
]
const f = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(6))

for (const [lib, idx] of NIVEAUX) {
  const M = VARIANTES.map((v, vi) => ({ v, vi, m: mesurer(idx, vi) }))
  const A = M[0].m
  const bruit = 100 / A.nb / 2
  const bc = A.np ? 100 / A.np / 2 : 1
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ║  ' + lib + '   (' + A.nb + ' courses)')
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                              ① LE TRIO          ② LE QUATUOR      ③ LE QUINTE')
  console.log('  variante                     3/3    ≥2/3  |  4/4    ≥3/4  |  5/5   ≥4/5   ≥3/5   moy')
  console.log('  ' + '-'.repeat(94))
  M.forEach(({ v, m }, i) => {
    console.log('  ' + v.lib.padEnd(28)
      + f(m.p3) + f(m.ge2) + '  |' + f(m.p4) + f(m.ge34) + '  |'
      + f(m.p5) + f(m.ge4) + f(m.ge35) + m.moy.toFixed(2).padStart(6))
    if (i > 0) {
      const d = (x, y, b) => (Math.abs(y - x) <= b ? '  =  ' : (y - x > 0 ? '+' : '') + (y - x).toFixed(1)).padStart(5)
      console.log('  ' + '  Δ contre A'.padEnd(28)
        + d(A.p3, m.p3, bruit) + d(A.ge2, m.ge2, bruit) + '  |'
        + d(A.p4, m.p4, bruit) + d(A.ge34, m.ge34, bruit) + '  |'
        + d(A.p5, m.p5, bruit) + d(A.ge4, m.ge4, bruit) + d(A.ge35, m.ge35, bruit)
        + (m.moy - A.moy > 0 ? '+' : '') + (m.moy - A.moy).toFixed(2).padStart(6))
    }
  })
  console.log('')
  console.log('  L EMPREINTE ÉCONOMIQUE — parmi les courses qui passent la porte')
  console.log('  ' + '  ' + 'variante'.padEnd(24) + '3/3 (courses)   4/4 | 3/3   5/5 | 3/3   ≥4/5 | 3/3   moyenne')
  console.log('  ' + '  ' + '-'.repeat(88))
  M.forEach(({ v, m }, i) => {
    console.log('  ' + v.lib.padEnd(28)
      + (m.n3 + ' / ' + m.nb).padStart(12)
      + f(m.c44) + f(m.c55) + f(m.c45) + m.moy.toFixed(2).padStart(10)
      + (i === 0 ? '' : (m.n3 - A.n3 > 0 ? '  (+' + (m.n3 - A.n3) + ' tickets)'
        : m.n3 < A.n3 ? '  (−' + (A.n3 - m.n3) + ' tickets)' : '')))
  })
  console.log('')
  if (lib === 'TEST — JAMAIS VU') {
    console.log('  ⭐ LES 5/5 GAGNÉS PAR A — de quel bloc venait le 4e et le 5e ?')
    console.log('')
    const provA = BLOCS.map(() => ({ p4: 0, p5: 0 }))
    const provM = M.map(() => BLOCS.map(() => ({ p4: 0, p5: 0 })))
    let listA = []
    for (const ki of idx) {
      const k = corpus[ki]
      const sa = new Set(T[0][ki].nums)
      const h5 = k.arrivee.slice(0, 5).filter((x) => sa.has(x)).length
      if (h5 < 5) continue
      listA.push(k.cle)
      M.forEach(({ v, vi }, mi) => {
        const t = T[vi][ki]
        const s = new Set(t.nums)
        for (let p = 1; p <= 5; p++) {
          const num = k.arrivee[p - 1]
          if (num == null) continue
          const b = t.blocDe.get(num)
          const bi = BLOCS.findIndex((x) => x.id === b)
          if (mi === 0 && bi >= 0) provA[bi][p === 4 ? 'p4' : 'p5']++
          if (mi > 0 && bi >= 0) provM[mi][bi][p === 4 ? 'p4' : 'p5']++
        }
      })
    }
    if (!listA.length) console.log('     aucun 5/5 pour A sur ce TEST')
    else {
      console.log('     A trouve ' + listA.length + ' Quintés complets : ' + listA.join(', '))
      console.log('')
      console.log('     bloc   4e place apportée   5e place apportée')
      BLOCS.forEach((b, i) => {
        console.log('     ' + b.id.padEnd(7) + String(provA[i].p4).padStart(14) + String(provA[i].p5).padStart(19))
      })
      console.log('')
      M.slice(1).forEach(({ v }, mi) => {
        console.log('     ' + v.lib + ' — les mêmes courses, d où vient la 4e / la 5e')
        BLOCS.forEach((b, i) => {
          console.log('     ' + b.id.padEnd(7) + String(provM[mi + 1][i].p4).padStart(14) + String(provM[mi + 1][i].p5).padStart(19))
        })
        console.log('')
      })
    }
    console.log('')
    console.log('     ⚠ ' + A.nb + ' courses : 1 course = ' + (100 / A.nb).toFixed(1) + ' point.')
    console.log('')
  }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE VERDICT')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const A = mesurer(idxTest, 0)
const bruitT = 100 / A.nb / 2
const bcT = A.np ? 100 / A.np / 2 : 1
console.log('  Sur le TEST (24 courses) — la porte 3/3 est le seuil economic :')
console.log('')
VARIANTES.slice(1).forEach((v, i) => {
  const m = mesurer(idxTest, i + 1)
  const porteOk = m.p3 > A.p3 + bruitT
  const c55Ok = (m.c55 == null ? 0 : m.c55) > (A.c55 == null ? 0 : A.c55) - bcT
  const porteMoins = m.p3 >= A.p3 - bruitT
  console.log('    ' + v.lib.padEnd(14)
    + '3/3 ' + f(m.p3) + ' (' + (m.p3 - A.p3 > 0 ? '+' : '') + (m.p3 - A.p3).toFixed(1) + ')'
    + '   5/5|3/3 ' + f(m.c55) + ' (' + ((m.c55 - A.c55) > 0 ? '+' : '') + (m.c55 - A.c55).toFixed(1) + ')'
    + '   ' + (porteOk ? '✓ monte' : porteMoins ? '= stable' : '✗ baisse'))
})
console.log('')
const gagnants = VARIANTES.slice(1).map((v, i) => ({ v, m: mesurer(idxTest, i + 1), i: i + 1 }))
  .filter((x) => x.m.p3 > mesurer(idxTest, 0).p3 + bruitT)
if (gagnants.length) {
  console.log('  ⭐ ' + gagnants.length + ' variante(s) font monter la porte sur le TEST :')
  gagnants.forEach((x) => console.log('     ' + x.v.lib))
} else {
  console.log('  ⭐ AUCUNE variante ne fait monter la porte 3/3 sur le TEST.')
  const A2 = mesurer(idxTest, 0)
  const best = VARIANTES.slice(1).map((v, i) => ({ v, m: mesurer(idxTest, i + 1) }))
    .sort((a, b) => b.m.p3 - a.m.p3)[0]
  console.log('     la moins mauvaise : ' + best.v.lib + '   3/3 ' + A2.p3.toFixed(1)
    + ' → ' + best.m.p3.toFixed(1) + '   (' + (best.m.n3 - A2.n3 > 0 ? '+' : '') + (best.m.n3 - A2.n3) + ' tickets)')
}
console.log('')
console.log('  ⚠ RAPPEL §11.16 : les quotas 3-2-1-1-1 sont FERMÉS depuis le 05/10.')
console.log('    Même si B, C ou D gagnait ici, il ne serait PAS appliqué sans :')
console.log('      ① la confirmation sur les 94 courses ET sur les 347')
console.log('      ② un test hors échantillon (une journée réelle)')
console.log('      ③ ton accord explicite')
console.log('')