/* ---------------------------------------------------------------
 * tools\empreinte.mjs  —  ⭐⭐⭐ LA EMPREINTE DU MOTEUR
 *
 *   node tools\empreinte.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *
 * LE TEST FONDAMENTAL. On ne juge plus UN BLOC, ni un 3/5 isolé :
 * on mesure l'empreinte complète du moteur, c'est-à-dire les 8 chevaux
 * choisis face à trois cibles en même temps :
 *
 *   ① le TRIO    (top 3)   :  3/3   ≥2/3   moyenne
 *   ② le QUATUOR (top 4)   :  4/4   ≥3/4   moyenne
 *   ③ le QUINTE  (top 5)   :  5/5   ≥4/5   ≥3/5   moyenne
 *
 * ⭐ LA RÈGLE DE DÉCISION (06/10/2026), elle est stricte :
 *
 *     3/3        ↑
 *     ≥2/3       ↑ ou stable
 *     4/4        ↑
 *     ≥3/4       ↑
 *     5/5        ↑  OBLIGATOIRE
 *     ≥4/5       ↑  OBLIGATOIRE
 *     moyenne    ↑
 *
 *   Un changement qui fait monter 3/3 et ≥3/5 mais fait BAISSER 5/5 ou
 *   ≥4/5 n'est pas une amélioration. Il déplace la distribution vers le
 *   milieu, il ne la pousse pas vers le Quinté. Ce n'est pas un progrès.
 *
 * ET le déplacement se vérifie dans 4 TRANCHES CHRONOLOGIQUES : une règle
 * dont le sens s'inverse entre deux périodes ne passe pas.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreForme } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')
const COUPURE = 70

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => {
    const pDe = new Map(k.presse.map((x, i) => [x, i + 1]))
    const avecC = Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0)
    return {
      ...k,
      pDe, avecC,
      cDe: new Map(avecC.sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1])),
      parNum: new Map(k.partants.map((p) => [p.num, p])),
    }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)

/* ═══════════════════ les règles par bloc ═════════════════════════════ */
const norm = (k, nums, f) => {
  /* ⚠ `nums.map(f)` passerait (valeur, index, tableau) à f — et f attend (k, num).
   * On encapsule donc explicitement. */
  const v = nums.map((x) => f(k, x))
  const mn = Math.min(...v)
  const mx = Math.max(...v)
  return (x) => (mx === mn ? 0.5 : (f(k, x) - mn) / (mx - mn))
}
const p = (k, num) => k.parNum.get(num) || {}

const SIG = {
  'cote': { s: -1, f: (k, num) => k.cotes[num] || 999 },
  'rangPresse': { s: -1, f: (k, num) => k.pDe.get(num) },
  'rangCote': { s: -1, f: (k, num) => k.cDe.get(num) },
  'evolution': { s: 1, f: (k, num) => (k.ouverture[num] && k.cotes[num] ? k.ouverture[num] - k.cotes[num] : 0) },
  'forme': { s: 1, f: (k, num) => scoreForme(p(k, num).musique, k.discipline).score },
  'stats': { s: 1, f: (k, num) => { const x = p(k, num); return (x.nbVictoires || 0) * 3 + (x.nb2e || 0) * 2 + (x.nb3e || 0) * 1.5 + (x.nbPlaces || 0) } },
  'valeur': { s: 1, f: (k, num) => p(k, num).valeur || 0 },
  'poids': { s: -1, f: (k, num) => p(k, num).poids || 60 },
  'age': { s: -1, f: (k, num) => p(k, num).age ?? 8 },
  'corde': { s: -1, f: (k, num) => p(k, num).corde || num },
}

/** Remplit un bloc avec la règle demandée. */
const remplirBloc = (k, bi, regles) => {
  const nums = numsDuBloc(k, bi)
  const q = BLOCS[bi].quota
  if (nums.length <= q) return nums
  const ns = regles.map((r) => norm(k, nums, SIG[r].f))
  const scored = nums.map((num) => {
    let s = 0
    regles.forEach((r, i) => { s += SIG[r].s > 0 ? ns[i](num) : 1 - ns[i](num) })
    return { num, s }
  })
  return scored.sort((a, b) => b.s - a.s || a.num - b.num).slice(0, q).map((x) => x.num)
}

