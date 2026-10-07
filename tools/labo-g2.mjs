/* ---------------------------------------------------------------
 * tools\labo-g2.mjs  —  ⭐ G2 SEUL, DANS LE TICKET ENTIER
 *
 *   node tools\labo-g2.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *
 * UNE SEULE VARIABLE : les deux chevaux pris dans G2 (P5..P8, quota 2).
 * G1, G3, G4, G5 restent remplis par la cote, strictement inchangés.
 *
 *   A — actuel          : les 2 meilleures cotes parmi P5, P6, P7, P8
 *   B — on écarte P7    : les 2 meilleures cotes parmi P5, P6, P8
 *   C — on écarte P8    : les 2 meilleures cotes parmi P5, P6, P7
 *
 * ⚠ L'ORACLE DU JET disait « jeter P7 = 45 gagnants perdus » contre
 * « jeter P8 = 51 ». C'est un INDICE, pas une preuve : ça compare le coût
 * de l'exclusion, pas le résultat du moteur. Ici on ne juge que la
 * B . C I M P R E N T E.
 *
 * ⭐ LA RÈGLE STRICTE, inchangée :
 *      3/3      ↑ ou =
 *      4/4      ↑
 *      5/5      ↑ ou =   — JAMAIS ↓
 *      ≥4/5     ↑ ou =   — JAMAIS ↓
 *      ≥3/5     ↑ ou =
 *      moyenne  ↑ ou =
 *      tranches  l'amélioration ne doit pas être cantonnée à une période
 *
 *   Un « 3/3 ↑, ≥3/5 ↑, moyenne ↑ MAIS 5/5 ↓ » est REFUSÉ.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
    return { ...k, pDe, avecC, cDe: new Map(avecC.sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1])) }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)
const parCote = (k, i, echappe) => {
  const nums = numsDuBloc(k, i)
  if (echappe == null) return nums.slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
  const p = k.presse.find((x) => k.pDe.get(x) === echappe)
  return nums.filter((x) => x !== p).sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
}

/* ═════════════════════ le ticket ════════════════════════════════════ */
function ticket(k, echappe) {
  const g1 = parCote(k, 0).slice(0, 3)
  const g2 = parCote(k, 1, echappe).slice(0, 2)
  const g3 = parCote(k, 2).slice(0, 1)
  const g4 = parCote(k, 3).slice(0, 1)
  const g5 = parCote(k, 4).slice(0, 1)
  return [...g1, ...g2, ...g3, ...g4, ...g5].filter(Boolean)
}

const empreinte = (idx, echappe) => {
  const t3 = []
  const t4 = []
  const t5 = []
  for (const i of idx) {
    const k = base[i]
    const tk = new Set(ticket(k, echappe))
    t3.push(k.podium.filter((x) => tk.has(x)).length)
    t4.push(k.arrivee.slice(0, 4).filter((x) => tk.has(x)).length)
    t5.push(k.top5.filter((x) => tk.has(x)).length)
  }
  const st = (t, max) => ({
    moy: t.reduce((a, b) => a + b, 0) / t.length,
    plein: t.filter((v) => v === max).length / t.length * 100,
    ge2: t.filter((v) => v >= Math.min(2, max)).length / t.length * 100,
    ge3: t.filter((v) => v >= 3).length / t.length * 100,
    ge4: max >= 4 ? t.filter((v) => v >= 4).length / t.length * 100 : null,
  })
  return { n: t3.length, trio: st(t3, 3), quat: st(t4, 4), quint: st(t5, 5) }
}

const VARIANTES = [
  ['A — actuel (les 2 cotes)', null],
  ['B — on écarte P7', 7],
  ['C — on écarte P8', 8],
]

const idxTrain = base.map((_, i) => i).slice(0, COUPURE)
const idxTest = base.map((_, i) => i).slice(COUPURE)
const idxAll = base.map((_, i) => i)

console.log('')
console.log('  ⭐⭐⭐ G2 SEUL, DANS LE TICKET ENTIER — aucune modification du système')
console.log('  FIXÉ : quotas 3-2-1-1-1 · G1, G3, G4, G5 par la cote, strictement inchangés')
console.log('  VARIE : les 2 chevaux de G2 seulement')
console.log('')
console.log(`  ${n} Quintés · apprentissage ${base[0].date}→${base[COUPURE - 1].date} (${COUPURE})`)
console.log(`  test JAMAIS VU ${base[COUPURE].date}→${base[n - 1].date} (${n - COUPURE})`)
console.log('')

