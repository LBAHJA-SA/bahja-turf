/* ---------------------------------------------------------------
 * tools\a-l-oeil.mjs  —  ⭐ VÉRIFIE À L ŒIL, COURSE PAR COURSE
 *
 *   node tools\a-l-oeil.mjs [nombre]
 *
 * ⚠ LABORATOIRE UNIQUEMENT. Lecture seule.
 *
 *   Aucune formule. Pour chaque course : l'arrivée, les 8 chevaux
 *   choisis par la liste A, et combien sont dans le Top 5.
 *   Vous pouvez recompter à la main, ligne par ligne.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'chevaux.json')
const NB = Number(process.argv[2] || 20)

const base = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .filter((k) => k.partants && k.partants.length >= 10 && (k.partants || []).some((p) => p.top5))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

const RANG_A = [1, 2, 3, 5, 6, 9, 12, 13]
const RANG_B = [1, 2, 4, 5, 6, 8, 12, 13]
const parRang = (k) => {
  const m = new Map()
  for (const p of k.partants) if (p.rangMarche) m.set(p.rangMarche, p)
  return m
}

console.log('')
console.log('  👁  VÉRIFICATION À L ŒIL — les ' + NB + ' premières courses')
console.log('  ' + '='.repeat(96))
console.log('')
console.log('  A = P1 P2 P3 P5 P6 P9 P12 P13      B = P1 P2 P4 P5 P6 P8 P12 P13')
console.log('  (les numéros entre parenthèses sont les RANGS de cote de chaque cheval choisi)')
console.log('')

let cA = 0; let cB = 0; let vus = 0
const detailA = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }

for (const k of base.slice(0, NB)) {
  const m = parRang(k)
  const numsA = RANG_A.map((r) => m.get(r)).filter(Boolean)
  const numsB = RANG_B.map((r) => m.get(r)).filter(Boolean)
  const top5 = k.arrivee.slice(0, 5)
  const prisA = top5.filter((x) => numsA.some((p) => p.num === x))
  const prisB = top5.filter((x) => numsB.some((p) => p.num === x))
  detailA[prisA.length]++
  if (prisA.length === 5) cA++
  if (prisB.length === 5) cB++
  vus++
  const lig = (nums) => nums.map((p) => p.num + '(' + p.rangMarche + ')').join(' ')
  console.log('  ' + k.cle)
  console.log('     arrivée Top5 : ' + top5.join('  '))
  console.log('     A : ' + lig(numsA))
  console.log('        → dans le Top5 : ' + prisA.join(' ') + '   = ' + prisA.length + '/5'
    + (prisA.length === 5 ? '   ★ 5/5' : ''))
  console.log('     B : ' + lig(numsB))
  console.log('        → dans le Top5 : ' + (prisB.join(' ') || '—') + '   = ' + prisB.length + '/5'
    + (prisB.length === 5 ? '   ★ 5/5' : ''))
  console.log('')
}

console.log('  ' + '='.repeat(96))
console.log('  sur les ' + vus + ' courses montrées :   A a ' + cA + ' × 5/5 · B a ' + cB + ' × 5/5')
console.log('')
console.log('  répartition de A :  5/5 ' + detailA[5] + '  ·  4/5 ' + detailA[4] + '  ·  3/5 ' + detailA[3]
  + '  ·  2/5 ' + detailA[2] + '  ·  1/5 ' + detailA[1] + '  ·  0/5 ' + detailA[0])
console.log('')

/* le compte exact sur tout le corpus, écrit noir sur blanc */
let tA = 0; let tB = 0; let sA = 0; let sB = 0
const dA = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }
for (const k of base) {
  const m = parRang(k)
  const numsA = RANG_A.map((r) => m.get(r)).filter(Boolean)
  const numsB = RANG_B.map((r) => m.get(r)).filter(Boolean)
  const top5 = k.arrivee.slice(0, 5)
  const a = top5.filter((x) => numsA.some((p) => p.num === x)).length
  const b = top5.filter((x) => numsB.some((p) => p.num === x)).length
  dA[a]++
  if (a === 5) tA++
  if (b === 5) tB++
  sA += a
  sB += b
}
console.log('  SUR LES ' + base.length + ' COURSES DU CORPUS :')
console.log('')
console.log('     liste A :  5/5 = ' + String(tA).padStart(3) + ' courses   = ' + (tA / base.length * 100).toFixed(1) + ' %')
console.log('     liste B :  5/5 = ' + String(tB).padStart(3) + ' courses   = ' + (tB / base.length * 100).toFixed(1) + ' %')
console.log('')
console.log('     A en détail :  5/5 ' + String(dA[5]).padStart(3) + '  ·  4/5 ' + String(dA[4]).padStart(3)
  + '  ·  3/5 ' + String(dA[3]).padStart(3) + '  ·  2/5 ' + String(dA[2]).padStart(3)
  + '  ·  1/5 ' + String(dA[1]).padStart(3) + '  ·  0/5 ' + String(dA[0]).padStart(3))
console.log('     couverture moyenne de A : ' + (sA / base.length).toFixed(2) + ' sur 5')
console.log('')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('  ⚠ Si votre 50 % vient d une AUTRE définition du 5/5, dites')
console.log('    laquelle : ≥4/5 ? un ordre imposé ? le gain en euros ?')
console.log('    Le nombre change beaucoup selon la définition.')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('')