/* ---------------------------------------------------------------
 * tools\deux-tickets.mjs  —  ⭐ P1-P2-P3-P5-P6-P9-P12-P13   contre
 *                            P1-P2-P4-P5-P6-P8-P12-P13
 *
 *   node tools\deux-tickets.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *   Le moteur garde 3-2-1-1-1. Ce script mesure deux listes de rangs,
 *   rien de plus.
 *
 * CE QUE L ON MESURE, PRÉCISÉMENT
 *   ① le PODIUM : les 8 chevaux contiennent-ils le 1er + le 2e + le 3e ?
 *      → 3/3 · ≥2/3
 *   ② le TOP 5 : combien des 5 premiers sont dans les 8 ?
 *      → 5/5 · 4/5 · 3/5 · ≥4/5 · moyenne
 *
 * ⚠ DEUX CHOSES À SAVOIR AVANT DE LIRE
 *   · les rangs sont ceux de la COTE finale (ordre du marché).
 *     Sur une course à 12 partants, P13 n'existe pas : le ticket
 *     n'a alors que 7 chevaux. C'est compté et signalé.
 *   · 346 courses, dont 260 en apprentissage et 86 en test.
 *     Une différence se juge sur le TEST, pas sur l'ensemble.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'chevaux.json')

const LISTES = [
  { nom: 'A', rangs: [1, 2, 3, 5, 6, 9, 12, 13], lib: 'P1-P2-P3-P5-P6-P9-P12-P13' },
  { nom: 'B', rangs: [1, 2, 4, 5, 6, 8, 12, 13], lib: 'P1-P2-P4-P5-P6-P8-P12-P13' },
]
const PERIODES = [
  ['P1 · 2024-09 → 2025-10', '2024-01-01', '2025-12-31'],
  ['P2 · 2026-01 → 2026-03', '2026-01-01', '2026-03-31'],
  ['P3 · 2026-04 → 2026-06', '2026-04-01', '2026-06-30'],
  ['P4 · 2026-07 → 2026-10', '2026-07-01', '2026-12-31'],
]

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .filter((k) => k.partants && k.partants.length >= 10 && (k.partants || []).some((p) => p.top5))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const cut = Math.round(n * 0.75)

/** le ticket d'une course pour une liste de rangs ; null si un rang manque */
function ticket(k, rangs) {
  const parRang = new Map()
  for (const p of k.partants) if (p.rangMarche) parRang.set(p.rangMarche, p.num)
  const nums = []
  const manquants = []
  for (const r of rangs) {
    const v = parRang.get(r)
    if (v == null) manquants.push(r)
    else nums.push(v)
  }
  return { nums, manquants }
}

function mesurer(idx, rangs) {
  const r = {
    n: idx.length, tickets: 0, partants: 0,
    p3: 0, ge2: 0,
    c5: 0, c4: 0, c3: 0, ge45: 0, s5: 0,
  }
  const manques = new Map()
  for (const ki of idx) {
    const k = base[ki]
    const t = ticket(k, rangs)
    r.tickets++
    r.partants += t.nums.length
    t.manquants.forEach((m) => manques.set(m, (manques.get(m) || 0) + 1))
    const h3 = k.arrivee.slice(0, 3).filter((x) => t.nums.includes(x)).length
    const c = k.arrivee.slice(0, 5).filter((x) => t.nums.includes(x)).length
    if (h3 === 3) r.p3++
    if (h3 >= 2) r.ge2++
    if (c === 5) r.c5++
    if (c === 4) r.c4++
    if (c === 3) r.c3++
    if (c >= 4) r.ge45++
    r.s5 += c
  }
  const t = r.n
  return {
    ...r,
    p3p: r.p3 / t * 100, ge2p: r.ge2 / t * 100,
    c5p: r.c5 / t * 100, c4p: r.c4 / t * 100, c3p: r.c3 / t * 100,
    ge45p: r.ge45 / t * 100, moy: r.s5 / t,
    taille: r.partants / t,
    manques: [...manques.entries()].sort((a, b) => b[1] - a[1]),
  }
}

