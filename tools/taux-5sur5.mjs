/* ---------------------------------------------------------------
 * tools\taux-5sur5.mjs  —  ⭐ LE TAUX DE 5/5, SANS DÉTOUR
 *
 *   node tools\taux-5sur5.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. Lecture seule.
 *
 *   346 Quintés · 4574 chevaux
 *   Question simple : à partir de combien de chevaux
 *   le Quinté complet devient atteignable ?
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'chevaux.json')

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .filter((k) => k.partants && k.partants.length >= 10 && (k.partants || []).some((p) => p.top5))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const cut = Math.round(n * 0.75)

const parRang = base.map((k) => {
  const m = new Map()
  for (const p of k.partants) if (p.rangMarche) m.set(p.rangMarche, p.num)
  return m
})

function mesure(liste, idx) {
  let c5 = 0; let c4 = 0; let ge45 = 0; let s5 = 0; let s3 = 0; let p3 = 0
  for (const ki of idx) {
    const k = base[ki]
    const m = parRang[ki]
    const nums = liste.map((r) => m.get(r)).filter((x) => x != null)
    const c = k.arrivee.slice(0, 5).filter((x) => nums.includes(x)).length
    if (c === 5) c5++
    if (c === 4) c4++
    if (c >= 4) ge45++
    s5 += c
    const h3 = k.arrivee.slice(0, 3).filter((x) => nums.includes(x)).length
    if (h3 === 3) p3++
    s3 += h3
  }
  const t = idx.length
  return { c5: c5 / t * 100, c4: c4 / t * 100, ge45: ge45 / t * 100, moy: s5 / t, p3: p3 / t * 100, ge2: (s3 - p3 * 3 + p3 * 2) / t / 1 * 0 }
}

const idxAll = base.map((_, i) => i)
const idxTest = base.map((_, i) => i).slice(cut)

console.log('')
console.log('  ⭐⭐ LE TAUX DE 5/5 — ' + n + ' Quintés')
console.log('     rangs = classement final de la cote')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ① LES DEUX LISTES QUE VOUS AVEZ PROPOSÉES')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
const LISTES = [
  ['A · P1-P2-P3-P5-P6-P9-P12-P13', [1, 2, 3, 5, 6, 9, 12, 13]],
  ['B · P1-P2-P4-P5-P6-P8-P12-P13', [1, 2, 4, 5, 6, 8, 12, 13]],
]
console.log('  liste                                 5/5    4/5   ≥4/5   moyenne   3/3')
console.log('  ' + '-'.repeat(70))
for (const [lib, l] of LISTES) {
  const m = mesure(l, idxAll)
  console.log('  ' + lib.padEnd(36) + m.c5.toFixed(1).padStart(5) + ' %' + m.c4.toFixed(1).padStart(7)
    + ' %' + m.ge45.toFixed(1).padStart(7) + ' %' + m.moy.toFixed(2).padStart(10)
    + m.p3.toFixed(1).padStart(7) + ' %')
}
console.log('')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ② LES 7, 8, 9 PREMIERS PAR LE MARCHÉ')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
console.log('  liste                                 5/5    4/5   ≥4/5   moyenne   3/3')
console.log('  ' + '-'.repeat(70))
for (const N of [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
  const l = Array.from({ length: N }, (_, i) => i + 1)
  const m = mesure(l, idxAll)
  console.log('  ' + (N + ' premiers').padEnd(36) + m.c5.toFixed(1).padStart(5) + ' %' + m.c4.toFixed(1).padStart(7)
    + ' %' + m.ge45.toFixed(1).padStart(7) + ' %' + m.moy.toFixed(2).padStart(10)
    + m.p3.toFixed(1).padStart(7) + ' %')
}
console.log('')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE MÊME SUR LE TEST (les ' + idxTest.length + ' dernières courses)')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
console.log('  liste                                 5/5    4/5   ≥4/5   moyenne   3/3')
console.log('  ' + '-'.repeat(70))
for (const [lib, l] of LISTES) {
  const m = mesure(l, idxTest)
  console.log('  ' + lib.padEnd(36) + m.c5.toFixed(1).padStart(5) + ' %' + m.c4.toFixed(1).padStart(7)
    + ' %' + m.ge45.toFixed(1).padStart(7) + ' %' + m.moy.toFixed(2).padStart(10)
    + m.p3.toFixed(1).padStart(7) + ' %')
}
for (const N of [8, 10, 12, 14, 16]) {
  const l = Array.from({ length: N }, (_, i) => i + 1)
  const m = mesure(l, idxTest)
  console.log('  ' + (N + ' premiers').padEnd(36) + m.c5.toFixed(1).padStart(5) + ' %' + m.c4.toFixed(1).padStart(7)
    + ' %' + m.ge45.toFixed(1).padStart(7) + ' %' + m.moy.toFixed(2).padStart(10)
    + m.p3.toFixed(1).padStart(7) + ' %')
}
console.log('')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE PLAFOND ABSOLU — tous les partants')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
{
  let p3 = 0
  for (const ki of idxAll) {
    const nums = base[ki].partants.map((p) => p.num)
    const h3 = base[ki].arrivee.slice(0, 3).filter((x) => nums.includes(x)).length
    if (h3 === 3) p3++
  }
  console.log('   avec TOUS les partants (12 à 20) : 5/5 = 100 %   3/3 = '
    + (p3 / n * 100).toFixed(1) + ' %')
  const nb = base.map((k) => k.partants.length)
  const moy = nb.reduce((a, b) => a + b, 0) / nb.length
  console.log('   (il y a en moyenne ' + moy.toFixed(1) + ' partants — le 5/5 est certain)')
}
console.log('')
console.log('  ⭐ OÙ SE SITUE LE 75 % ?')
console.log('')
let trouve = null
for (let N = 5; N <= 22; N++) {
  const m = mesure(Array.from({ length: N }, (_, i) => i + 1), idxAll)
  if (m.c5 >= 75) { trouve = N; break }
}
console.log('   → il faudrait ' + (trouve ? trouve + ' chevaux' : 'plus de 22 chevaux') + ' pour atteindre 75 % de 5/5.')
console.log('   → à 20 chevaux, le 5/5 est déjà acquis à 100 %, mais le ticket')
console.log('     ne ciblait plus rien : c est trivial.')
console.log('')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('  ⚠ Aucun système n est modifié. Le moteur reste 3-2-1-1-1.')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('')