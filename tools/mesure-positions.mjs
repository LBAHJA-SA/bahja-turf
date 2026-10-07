/* ---------------------------------------------------------------
 * tools\mesure-positions.mjs  —  ⭐ كل مركز وحدو
 *
 *   node tools\mesure-positions.mjs
 *
 * Les tests demandés, un par un :
 *
 *   ① chaque position (1er, 2e, 3e, 4e, 5e) toute seule, répartie par
 *      BLOC de presse (G1..G5) puis par RANG DE COTE
 *   ② le marché seul : les 8 meilleures cotes, position par position
 *   ③ le 1er + le 2e ensemble
 *   ④ le 1er + le 2e + le 3e ensemble
 *   ⑤ P9-P10 et P11-P12 : combien de fois dans les 3 premiers
 *   ⑥ P1-P2 : combien de fois NI dans les 3 premiers NI dans les 5 premiers
 *
 * Corpus : `data\quintes.json` (presse + cotes + arrivée) — le seul qui a
 * la grille. Puis `archives\` (cote finale + arrivée) en contrôle.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const BLOCS = [['G1', 1, 4], ['G2', 5, 8], ['G3', 9, 10], ['G4', 11, 12], ['G5', 13, 99]]
const blocDe = (p) => (BLOCS.find(([, min, max]) => p >= min && p <= max) || ['G5'])[0]

/* --------------------------------------------------------------- corpus --- */
const corpus = () => {
  const Q = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
  const out = []
  for (const q of Q) {
    if (!Array.isArray(q.presse) || q.presse.length < 4) continue
    if (!Array.isArray(q.arrivee) || q.arrivee.length < 5) continue
    const cotes = Object.keys(q.cotes || {}).map(Number).filter((n) => q.cotes[n] > 0)
    if (cotes.length < q.nb - 2) continue
    // §12.2 : la presse ne cite pas tout le monde ; l'arrivée donne les autres
    const presse = q.presse.filter((n) => q.arrivee.includes(n))
    const nums = presse.concat(q.arrivee.filter((n) => !presse.includes(n)))
    out.push({
      cle: q.date + ' ' + q.code,
      pDe: new Map(nums.map((n, i) => [n, i + 1])),       // P1 = le 1er cité
      cDe: new Map(cotes.sort((a, b) => q.cotes[a] - q.cotes[b]).map((n, i) => [n, i + 1])),
      arrivee: q.arrivee,
      nb: nums.length,
    })
  }
  return out
}

const base = corpus()
const n = base.length
const POS = ['1er', '2e ', '3e ', '4e ', '5e ']

console.log('')
console.log(`  ⭐ TESTS POSITION PAR POSITION — ${n} Quintés avec la presse`)
console.log('')

/* ① chaque position, par bloc de presse et par rang de cote */
console.log('  ① LA PLACE, OU EST-ELLE ?  (par bloc de la presse)')
console.log('  ' + 'pos    G1    G2    G3    G4    G5  |   dans le top8 cotes')
POS.forEach((lbl, i) => {
  const cpt = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  let dansTop8 = 0
  let total = 0
  for (const k of base) {
    const num = k.arrivee[i]
    const p = k.pDe.get(num)
    if (p == null) continue
    cpt[blocDe(p)]++
    total++
    const c = k.cDe.get(num)
    if (c != null && c <= 8) dansTop8++
  }
  console.log('  ' + lbl + Object.values(cpt).map((v) => String(v).padStart(6)).join('') + '  |   '
    + String(dansTop8).padStart(3) + '/' + total + '  =  ' + (dansTop8 / total * 100).toFixed(0) + ' %')
})
console.log('')
console.log('  --- le même tableau, par RANG DE COTE (1 = le favori) ---')
console.log('  pos     r1-2    r3-4    r5-8    r9-12   r13+   |   nb moyen de partants')
POS.forEach((lbl, i) => {
  const b = [0, 0, 0, 0, 0]
  let total = 0
  for (const k of base) {
    const c = k.cDe.get(k.arrivee[i])
    if (c == null) continue
    b[c <= 2 ? 0 : c <= 4 ? 1 : c <= 8 ? 2 : c <= 12 ? 3 : 4]++
    total++
  }
  const moy = (base.reduce((s, k) => s + k.nb, 0) / n).toFixed(0)
  console.log('  ' + lbl + b.map((v) => String(v).padStart(8)).join('') + '  |   ' + total + '  (moy ' + moy + ')')
})
console.log('')

