/* ---------------------------------------------------------------
 * tools\mesure-lab.mjs  —  ⭐ LE LABORATOIRE (rien ne change officiellement)
 *
 *   node tools\mesure-lab.mjs
 *
 * Deux tests, sur le même corpus (94 Quintés avec presse + partants) :
 *
 *   TEST 1 — les TROIS premiers ensemble
 *   TEST 2 — les CINQ premiers ensemble  (le Quinté)
 *
 * Et dans les deux, la question centrale :
 *
 *      ⭐ « Le siège réservé à G5 est-il mieux placé dans G2 ? »
 *        3-2-1-1-1   contre   3-3-1-1-0
 *
 * ⚠ Ce fichier ne change RIEN. C'est une mesure. Le moteur garde
 * `3-2-1-1-1` (§11.16 : les quotas ne bougent pas). Ces chiffres sont
 * destinés à décider, pas à être appliqués tout seuls.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x) }

const BLOCS = [
  { id: 'G1', min: 1, max: 4 },
  { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const blocDe = (p) => (BLOCS.find((b) => p >= b.min && p <= b.max) || BLOCS[4]).id

const brut = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  const presse = (k.presse || []).filter((x) => k.arrivee.includes(x))
  const nums = presse.concat(k.arrivee.filter((x) => !presse.includes(x)))
  if (nums.length < 10) continue
  const pDe = new Map(nums.map((x, i) => [x, i + 1]))
  const avecC = Object.keys(k.cotes || {}).map(Number).filter((x) => k.cotes[x] > 0)
  if (avecC.length < 8) continue
  base.push({ ...k, nums, pDe, cotes: k.cotes })
}
const n = base.length
const blocsDe = (k) => BLOCS.map((b) => k.nums.filter((num) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max }))
const remplirCote = (k, bloc) => bloc.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999))
const remplirPresse = (k, bloc) => bloc.slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b))
const parQuota = (q, mode) => (k) => blocsDe(k).flatMap((bloc, i) => (mode === 'cote' ? remplirCote(k, bloc) : remplirPresse(k, bloc)).slice(0, q[i]))
const plat8 = (k) => k.nums.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)).slice(0, 8)

const REPARTITIONS = [
  ['top-8 (à plat)', null],
  ['3-2-1-1-1', [3, 2, 1, 1, 1]],
  ['3-3-1-1-0', [3, 3, 1, 1, 0]],
  ['3-3-1-0-0', [3, 3, 1, 0, 0]],
  ['3-4-1-1-0', [3, 4, 1, 1, 0]],
  ['4-2-1-1-1', [4, 2, 1, 1, 1]],
  ['2-2-1-1-1', [2, 2, 1, 1, 1]],
  ['3-2-2-1-0', [3, 2, 2, 1, 0]],
]
const ticketDe = (nom, k, mode) => {
  const r = REPARTITIONS.find((x) => x[0] === nom)
  return r[1] ? parQuota(r[1], mode)(k) : plat8(k)
}
const pct = (v, t) => (t ? (v / t * 100).toFixed(1).padStart(5) + ' %' : '    —')

/* ============================================================== TEST 1 ===== */
console.log('')
console.log(`  ⭐⭐⭐ TEST 1 — LES 3 PREMIERS ENSEMBLE — ${n} Quintés`)
console.log('')
const T3 = ['1er', '2e ', '3e ']
console.log('  répartition       remplissage   ' + T3.map((x) => String(x).padStart(7)).join('') + '    ≥2/3     ≥1/3')
console.log('  ' + '-'.repeat(76))
const t1 = []
for (const [nom] of REPARTITIONS) {
  for (const mode of (nom.startsWith('top-8') ? ['cote'] : ['cote', 'presse'])) {
    const t = base.map((k) => {
      const tk = ticketDe(nom, k, mode)
      return k.arrivee.slice(0, 3).filter((x) => tk.includes(x)).length
    })
    const rep = [0, 0, 0, 0]
    t.forEach((v) => rep[v]++)
    const ge2 = (t.filter((v) => v >= 2).length / n * 100).toFixed(1) + ' %'
    const ge1 = (t.filter((v) => v >= 1).length / n * 100).toFixed(1) + ' %'
    t1.push({ nom, mode, t, rep })
    console.log('  ' + nom.padEnd(17) + mode.padEnd(14) + rep.slice().reverse().map((v) => pct(v, n)).join('') + '  ' + ge2.padStart(7) + ge1.padStart(9))
  }
}