const ticketDe = (k, config) => BLOCS.flatMap((b, bi) => remplirBloc(k, bi, config[b.id]))

/* ═══════════════════════ L'EMPREINTE ════════════════════════════════ */
const empreinte = (idx, config) => {
  const t3 = []
  const t4 = []
  const t5 = []
  for (const i of idx) {
    const k = base[i]
    const tk = new Set(ticketDe(k, config))
    t3.push(k.arrivee.slice(0, 3).filter((x) => tk.has(x)).length)
    t4.push(k.arrivee.slice(0, 4).filter((x) => tk.has(x)).length)
    t5.push(k.top5.filter((x) => tk.has(x)).length)
  }
  const st = (t, max) => {
    const c = {}
    for (let v = 0; v <= max; v++) c[v] = t.filter((x) => x === v).length
    return {
      c, moy: t.reduce((a, b) => a + b, 0) / t.length,
      plein: c[max] / t.length * 100,
      ge3: t.filter((v) => v >= Math.min(3, max)).length / t.length * 100,
      ge2: t.filter((v) => v >= Math.min(2, max)).length / t.length * 100,
      ge4: max >= 4 ? t.filter((v) => v >= 4).length / t.length * 100 : null,
    }
  }
  return { n: t3.length, trio: st(t3, 3), quat: st(t4, 4), quint: st(t5, 5) }
}

const TOUS_COTE = { G1: ['cote'], G2: ['cote'], G3: ['cote'], G4: ['cote'], G5: ['cote'] }
const G1_P = { ...TOUS_COTE, G1: ['rangPresse'] }

const idxTrain = base.map((_, i) => i).slice(0, COUPURE)
const idxTest = base.map((_, i) => i).slice(COUPURE)
const idxAll = base.map((_, i) => i)

console.log('')
console.log('  ⭐⭐⭐ L EMPREINTE DU MOTEUR — 3 cibles à la fois')
console.log(`     quotas 3-2-1-1-1 intacts · ${n} Quintés · ${COUPURE} apprentissage / ${n - COUPURE} test jamais vu`)
console.log('')

const variantes = [
  ['A — tout par la cote (aujourd hui)', TOUS_COTE],
  ['B — G1 = P1+P2+P3, le reste cote', G1_P],
]