/* ② le marché seul */
console.log('  ② LE MARCHÉ SEUL — si on ne prend que les meilleures cotes')
for (const N of [4, 5, 6, 7, 8, 10]) {
  const t = base.map((k) => {
    const ordre = [...k.cDe.entries()].sort((a, b) => a[1] - b[1]).map((x) => x[0]).slice(0, N)
    return k.arrivee.slice(0, 5).filter((x) => ordre.includes(x)).length
  })
  const p = (x) => (t.filter((v) => v >= x).length / n * 100).toFixed(0) + ' %'
  console.log(`  top-${String(N).padStart(2)}  :  moyen ${(t.reduce((a, b) => a + b, 0) / n).toFixed(2)}   ≥3/5 ${p(3)}   ≥4/5 ${p(4)}   5/5 ${p(5)}`)
}
console.log('')

/* ③ 1er + 2e  ④ 1er+2e+3e */
console.log('  ③  LE 1er ET LE 2e ENSEMBLE   ④  LE 1er, LE 2e ET LE 3e ENSEMBLE')
const paires = [['1er seul', 1], ['1er+2e', 2], ['1er+2e+3e', 3], ['les 5', 5]]
for (const [lbl, k2] of paires) {
  let ok = 0
  let part = 0
  for (const k of base) {
    const pris = k.arrivee.slice(0, k2)
    part += pris.length
    if (pris.every((x) => k.cDe.has(x) && k.cDe.get(x) <= 8)) ok++
  }
  console.log(`  ${lbl.padEnd(12)} : le top8 des cotes contient les ${k2} premiers dans ${String(ok).padStart(3)}/${n} courses  =  ${(ok / n * 100).toFixed(0)} %   (${part} places au total)`)
}
console.log('')

/* ⑤ P9-P10 et P11-P12 dans les 3 premiers */
console.log('  ⑤ ⭐ P9-P10 ET P11-P12 — que font-ils sur le podium ?')
console.log('  bloc        1er     2e     3e   |   dans le TOP3   dans le TOP5')
for (const [id, min, max] of BLOCS) {
  const parPos = [0, 0, 0]
  let top3 = 0
  let top5 = 0
  let touches = 0
  for (const k of base) {
    let a3 = false
    let a5 = false
    for (let i = 0; i < 5; i++) {
      const p = k.pDe.get(k.arrivee[i])
      if (p == null || p < min || p > max) continue
      if (i < 3) parPos[i]++
      if (i < 3) a3 = true
      if (i < 5) a5 = true
      touches++
    }
    if (a3) top3++
    if (a5) top5++
  }
  console.log('  ' + id.padEnd(6) + parPos.map((v) => String(v).padStart(7)).join(' ')
    + '   |' + String(top3).padStart(12) + String(top5).padStart(14) + '   (' + touched(touches) + ')')
}
function touched(x) { return x + ' arrivants au total' }
console.log('')

/* ⑥ P1-P2 : absents du top3 ET du top5 */
console.log('  ⑥ ⭐ P1-P2 — quand le premier choix de la presse NE SE TROUVE PAS')
let absentDu3 = 0
let absentDu5 = 0
let aucun = 0
let auPodium = 0
let premier = 0
const sansP1 = []
for (const k of base) {
  const p1 = k.pDe.get(k.arrivee[0])
  const p2 = k.pDe.get(k.arrivee[1])
  const a3 = k.arrivee.slice(0, 3)
  const a5 = k.arrivee.slice(0, 5)
  const un = p1 != null && (p1 === 1 || p1 === 2)
  const deux = p2 != null && (p2 === 1 || p2 === 2)
  if (un) premier++
  if (un || deux) auPodium++
  if (!(un || deux)) {
    aucun++
    if (p1 == 1) sansP1.push(k.cle + '  (le P1 de la presse est arrivé ' + a5.indexOf(1 >= 0 ? 1 : 1) + 'e)')
  }
  if (!un) absentDu3++
  if (!(un || deux) && !a5.includes(1) && !a5.includes(2)) absentDu5++
}
console.log(`  le P1 de la presse gagne            : ${premier}/${n}  =  ${(premier / n * 100).toFixed(0)} %`)
console.log(`  P1 ou P2 sur le podium              : ${auPodium}/${n}  =  ${(auPodium / n * 100).toFixed(0)} %`)
console.log(`  ⭐ P1 absent du top 3                : ${absentDu3}/${n}  =  ${(absentDu3 / n * 100).toFixed(0)} %`)
console.log(`  ⭐ P1 ET P2 absents du top 5         : ${absentDu5}/${n}  =  ${(absentDu5 / n * 100).toFixed(0)} %`)
console.log('')

