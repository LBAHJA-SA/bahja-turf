/* ---------------------------------------------------------------
 * tools\labo-3211-vs-3310.mjs  —  ⭐⭐ LABORATOIRE — NE CHANGE RIEN
 *
 *   node tools\labo-3211-vs-3310.mjs
 *
 *   ⚠ CE FICHIER NE MODIFIE AUCUN SYSTÈME. Il lit, il compare, il sort.
 *     Les quotas officiels restent 3-2-1-1-1 (§11.16). Rien ici n'est
 *     appliqué au moteur, à la page ou à l'archive.
 *
 * LA QUESTION : le siège réservé à G5 est-il mieux employé en G2 ?
 *
 *      3-2-1-1-1  ·  3-3-1-1-0
 *
 * C'est une expérience appariée PARFAITE : **le même nombre de chevaux (8)**,
 * **le même coût (56 combinaisons)**, **une seule variable qui bouge**.
 * On ajoute un cheval en G2, on en retire un de G5. Rien d'autre.
 *
 * DEUX TESTS, comme demandé :
 *   TEST 1 — les 3 premiers ensemble (le podium)
 *   TEST 2 — les 5 premiers ensemble (le Quinté)
 *
 * Et parce qu'un écart sur 94 courses peut être du bruit : comparaison
 * APPARIÉE course par course. Si le « gagne / perd » est 50/50, c'est du bruit.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 99 },
]
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x) }

const brut = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  const presse = (k.presse || []).filter((x) => k.arrivee.includes(x))
  const nums = presse.concat(k.arrivee.filter((x) => !presse.includes(x)))
  if (nums.length < 10) continue
  const avecC = Object.keys(k.cotes || {}).map(Number).filter((x) => k.cotes[x] > 0)
  if (avecC.length < 8) continue
  base.push({ ...k, nums, pDe: new Map(nums.map((x, i) => [x, i + 1])), cotes: k.cotes, arrivee: k.arrivee })
}
const n = base.length

const blocsDe = (k) => BLOCS.map((b) => k.nums.filter((num) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max }))
const remplir = {
  cote: (k, bloc) => bloc.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)),
  presse: (k, bloc) => bloc.slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b)),
}
const parQuota = (q, mode) => (k) => blocsDe(k).flatMap((bloc, i) => remplir[mode](k, bloc).slice(0, q[i]))

const A = { nom: '3-2-1-1-1', q: [3, 2, 1, 1, 1], cle: 'A' }
const B = { nom: '3-3-1-1-0', q: [3, 3, 1, 1, 0], cle: 'B' }
const VARIANTES = [A, B]

const pct = (v) => (v / n * 100).toFixed(1).padStart(6) + ' %'

console.log('')
console.log(`  ⭐⭐⭐ LABORATOIRE — aucune modification du système`)
console.log(`     Les quotas officiels restent 3-2-1-1-1. Ici on ne fait que lire.`)
console.log('')
console.log(`  ⭐ LA QUESTION : le siège de G5 vaut-il mieux en G2 ?`)
console.log('')
console.log('      3-2-1-1-1  =  3 (G1) · 2 (G2) · 1 (G3) · 1 (G4) · 1 (G5)')
console.log('      3-3-1-1-0  =  3 (G1) · 3 (G2) · 1 (G3) · 1 (G4) · 0 (G5)      ← on bouge G5 → G2')
console.log('')
console.log(`  même nombre de chevaux : 8 = 8   ·   même coût : ${C(8, 5)} combinaisons = ${C(8, 5)}`)
console.log(`  ${n} Quintés, deux remplissages testés`)
console.log('')

/* ══════════════════════════ TEST 1 — LE PODIUM (3 premiers) ═════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  TEST 1 — LES 3 PREMIERS ENSEMBLE                             ║')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
for (const mode of ['cote', 'presse']) {
  console.log(`  --- rempli par ${mode.toUpperCase()} ---`)
  console.log('  répartition     3/3      2/3      1/3      0/3   |   ≥2/3     ≥1/3   attrapé')
  console.log('  ' + '-'.repeat(76))
  const res = {}
  for (const v of VARIANTES) {
    const t = base.map((k) => {
      const tk = parQuota(v.q, mode)(k)
      return { n: tk.length, hits: k.arrivee.slice(0, 3).filter((x) => tk.includes(x)).length }
    })
    res[v.cle] = t
    const rep = [0, 0, 0, 0]
    t.forEach((x) => rep[x.hits]++)
    console.log('  ' + v.nom.padEnd(14) + pct(rep[3]) + pct(rep[2]) + pct(rep[1]) + pct(rep[0])
      + '  |  ' + (t.filter((x) => x.hits >= 2).length / n * 100).toFixed(1).padStart(5) + ' %'
      + (t.filter((x) => x.hits >= 1).length / n * 100).toFixed(1).padStart(9) + ' %'
      + (t.reduce((s, x) => s + x.hits, 0) / (n * 3) * 100).toFixed(1).padStart(9) + ' %')
  }
  // apparié
  let gagne = 0
  let perd = 0
  let egal = 0
  for (let i = 0; i < n; i++) {
    const d = res.A[i].hits - res.B[i].hits
    if (d > 0) gagne++
    else if (d < 0) perd++
    else egal++
  }
  console.log('  ' + '-'.repeat(76))
  console.log('  ⭐ APARIÉ : 3-2-1-1-1 gagne sur ' + gagne + ' courses · 3-3-1-1-0 gagne sur ' + perd + ' · égalité ' + egal)
  const net = gagne - perd
  const bruit = Math.round(Math.sqrt(gagne + perd))
  console.log('     écart net = ' + (net > 0 ? '+' : '') + net + '  ·  le bruit attendu est de ±' + bruit + '  =>  '
    + (Math.abs(net) <= bruit ? '⚠ PAS DE DIFFÉRENCE (c est du bruit)' : 'différence au-dessus du bruit'))
  console.log('')
}

/* ══════════════════════════ TEST 2 — LE QUINTÉ (5 premiers) ════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  TEST 2 — LES 5 PREMIERS ENSEMBLE                             ║')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
for (const mode of ['cote', 'presse']) {
  console.log(`  --- rempli par ${mode.toUpperCase()} ---`)
  console.log('  répartition     5/5      4/5      3/5      2/5      1/5      0/5   |   ≥3/5     ≥4/5     moyen')
  console.log('  ' + '-'.repeat(100))
  const res = {}
  for (const v of VARIANTES) {
    const t = base.map((k) => {
      const tk = parQuota(v.q, mode)(k)
      return { n: tk.length, hits: k.arrivee.slice(0, 5).filter((x) => tk.includes(x)).length }
    })
    res[v.cle] = t
    const rep = [0, 0, 0, 0, 0, 0]
    t.forEach((x) => rep[x.hits]++)
    const moy = (t.reduce((s, x) => s + x.hits, 0) / n).toFixed(2)
    console.log('  ' + v.nom.padEnd(14) + rep.map((v2) => pct(v2)).join('')
      + '  |  ' + (t.filter((x) => x.hits >= 3).length / n * 100).toFixed(1).padStart(5) + ' %'
      + (t.filter((x) => x.hits >= 4).length / n * 100).toFixed(1).padStart(9) + ' %'
      + moy.padStart(9))
  }
  let gagne = 0
  let perd = 0
  let egal = 0
  for (let i = 0; i < n; i++) {
    const d = res.A[i].hits - res.B[i].hits
    if (d > 0) gagne++
    else if (d < 0) perd++
    else egal++
  }
  console.log('  ' + '-'.repeat(100))
  console.log('  ⭐ APARIÉ : 3-2-1-1-1 gagne sur ' + gagne + ' courses · 3-3-1-1-0 gagne sur ' + perd + ' · égalité ' + egal)
  const net = gagne - perd
  const bruit = Math.round(Math.sqrt(gagne + perd))
  console.log('     écart net = ' + (net > 0 ? '+' : '') + net + '  ·  bruit attendu ±' + bruit + '  =>  '
    + (Math.abs(net) <= bruit ? '⚠ PAS DE DIFFÉRENCE' : 'différence au-dessus du bruit'))
  console.log('')
}

/* ══════════════════ LA CONTRIBUTION PAR BLOC, POUR LES DEUX ════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE SIÈGE DE G5 : QUEL BLOC LE REMPLACE MIEUX ?              ║')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⭐ attrapés / possibles, sur les 3 premiers (podium)')
console.log('')
console.log('  bloc            3-2-1-1-1                    3-3-1-1-0')
console.log('                 attrapé/poss   capture      attrapé/poss   capture')
console.log('  ' + '-'.repeat(72))
for (let i = 0; i < BLOCS.length; i++) {
  const ligne = []
  for (const mode of ['cote']) {
    for (const v of VARIANTES) {
      let att = 0
      let pos = 0
      for (const k of base) {
        const tk = new Set(parQuota(v.q, mode)(k))
        const numsBloc = new Set(blocsDe(k)[i])
        k.arrivee.slice(0, 3).forEach((x) => {
          if (!numsBloc.has(x)) return
          pos++
          if (tk.has(x)) att++
        })
      }
      ligne.push({ att, pos })
    }
  }
  const [x, y] = ligne
  console.log('  ' + BLOCS[i].id.padEnd(6)
    + String(x.att + '/' + x.pos).padStart(12) + (x.pos ? (x.att / x.pos * 100).toFixed(0).padStart(8) + ' %' : '       —')
    + String(y.att + '/' + y.pos).padStart(24) + (y.pos ? (y.att / y.pos * 100).toFixed(0).padStart(8) + ' %' : '       —'))
}
console.log('')
console.log('  ⭐ G2 gagne 1 cheval, G5 en perd 1. Le tableau dit exactement')
console.log('     ce que chaque siège rapporte — et pour combien de courses.')
console.log('')

/* ═══════════════ le G5 seul : vaut-il son siège ? ════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE SIÈGE DE G5, TOUT SEUL                                  ║')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
let g5Pod = 0
let g5Quinte = 0
let g5AttrapePod = 0
for (const k of base) {
  const tk = new Set(parQuota(A.q, 'cote')(k))
  const numsBloc = new Set(blocsDe(k)[4])
  let a = 0
  k.arrivee.slice(0, 5).forEach((x, i) => {
    if (!numsBloc.has(x)) return
    if (i < 3) g5Pod++
    g5Quinte++
    if (tk.has(x)) a++
  })
  g5AttrapePod += a
}
console.log('  un cheval du podium dans G5 : ' + g5Pod + ' fois sur ' + n + ' courses  =  ' + (g5Pod / n * 100).toFixed(1) + ' %')
console.log('  un des 5 premiers dans G5   : ' + g5Quinte + ' fois  =  ' + (g5Quinte / (n * 5) * 100).toFixed(1) + ' % des places')
console.log('  attrapé par le 1 cheval de G5: ' + g5AttrapePod + ' sur ' + g5Pod + '  =  ' + (g5Pod ? (g5AttrapePod / g5Pod * 100).toFixed(0) : '—') + ' %')
console.log('')