for (const [titre, idx] of [['APPRENTISSEMENT', idxTrain], ['TEST — JAMAIS VU', idxTest], ['TOUT LE CORPUS', idxAll]]) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log(`  ║  ${titre}  (${idx.length} courses)`)
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                        ① le TRIO          ② le QUATUOR      ③ le QUINTE')
  console.log('  moteur             3/3    ≥2/3   moy | 4/4    ≥3/4   moy | 5/5    ≥4/5   ≥3/5   moy')
  console.log('  ' + '-'.repeat(88))
  const emps = {}
  for (const [nom, cfg] of variantes) {
    const e = empreinte(idx, cfg)
    emps[nom] = e
    console.log('  ' + nom.padEnd(22)
      + (e.trio.plein.toFixed(0) + '%').padStart(5) + (e.trio.ge2.toFixed(0) + '%').padStart(8) + e.trio.moy.toFixed(2).padStart(6)
      + ' |' + (e.quat.plein.toFixed(0) + '%').padStart(6) + (e.quat.ge3.toFixed(0) + '%').padStart(8) + e.quat.moy.toFixed(2).padStart(6)
      + ' |' + (e.quint.plein.toFixed(0) + '%').padStart(6) + (e.quint.ge4.toFixed(0) + '%').padStart(8) + (e.quint.ge3.toFixed(0) + '%').padStart(8) + e.quint.moy.toFixed(2).padStart(6))
  }
  console.log('')
  /* ---- le verdict selon la règle stricte ---- */
  const a = emps[variantes[0][0]]
  const b = emps[variantes[1][0]]
  const criteres = [
    ['trio 3/3', a.trio.plein, b.trio.plein, 'h'],
    ['trio ≥2/3', a.trio.ge2, b.trio.ge2, '='],
    ['quatuor 4/4', a.quat.plein, b.quat.plein, 'h'],
    ['quatuor ≥3/4', a.quat.ge3, b.quat.ge3, 'h'],
    ['quinté 5/5', a.quint.plein, b.quint.plein, 'H'],
    ['quinté ≥4/5', a.quint.ge4, b.quint.ge4, 'H'],
    ['quinté ≥3/5', a.quint.ge3, b.quint.ge3, 'h'],
    ['quinté moyenne', a.quint.moy, b.quint.moy, 'h'],
  ]
  const ref = 'A — tout par la cote (aujourd hui)'
  const B = 'B — G1 = P1+P2+P3, le reste cote'
  console.log('    RÈGLE STRICTE — B contre ' + ref)
  let obligatoryDown = 0
  for (const [l, x, y, niveau] of criteres) {
    const d = y - x
    const bruit = l.includes('moyenne') ? 0.10 : 100 / idx.length / 2
    const signe = d > bruit ? '↑' : d < -bruit ? '↓' : '='
    if (niveau === 'H' && signe === '↓') obligatoryDown++
    console.log('    ' + l.padEnd(16) + x.toFixed(1).padStart(6) + '  →' + y.toFixed(1).padStart(6) + '   ' + signe + (Math.abs(d) <= bruit ? '  (bruit)' : ''))
  }
  console.log('    ' + (obligatoryDown ? '✗ REFUSÉ : ' + obligatoryDown + ' indicateur(s) OBLIGATOIRE(S) en baisse' : '✓ passe la règle stricte'))
  console.log('')
}

/* ═════════ 4 tranches : est-ce que le sens de B tient dans le temps ? ═ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE SENS DANS 4 TRANCHES CHRONOLOGIQUES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const NB = 4
const taille = Math.ceil(n / NB)
console.log('  tranche                   A quinté   B quinté    écart   |  A 5/5   B 5/5   A ≥4/5  B ≥4/5  |  sens')
console.log('  ' + '-'.repeat(100))
const sens = []
for (let t = 0; t < NB; t++) {
  const idx = base.map((_, i) => i).slice(t * taille, Math.min((t + 1) * taille, n))
  if (!idx.length) continue
  const a = empreinte(idx, TOUS_COTE)
  const b = empreinte(idx, G1_P)
  const d = b.quint.moy - a.quint.moy
  sens.push(Math.sign(d))
  console.log('  ' + (base[idx[0]].date + '→' + base[idx[idx.length - 1]].date).padEnd(14) + String(idx.length).padStart(2) + ' c.'
    + a.quint.moy.toFixed(2).padStart(12) + b.quint.moy.toFixed(2).padStart(12)
    + ((d > 0 ? '+' : '') + d.toFixed(2)).padStart(9) + '   |'
    + a.quint.plein.toFixed(0).padStart(6) + '%' + b.quint.plein.toFixed(0).padStart(7) + '%'
    + a.quint.ge4.toFixed(0).padStart(7) + '%' + b.quint.ge4.toFixed(0).padStart(7) + '%  |  '
    + (d > 0.02 ? '↑' : d < -0.02 ? '↓' : '→'))
}
console.log('')
const pos = sens.filter((x) => x > 0).length
const neg = sens.filter((x) => x < 0).length
console.log('  ⭐ sens : ' + sens.map((x) => (x > 0 ? '↑' : x < 0 ? '↓' : '→')).join('  ')
  + '   (' + pos + ' en hausse · ' + neg + ' en baisse · ' + (sens.length - pos - neg) + ' stable)')
console.log('')
console.log(pos >= 3 ? '  ⭐⇒ le signal se maintient dans le temps.'
  : pos <= 1 ? '  ⭐⇒ le signal ne se maintient PAS dans le temps : sur-ajustement.'
    : '  ⭐⇒ signal mitigé : à confirmer, PAS à appliquer.')
console.log('')