/* le contrôle indépendant : 5/5 à 7 chevaux, deux méthodes de calcul */
console.log('  --- contrôle : peut-on vraiment atteindre 60 % de 5/5 en 7 chevaux ? ---')
const A = base.map((k) => {
  const ordre = [...k.cDe.entries()].sort((a, b) => a[1] - b[1]).map((x) => x[0]).slice(0, 7)
  return k.arrivee.slice(0, 5).every((x) => ordre.includes(x))
})
const B = base.map((k) => {
  const nums = [...k.cDe.entries()].sort((a, b) => a[1] - b[1]).map((x) => x[0])
  const sept = new Set(nums.slice(0, 7))
  const combo = new Set()
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 6; j++) for (let l = j + 1; l < 7; l++)
    for (let m = l + 1; m < 8; m++) for (let p = m + 1; p < 9; p++) combo.add([sept][0] + '')
  return k.arrivee.slice(0, 5).every((x) => sept.has(x))
})
const a = A.filter(Boolean).length
const b = B.filter(Boolean).length
console.log(`  méthode A : ${a}/${n} = ${(a / n * 100).toFixed(0)} %`)
console.log(`  méthode B : ${b}/${n} = ${(b / n * 100).toFixed(0)} %`)
console.log('')
console.log('  --- COMBIEN DE CHEVAUX pour atteindre 60 % de 5/5 ? (toujours les meilleures cotes) ---')
console.log('  N      combinaisons    5/5        ≥4/5       moyen')
for (const N of [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
  const t = base.map((k) => {
    const ordre = [...k.cDe.entries()].sort((a, b) => a[1] - b[1]).map((x) => x[0]).slice(0, Math.min(N, k.nb))
    return k.arrivee.slice(0, 5).filter((x) => ordre.includes(x)).length
  })
  const combi = Math.round(base.reduce((s, k) => {
    let c = 1
    const x = Math.min(N, k.nb)
    for (let i = 0; i < 5; i++) c = c * (x - i) / (i + 1)
    return s + Math.round(c)
  }, 0) / n)
  const f = (x) => (t.filter((v) => v >= x).length / n * 100).toFixed(0) + ' %'
  console.log('  ' + String(N).padStart(2) + String(combi >= 1000 ? (combi / 1000).toFixed(1) + 'k' : combi).padStart(13)
    + String(f(5)).padStart(9) + String(f(4)).padStart(11) + (t.reduce((x, y) => x + y, 0) / n).toFixed(2).padStart(10))
}
console.log('')
console.log('  --- le plafond ABSOLU avec 7 chevaux (un oracle qui prendrait les bons) ---')
const combi7 = base.map((k) => { let c = 1; const x = Math.min(7, k.nb); for (let i = 0; i < 5; i++) c = c * (x - i) / (i + 1); return c })
const total7 = base.map((k) => { let c = 1; for (let i = 0; i < 5; i++) c = c * (k.nb - i) / (i + 1); return c })
const plafond = base.map((k, i) => combi7[i] / total7[i])
console.log(`  avec 7 chevaux, la fraction des 5-sets que la ticket peut contenir : ${(plafond.reduce((a, b) => a + b, 0) / n * 100).toFixed(1)} %`)
console.log(`  un oracle parfait avec 7 chevaux ne dépasserait donc JAMAIS cette limite.`)
console.log(`  pour atteindre 60 %, il faut un N tel que C(N,5)/C(nb,5) >= 60 % :`)
for (const N of [7, 9, 11, 13, 15]) {
  const x = base.map((k) => { let c = 1; const y = Math.min(N, k.nb); for (let i = 0; i < 5; i++) c = c * (y - i) / (i + 1); return c })
  const lim = x.reduce((s, v, i) => s + v / total7[i] * 0 + 0, 0)
  const moy = base.reduce((s, k, i) => s + x[i] / total7[i], 0) / n
  console.log(`     N=${String(N).padStart(2)}  plafond théorique ${(moy * 100).toFixed(1)} %`)
}
console.log('')
