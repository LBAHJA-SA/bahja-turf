/* ---------------------------------------------------------------
 * tools\labo-g4.mjs  —  ⭐ G4 COMME VARIABLE ISOLÉE
 *
 *   node tools\labo-g4.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *
 * CE QUI EST FIXÉ (par la décision du 06/10/2026) :
 *   G1 = P1 + P2 + P3      ← la SEULE règle avec un signal preliminary
 *                           (83 % apprentissage, 88 % test, même sens)
 *   G2 = la règle apprise   (rang de presse)
 *   G3 = la règle apprise   (cote)
 *   G5 = la règle apprise   (cote)
 *   quotas = 3-2-1-1-1
 *
 * CE QUI EST LA SEULE VARIABLE : G4 = P11 ou P12
 *
 *   A — G4 actuel (la cote du bloc)
 *   B — G4 toujours P11
 *   C — G4 toujours P12
 *
 * ET ON NE JUDGE SUR QUATRE INDICATEURS, JAMAIS UN SEUL :
 *   podium  : 3/3  et  ≥2/3
 *   quinté  : ≥3/5  ≥4/5  5/5  moyenne
 *   Un changement qui neǾlève qu'un seul indicateur n'est pas retenu.
 *
 * ⭐ ET ON AJOUTE LE TEST DÉCISIF : le découpage en 4 tranches
 *   CHRONOLOGIQUES. Si le gagnant change d'une tranche à l'autre, alors
 *   G4 ne porte aucun signal stable — et c'est une réponse, pas un échec.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]
const COUPURE = 70   // 70 anciennes → apprentissage, 24 récentes → test

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => {
    const pDe = new Map(k.presse.map((x, i) => [x, i + 1]))
    const avecC = Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0)
    return { ...k, pDe, cDe: new Map(avecC.sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1])) }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)
const parCote = (k, i) => numsDuBloc(k, i).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))

/* ═════════════ le ticket : G1 figé, G4 variable, le reste inchangé ════ */
const P = (k, rang) => k.presse.find((x) => k.pDe.get(x) === rang)

function ticket(k, g4) {
  const g1 = numsDuBloc(k, 0)
    .slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b)).slice(0, 3)   // P1 P2 P3, figé
  const g2 = parCote(k, 1).slice(0, 2)
  const g3 = parCote(k, 2).slice(0, 1)
  const nums4 = numsDuBloc(k, 3)
  const g4v = g4 === 'actuel'
    ? parCote(k, 3).slice(0, 1)
    : (P(k, g4 === 'P11' ? 11 : 12) ? [P(k, g4 === 'P11' ? 11 : 12)] : parCote(k, 3).slice(0, 1))
  const g5 = parCote(k, 4).slice(0, 1)
  return [...g1, ...g2, ...g3, ...g4v, ...g5].filter(Boolean)
}

/* ═════════════════════════════ les mesures ════════════════════════════ */
const mesure = (idx, g4) => {
  const p3 = []
  const p5 = []
  for (const i of idx) {
    const k = base[i]
    const tk = new Set(ticket(k, g4))
    p3.push(k.podium.filter((x) => tk.has(x)).length)
    p5.push(k.top5.filter((x) => tk.has(x)).length)
  }
  const f = (t) => ({
    nb: t.length,
    moy: t.reduce((a, b) => a + b, 0) / t.length,
    plein: t.filter((v) => v === (t === p3 ? 3 : 5)).length / t.length * 100,
    ge2: t.filter((v) => v >= 2).length / t.length * 100,
    ge3: t.filter((v) => v >= 3).length / t.length * 100,
    ge4: t.filter((v) => v >= 4).length / t.length * 100,
  })
  return { p3: f(p3), p5: f(p5) }
}

const VARIANTES = [
  ['A — G4 actuel (cote)', 'actuel'],
  ['B — G4 toujours P11', 'P11'],
  ['C — G4 toujours P12', 'P12'],
]

const idxTrain = base.map((_, i) => i).slice(0, COUPURE)
const idxTest = base.map((_, i) => i).slice(COUPURE)

console.log('')
console.log('  ⭐⭐⭐ G4 COMME VARIABLE ISOLÉE — aucune modification du système')
console.log('')
console.log(`  FIXÉ : quotas 3-2-1-1-1 · G1 = P1+P2+P3 (signal préliminaire) · G2, G3, G5 = inchangés`)
console.log(`  VARIE : G4 seulement`)
console.log('')
console.log(`  ${n} Quintés  ·  apprentissage : ${base[0].date} → ${base[COUPURE - 1].date} (${COUPURE})`)
console.log(`  test JAMAIS VU : ${base[COUPURE].date} → ${base[n - 1].date} (${n - COUPURE})`)
console.log('')