const f1 = (v) => v.toFixed(1).padStart(6)
const f2 = (v) => v.toFixed(2).padStart(6)

console.log('')
console.log('  ⭐⭐ DEUX LISTES DE 8 RANGS, FACE À FACE')
console.log('     ' + n + ' Quintés · ' + base[0].date + ' → ' + base[n - 1].date)
console.log('     rangs = classement final de la COTE')
console.log('')
console.log('     A : ' + LISTES[0].lib)
console.log('     B : ' + LISTES[1].lib)
console.log('')

const NIVEAUX = [
  ['TOUT LE CORPUS', base.map((_, i) => i)],
  ['APPRENTISSAGE (75 %)', base.map((_, i) => i).slice(0, cut)],
  ['TEST — JAMAIS VU (25 %)', base.map((_, i) => i).slice(cut)],
]

const tous = []
for (const [lib, idx] of NIVEAUX) {
  console.log('  ══════════════════════════════════════════════════════════════════════════════')
  console.log('  ║  ' + lib + '   (' + idx.length + ' courses)')
  console.log('  ══════════════════════════════════════════════════════════════════════════════')
  console.log('')
  const mA = mesurer(idx, LISTES[0].rangs)
  const mB = mesurer(idx, LISTES[1].rangs)
  tous.push({ lib, mA, mB })
  console.log('                ① LE PODIUM              ② LE TOP 5')
  console.log('              3/3      ≥2/3    |  5/5    4/5    3/5   ≥4/5   moyenne   tickets')
  console.log('  ' + '-'.repeat(78))
  console.log('  ' + 'A ' + LISTES[0].lib.slice(0, 14).padEnd(14)
    + f1(mA.p3p) + f1(mA.ge2p) + '  |' + f1(mA.c5p) + f1(mA.c4p) + f1(mA.c3p)
    + f1(mA.ge45p) + f2(mA.moy) + mA.taille.toFixed(1).padStart(8))
  console.log('  ' + 'B ' + LISTES[1].lib.slice(0, 14).padEnd(14)
    + f1(mB.p3p) + f1(mB.ge2p) + '  |' + f1(mB.c5p) + f1(mB.c4p) + f1(mB.c3p)
    + f1(mB.ge45p) + f2(mB.moy) + mB.taille.toFixed(1).padStart(8))
  const d3 = mB.p3p - mA.p3p
  const d5 = mB.c5p - mA.c5p
  const dm = mB.moy - mA.moy
  const bruit = 100 / idx.length / 2
  console.log('  ' + 'Δ (B − A)'.padEnd(14)
    + ((d3 > 0 ? '+' : '') + d3.toFixed(1)).padStart(6)
    + ((mB.ge2p - mA.ge2p > 0 ? '+' : '') + (mB.ge2p - mA.ge2p).toFixed(1)).padStart(8) + '  |'
    + ((d5 > 0 ? '+' : '') + d5.toFixed(1)).padStart(6)
    + ((mB.c4p - mA.c4p > 0 ? '+' : '') + (mB.c4p - mA.c4p).toFixed(1)).padStart(7)
    + ((mB.c3p - mA.c3p > 0 ? '+' : '') + (mB.c3p - mA.c3p).toFixed(1)).padStart(7)
    + ((mB.ge45p - mA.ge45p > 0 ? '+' : '') + (mB.ge45p - mA.ge45p).toFixed(1)).padStart(7)
    + ((dm > 0 ? '+' : '') + dm.toFixed(2)).padStart(9)
    + '   (bruit ' + bruit.toFixed(1) + ')')
  console.log('')
  if (mA.manques.length || mB.manques.length) {
    console.log('     rangs manquants (course trop courte) — A : '
      + (mA.manques.length ? mA.manques.map(([r, v]) => 'P' + r + '×' + v).join(' ') : '—'))
    console.log('                                     B : '
      + (mB.manques.length ? mB.manques.map(([r, v]) => 'P' + r + '×' + v).join(' ') : '—'))
    console.log('')
  }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════════════════════')
console.log('  ║  LA RÉPONSE À LA QUESTION POSÉE')
console.log('  ══════════════════════════════════════════════════════════════════════════════')
console.log('')

const global = tous.find((x) => x.lib === 'TOUT LE CORPUS')
const test = tous.find((x) => x.lib.startsWith('TEST'))
const app = tous.find((x) => x.lib.startsWith('APPRENTISSAGE'))

const ligne = (lib, x) => {
  const s3 = x.mB.p3p - x.mA.p3p
  const s5 = x.mB.c5p - x.mA.c5p
  const sm = x.mB.moy - x.mA.moy
  const b = 100 / x.mA.n / 2
  return {
    lib,
    podium: Math.abs(s3) <= b ? 'égalité' : s3 > 0 ? 'B' : 'A',
    top5: Math.abs(s5) <= b ? 'égalité' : s5 > 0 ? 'B' : 'A',
    qualite: Math.abs(sm) <= 0.03 ? 'égalité' : sm > 0 ? 'B' : 'A',
    s3, s5, sm,
  }
}
const rep = [ligne('TOUT', global), ligne('APPRENTISSAGE', app), ligne('TEST', test)]

console.log('  niveau            3/3 : A → B        Δ      |  5/5 : A → B        Δ      |  moyenne A → B')
console.log('  ' + '-'.repeat(96))
for (const x of rep) {
  const va = x.lib === 'TOUT' ? global : x.lib === 'TEST' ? test : app
  console.log('  ' + x.lib.padEnd(17)
    + va.mA.p3p.toFixed(1).padStart(5) + ' → ' + va.mB.p3p.toFixed(1).padStart(5)
    + ((x.s3 > 0 ? '+' : '') + x.s3.toFixed(1)).padStart(8) + '   ' + x.podium.padEnd(9)
    + '|  ' + va.mA.c5p.toFixed(1).padStart(5) + ' → ' + va.mB.c5p.toFixed(1).padStart(5)
    + ((x.s5 > 0 ? '+' : '') + x.s5.toFixed(1)).padStart(8) + '   ' + x.top5.padEnd(9)
    + '|  ' + va.mA.moy.toFixed(2) + ' → ' + va.mB.moy.toFixed(2) + '   ' + x.qualite)
}
console.log('')

const g = global
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ⭐ LA RÉPONSE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ① POUR LES TROIS PREMIERS (le podium)')
const gPod = Math.abs(g.mB.p3p - g.mA.p3p) <= 100 / g.mA.n / 2 ? 'égalité' : g.mB.p3p > g.mA.p3p ? 'B' : 'A'
console.log('     A : ' + g.mA.p3p.toFixed(1) + ' %   B : ' + g.mB.p3p.toFixed(1) + ' %   →  ' + gPod)
console.log('     sur le TEST : ' + test.mA.p3p.toFixed(1) + ' % contre ' + test.mB.p3p.toFixed(1) + ' %')
console.log('')
console.log('  ② POUR LES CINQ PREMIERS (le Top 5)')
const gTop = Math.abs(g.mB.c5p - g.mA.c5p) <= 100 / g.mA.n / 2 ? 'égalité' : g.mB.c5p > g.mA.c5p ? 'B' : 'A'
console.log('     A : ' + g.mA.c5p.toFixed(1) + ' %   B : ' + g.mB.c5p.toFixed(1) + ' %   →  ' + gTop)
console.log('     sur le TEST : ' + test.mA.c5p.toFixed(1) + ' % contre ' + test.mB.c5p.toFixed(1) + ' %')
console.log('     couverture moyenne : A ' + g.mA.moy.toFixed(2) + '   B ' + g.mB.moy.toFixed(2)
  + '   →  ' + (Math.abs(g.mB.moy - g.mA.moy) <= 0.03 ? 'égalité' : g.mB.moy > g.mA.moy ? 'B' : 'A'))
console.log('')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('  ⚠ Les deux listes contiennent P1, P2, P5, P6, P12, P13.')
console.log('    Elles ne diffèrent que sur trois rangs :')
console.log('       A garde P3 · P9        B garde P4 · P8')
console.log('    Donc tout l écart vient de ces trois rangs, et rien d autre.')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('')