/* ============================================================== TEST 2 ===== */
console.log('')
console.log(`  ⭐⭐⭐ TEST 2 — LE QUINTÉ (les 5 premiers) — ${n} Quintés`)
console.log('')
console.log('  répartition       remplissage   combi   0/5   1/5   2/5   3/5   4/5   5/5   ≥3/5  ≥4/5   5/5')
console.log('  ' + '-'.repeat(96))
const t2 = []
for (const [nom] of REPARTITIONS) {
  for (const mode of (nom.startsWith('top-8') ? ['cote'] : ['cote', 'presse'])) {
    const t = base.map((k) => {
      const tk = ticketDe(nom, k, mode)
      return { n: tk.length, hits: k.arrivee.slice(0, 5).filter((x) => tk.includes(x)).length }
    })
    const rep = [0, 0, 0, 0, 0, 0]
    t.forEach((v) => rep[v.hits]++)
    const nMoy = t.reduce((a, b) => a + b.n, 0) / n
    const combi = Math.round(t.reduce((a, b) => a + C(b.n, 5), 0) / n)
    t2.push({ nom, mode, t, rep, combi })
    console.log('  ' + nom.padEnd(17) + mode.padEnd(14)
      + String(combi >= 1000 ? (combi / 1000).toFixed(1) + 'k' : combi).padStart(6)
      + rep.map((v) => pct(v, n)).join('')
      + (t.filter((v) => v.hits >= 3).length / n * 100).toFixed(0).padStart(6) + ' %'
      + (t.filter((v) => v.hits >= 4).length / n * 100).toFixed(0).padStart(6) + ' %'
      + (t.filter((v) => v.hits >= 5).length / n * 100).toFixed(0).padStart(5) + ' %')
  }
}

/* ================== LA QUESTION : le siège de G5 vaut-il mieux en G2 ? === */
console.log('')
console.log('  ⭐⭐⭐ LE SIÈGE DE G5 : est-il mieux dépensé dans G2 ?')
console.log('')
const A = t2.filter((x) => x.nom === '3-2-1-1-1')
const B = t2.filter((x) => x.nom === '3-3-1-1-0')
const A3 = t1.filter((x) => x.nom === '3-2-1-1-1')
const B3 = t1.filter((x) => x.nom === '3-3-1-1-0')
/** `key` peut être 'hits' (moyenne brute) ou une fonction de calcul. */
const get = (x, key) => (key === 'hits'
  ? x.t.reduce((s, y) => s + (typeof y === 'object' ? y.hits : y), 0) / n
  : typeof key === 'function' ? key(x) : x[key])
const comparer = (lbl, key, a0 = A[0], b0 = B[0]) => {
  const va = get(a0, key)
  const vb = get(b0, key)
  const ga = a0 === A[0] ? '3-2-1-1-1' : '3-2-1-1-1'
  const gb = '3-3-1-1-0'
  const ecart = vb - va
  const winner = ecart > 0 ? gb : (ecart < 0 ? ga : 'égalité')
  const f = (x) => (typeof x !== 'number' ? '--' : key === 'hits' ? x.toFixed(3) : x.toFixed(1) + ' %')
  console.log('  ' + lbl.padEnd(20) + f(va).padStart(10) + f(vb).padStart(12) + '   ' + (ecart > 0 ? '+' : '') + f(ecart).padStart(9) + '   →  ' + winner)
}
console.log('  ' + 'mesure'.padEnd(20) + '3-2-1-1-1'.padStart(10) + '3-3-1-1-0'.padStart(12) + '   écart'.padStart(9) + '   gagnant')
console.log('  ' + '-'.repeat(76))
comparer('5/5 (exactement)', (x) => x.t.filter((v) => v.hits === 5).length / n * 100)
comparer('≥4/5', (x) => x.t.filter((v) => v.hits >= 4).length / n * 100)
comparer('≥3/5', (x) => x.t.filter((v) => v.hits >= 3).length / n * 100)
comparer('arrivants moyen', 'hits')
console.log('')