for (const [titre, idx] of [['APPRENTISSEMENT', idxTrain], ['TEST — JAMAIS VU', idxTest]]) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log(`  ║  ${titre}`)
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                     PODIUM                      QUINTÉ')
  console.log('  variante              3/3     ≥2/3    |  moyenne    ≥3/5    ≥4/5    5/5')
  console.log('  ' + '-'.repeat(74))
  for (const [nom, g4] of VARIANTES) {
    const m = mesure(idx, g4)
    console.log('  ' + nom.padEnd(22)
      + (m.p3.plein.toFixed(0) + '%').padStart(6) + (m.p3.ge2.toFixed(0) + '%').padStart(9) + '    |  '
      + m.p5.moy.toFixed(2).padStart(7) + (m.p5.ge3.toFixed(0) + '%').padStart(8)
      + (m.p5.ge4.toFixed(0) + '%').padStart(8) + (m.p5.plein.toFixed(0) + '%').padStart(7))
  }
  console.log('')
}

/* ═══════════ le bruit : 24 courses, combien de courses d'écart ? ═══════ */
const nTest = idxTest.length
console.log('  ⚠  AVEC ' + nTest + ' COURSES AU TEST, 1 COURSE = ' + (100 / nTest).toFixed(1) + ' POINTS.')
console.log('     Deux variantes à moins de 2 courses d\u0027écart ne sont pas séparables.')
console.log('')

/* ═════════ le test décisif : 4 tranches chronologiques ══════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE TEST DÉCISIF — 4 TRANCHES CHRONOLOGIQUES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const NB = 4
const taille = Math.ceil(n / NB)
const tranches = []
for (let t = 0; t < NB; t++) tranches.push(base.map((_, i) => i).slice(t * taille, Math.min((t + 1) * taille, n)).filter((i) => i < n))

console.log('  tranche                 A actuel    B P11     C P12     |  gagnant')
console.log('  ' + '-'.repeat(70))
const gagnants = []
tranches.forEach((idx, t) => {
  if (!idx.length) return
  const d0 = base[idx[0]].date
  const d1 = base[idx[idx.length - 1]].date
  const scores = VARIANTES.map(([nom, g4]) => mesure(idx, g4).p5.moy)
  const best = scores.indexOf(Math.max(...scores))
  gagnants.push(best)
  console.log('  ' + (d0 + '→' + d1).padEnd(14) + idx.length + ' c.'
    + scores.map((s) => s.toFixed(2).padStart(9)).join(' ') + '  |  ' + VARIANTES[best][0].split('—')[1].trim())
})
console.log('')
const unique = [...new Set(gagnants)]
console.log('  ⭐ les gagnants par tranche : ' + VARIANTES.map(([nom], i) => unique.includes(i) ? nom : null).filter(Boolean).join('  ·  '))
console.log('')
if (unique.length === 1) {
  console.log('  ⭐⇒ LE MÊME GAGNANT DANS LES 4 TRANCHES : G4 porte peut-être un signal.')
} else {
  console.log('  ⭐⇒ LE GAGNANT CHANGE D UNE TRANCHE À L AUTRE.')
  console.log('     G4 ne porte aucun signal stable. Il n y a rien à fixer : le statu quo')
  console.log('     est la seule décision honnête.')
}
console.log('')

/* ═══════════ les 4 indicateurs, façon liste de contrôle ═════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LA LISTE DE CONTRÔLE — un seul indicateur ne suffit pas')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const ref = mesure(idxTest, 'actuel')
for (const [nom, g4] of VARIANTES.slice(1)) {
  const m = mesure(idxTest, g4)
  const lignes = [
    ['podium 3/3', ref.p3.plein, m.p3.plein],
    ['podium ≥2/3', ref.p3.ge2, m.p3.ge2],
    ['quinté moyenne', ref.p5.moy, m.p5.moy],
    ['quinté ≥3/5', ref.p5.ge3, m.p5.ge3],
    ['quinté ≥4/5', ref.p5.ge4, m.p5.ge4],
    ['quinté 5/5', ref.p5.plein, m.p5.plein],
  ]
  console.log('  ' + nom + '  contre  G4 actuel')
  let gagne = 0
  let perd = 0
  for (const [l, a, b] of lignes) {
    const d = b - a
    if (d > 0) gagne++
    if (d < 0) perd++
    console.log('    ' + l.padEnd(18) + (a.toFixed(1)).padStart(6) + '  →' + (b.toFixed(1)).padStart(6)
      + '   ' + (d === 0 ? '=' : (d > 0 ? '+' : '') + d.toFixed(1)) + (Math.abs(d) < 1 ? '   (moins d 1 course : du bruit)' : ''))
  }
  console.log('    → ' + gagne + ' indicateurs gagnés, ' + perd + ' perdus')
  console.log('')
}