for (const [titre, idx] of [['APPRENTISSEMENT', idxTrain], ['TEST — JAMAIS VU', idxTest], ['TOUT LE CORPUS', idxAll]]) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log(`  ║  ${titre}  (${idx.length} courses)`)
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                         ① le TRIO          ② le QUATUOR      ③ le QUINTE')
  console.log('  variante               3/3    ≥2/3   moy | 4/4    ≥3/4   moy | 5/5    ≥4/5   ≥3/5   moy')
  console.log('  ' + '-'.repeat(90))
  const emps = {}
  for (const [nom, ech] of VARIANTES) {
    const e = empreinte(idx, ech)
    emps[nom] = e
    console.log('  ' + nom.padEnd(24)
      + (e.trio.plein.toFixed(0) + '%').padStart(5) + (e.trio.ge2.toFixed(0) + '%').padStart(8) + e.trio.moy.toFixed(2).padStart(6)
      + ' |' + (e.quat.plein.toFixed(0) + '%').padStart(6) + (e.quat.ge3.toFixed(0) + '%').padStart(8) + e.quat.moy.toFixed(2).padStart(6)
      + ' |' + (e.quint.plein.toFixed(0) + '%').padStart(6) + (e.quint.ge4.toFixed(0) + '%').padStart(8) + (e.quint.ge3.toFixed(0) + '%').padStart(8) + e.quint.moy.toFixed(2).padStart(6))
  }
  console.log('')

  const ref = 'A — actuel (les 2 cotes)'
  const criteres = [
    ['trio 3/3', 'trio', 'plein', 'h'],
    ['trio ≥2/3', 'trio', 'ge2', 'e'],
    ['quatuor 4/4', 'quat', 'plein', 'H'],
    ['quatuor ≥3/4', 'quat', 'ge3', 'H'],
    ['quinté 5/5', 'quint', 'plein', 'O'],
    ['quinté ≥4/5', 'quint', 'ge4', 'O'],
    ['quinté ≥3/5', 'quint', 'ge3', 'e'],
    ['quinté moyenne', 'quint', 'moy', 'e'],
  ]
  for (const [nom, ech] of VARIANTES.slice(1)) {
    const a = emps[ref]
    const b = emps[nom]
    console.log('  ▸ ' + nom + '   contre l\'actuel')
    let ko = 0
    let gains = 0
    let pertes = 0
    for (const [lib, g, champ, exi] of criteres) {
      const x = a[g][champ]
      const y = b[g][champ]
      const bruit = lib.includes('moyenne') ? 0.10 : 100 / idx.length / 2
      const d = y - x
      const s = d > bruit ? '↑' : d < -bruit ? '↓' : '='
      if (s === '↑') gains++
      if (s === '↓') pertes++
      if (exi === 'O' && s === '↓') ko++
      console.log('    ' + lib.padEnd(16) + x.toFixed(1).padStart(6) + '  →' + y.toFixed(1).padStart(6) + '   ' + s + (Math.abs(d) <= bruit ? '  (bruit)' : ''))
    }
    console.log('    → ' + gains + ' ↑ · ' + pertes + ' ↓   '
      + (ko ? '✗ REFUSÉ : ' + ko + ' indicateur(s) OBLIGATOIRE(S) en baisse' : (pertes ? '⚠ acceptable si 5/5 et ≥4/5 ne baissent pas' : '✓ passe')))
    console.log('')
  }
}

/* ═══════════════ les 4 tranches ═════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE SENS DANS 4 TRANCHES CHRONOLOGIQUES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const NB = 4
const taille = Math.ceil(n / NB)
console.log('  tranche                   A moy    B moy    C moy   |  A 5/5  B 5/5  C 5/5  |  A ≥4/5 B ≥4/5 C ≥4/5 |  sens B')
console.log('  ' + '-'.repeat(112))
const sensB = []
const sensC = []
for (let t = 0; t < NB; t++) {
  const idx = base.map((_, i) => i).slice(t * taille, Math.min((t + 1) * taille, n))
  if (!idx.length) continue
  const a = empreinte(idx, null)
  const b = empreinte(idx, 7)
  const c = empreinte(idx, 8)
  sensB.push(Math.sign(b.quint.moy - a.quint.moy))
  sensC.push(Math.sign(c.quint.moy - a.quint.moy))
  console.log('  ' + (base[idx[0]].date + '→' + base[idx[idx.length - 1]].date).padEnd(14) + String(idx.length).padStart(2) + ' c.'
    + a.quint.moy.toFixed(2).padStart(8) + b.quint.moy.toFixed(2).padStart(8) + c.quint.moy.toFixed(2).padStart(8) + '  |'
    + a.quint.plein.toFixed(0).padStart(6) + '%' + b.quint.plein.toFixed(0).padStart(7) + '%' + c.quint.plein.toFixed(0).padStart(7) + '%  |'
    + a.quint.ge4.toFixed(0).padStart(6) + '%' + b.quint.ge4.toFixed(0).padStart(7) + '%' + c.quint.ge4.toFixed(0).padStart(7) + '%  |  '
    + (b.quint.moy - a.quint.moy > 0.02 ? '↑' : b.quint.moy - a.quint.moy < -0.02 ? '↓' : '→'))
}
console.log('')
const fmt = (s) => s.map((x) => (x > 0 ? '↑' : x < 0 ? '↓' : '→')).join(' ')
console.log('  ⭐ B (écarter P7) : ' + fmt(sensB))
console.log('  ⭐ C (écarter P8) : ' + fmt(sensC))
const pos = (s) => s.filter((x) => x > 0).length
console.log('')
console.log('  B : ' + pos(sensB) + ' tranches en hausse / ' + (4 - pos(sensB)) + ' autres')
console.log('  C : ' + pos(sensC) + ' tranches en hausse / ' + (4 - pos(sensC)) + ' autres')
console.log('')