/* --------- et la même question sur le PODIUM (test 1) --------- */
console.log('  et sur le PODIUM (test 1) :')
console.log('')
console.log('  ' + 'mesure'.padEnd(20) + '3-2-1-1-1'.padStart(10) + '3-3-1-1-0'.padStart(12) + '   écart'.padStart(9) + '   gagnant')
comparer('3/3 (exactement)', (x) => x.t.filter((v) => v === 3).length / n * 100, A3[0], B3[0])
comparer('≥2/3', (x) => x.t.filter((v) => v >= 2).length / n * 100, A3[0], B3[0])
console.log('')

/* ====================== LA CONTRIBUTION RÉELLE, bloc par bloc ============ */
console.log('  ⭐⭐⭐ G5 : à quoi sert réellement son cheval ?')
console.log('')
const g5 = base.map((k) => {
  const tk = new Set(ticketDe('3-2-1-1-1', k, 'cote'))
  const numsG5 = new Set(blocsDe(k)[4])
  const pod5 = k.arrivee.slice(0, 5)
  const podG5 = pod5.filter((x) => numsG5.has(x))
  const prisG5 = [...tk].filter((x) => numsG5.has(x))
  return {
    g5Podium: podG5.filter((x) => tk.has(x)).length,      // G5 attrapé sur le podium
    g5Quinte: podG5.filter((x) => tk.has(x)).length,
    g5TotalPodium: podG5.length,
    g5TotalQuinte: pod5.filter((x) => numsG5.has(x)).length,
    prisG5,
    pod5,
    tk,
  }
})
const s = {
  attrape: g5.reduce((a, x) => a + x.g5Podium, 0),
  possiblePodium: g5.reduce((a, x) => a + x.g5TotalPodium, 0),
  attrapeQuinte: g5.reduce((a, x) => a + x.g5TotalQuinte > 0 && x.g5Podium > 0 ? x.g5Podium : 0, 0),
  possibleQuinte: g5.reduce((a, x) => a + x.g5TotalQuinte, 0),
}
console.log(`  G5 présent dans le PODIUM : ${s.possiblePodium} fois sur ${n} courses`)
console.log(`  G5 attrapé sur le podium   : ${s.attrape} fois  =  ${(s.attrape / s.possiblePodium * 100).toFixed(0)} %`)
console.log('')
console.log(`  G5 présent dans les 5     : ${s.possibleQuinte} fois`)
console.log(`  G5 attrapé dans les 5      : ${s.attrapeQuinte} fois  =  ${(s.attrapeQuinte / s.possibleQuinte * 100).toFixed(0)} %`)
console.log('')
const gaspilles = g5.reduce((a, x) => a + x.prisG5.filter((z) => !x.pod5.includes(z)).length, 0)
const prisTotal = g5.reduce((a, x) => a + x.prisG5.length, 0)
console.log(`  le cheval de G5 choisi a été... utile ${s.attrapeQuinte} fois, inutile ${gaspilles} fois  (sur ${prisTotal} choix)`)
console.log('')
const ouPerdu = g5.reduce((a, x) => a + Math.max(0, x.g5TotalQuinte - x.g5Podium), 0)
console.log(`  ⭐ quand G5 avait un gagnant et qu'on l'a raté : ${ouPerdu} fois  =  ${(ouPerdu / n * 100).toFixed(0)} % des courses`)
console.log('')
console.log('  ⚠ RAPPEL : ces chiffres ne changent AUCUNE règle. Le moteur reste en 3-2-1-1-1.')
console.log('')
