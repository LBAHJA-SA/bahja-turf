/* ---------------------------------------------------------------
 * tools\labo-g1.mjs  —  ⭐ G1 SEUL, DANS LE TICKET ENTIER
 *
 *   node tools\labo-g1.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *
 * LA SEULE VARIABLE : comment on remplit G1 (P1..P4, quota 3).
 *
 *   A — G1 actuel          : les 3 meilleures cotes du bloc
 *   B — G1 = P1 + P2 + P3  : la seule règle qui a survécu au test
 *                            (83 % apprentissage, 88 % test, même sens)
 *
 * TOUT LE RESTE EST IDENTIQUE : G2, G3, G4, G5 restent remplis par la cote.
 * Rien d'autre ne bouge. C'est la condition pour que la lecture soit propre.
 *
 * ON REGARDE QUATRE INDICATEURS, ET ON N'ACCEPTE PAS UNE AMÉLIORATION
 * SUR UN SEUL (§ la règle du 06/10) :
 *      podium  : 3/3, ≥2/3
 *      quinté  : moyenne, ≥3/5, ≥4/5, 5/5
 *
 * ET ON REFIT LE TEST EN 4 TRANCHES CHRONOLOGIQUES : si le sens s'inverse
 * quelque part, la règle ne passe pas.
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
const COUPURE = 70

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
const parPresse = (k, i) => numsDuBloc(k, i).slice().sort((a, c) => k.pDe.get(a) - k.pDe.get(c))

/* ═════════ le ticket : G1 variable, tout le reste strictement identique ═══ */
function ticket(k, g1mode) {
  const g1 = g1mode === 'P1P2P3' ? parPresse(k, 0).slice(0, 3) : parCote(k, 0).slice(0, 3)
  const g2 = parCote(k, 1).slice(0, 2)
  const g3 = parCote(k, 2).slice(0, 1)
  const g4 = parCote(k, 3).slice(0, 1)
  const g5 = parCote(k, 4).slice(0, 1)
  return [...g1, ...g2, ...g3, ...g4, ...g5].filter(Boolean)
}

const mesure = (idx, g1mode) => {
  const p3 = []
  const p5 = []
  for (const i of idx) {
    const k = base[i]
    const tk = new Set(ticket(k, g1mode))
    p3.push(k.podium.filter((x) => tk.has(x)).length)
    p5.push(k.top5.filter((x) => tk.has(x)).length)
  }
  const st = (t, max) => ({
    moy: t.reduce((a, b) => a + b, 0) / t.length,
    plein: t.filter((v) => v === max).length / t.length * 100,
    ge2: t.filter((v) => v >= 2).length / t.length * 100,
    ge3: t.filter((v) => v >= 3).length / t.length * 100,
    ge4: t.filter((v) => v >= 4).length / t.length * 100,
  })
  return { p3: st(p3, 3), p5: st(p5, 5) }
}

const VARIANTES = [
  ['A — G1 actuel (cote)', 'cote'],
  ['B — G1 = P1+P2+P3', 'P1P2P3'],
]

const idxTrain = base.map((_, i) => i).slice(0, COUPURE)
const idxTest = base.map((_, i) => i).slice(COUPURE)

console.log('')
console.log('  ⭐⭐⭐ G1 SEUL, DANS LE TICKET ENTIER — aucune modification du système')
console.log('')
console.log('  FIXÉ : quotas 3-2-1-1-1 · G2 G3 G4 G5 remplis par la cote, strictement inchangés')
console.log('  VARIE : G1 seulement (3 sur 4)')
console.log('')
console.log(`  ${n} Quintés · apprentissage ${base[0].date}→${base[COUPURE - 1].date} (${COUPURE})`)
console.log(`  test JAMAIS VU ${base[COUPURE].date}→${base[n - 1].date} (${n - COUPURE})`)
console.log('')

/* ══════════════════════════ les 4 indicateurs ══════════════════════════ */
for (const [titre, idx] of [['APPRENTISSEMENT (70)', idxTrain], ['TEST — JAMAIS VU (24)', idxTest]]) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log(`  ║  ${titre}`)
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                     PODIUM              QUINTÉ')
  console.log('  variante             3/3     ≥2/3   |  moyenne    ≥3/5    ≥4/5    5/5')
  console.log('  ' + '-'.repeat(72))
  for (const [nom, mode] of VARIANTES) {
    const m = mesure(idx, mode)
    console.log('  ' + nom.padEnd(22) + (m.p3.plein.toFixed(0) + '%').padStart(6) + (m.p3.ge2.toFixed(0) + '%').padStart(9)
      + '   |  ' + m.p5.moy.toFixed(2).padStart(7) + (m.p5.ge3.toFixed(0) + '%').padStart(8)
      + (m.p5.ge4.toFixed(0) + '%').padStart(8) + (m.p5.plein.toFixed(0) + '%').padStart(7))
  }
  console.log('')
}

/* ══════════════════════ les 4 tranches chronologiques ═══════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LE TEST DÉCISIF — 4 TRANCHES CHRONOLOGIQUES (moyenne Quinté)')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const NB = 4
const taille = Math.ceil(n / NB)
console.log('  tranche                 A actuel    B P1P2P3      écart   |  gagnant')
console.log('  ' + '-'.repeat(74))
const sens = []
for (let t = 0; t < NB; t++) {
  const idx = base.map((_, i) => i).slice(t * taille, Math.min((t + 1) * taille, n))
  if (!idx.length) continue
  const a = mesure(idx, 'cote')
  const b = mesure(idx, 'P1P2P3')
  const d = b.p5.moy - a.p5.moy
  sens.push(Math.sign(d))
  const d3 = b.p3.plein - a.p3.plein
  const g = d > 0.02 ? 'B (P1P2P3)' : d < -0.02 ? 'A (actuel)' : 'égalité'
  console.log('  ' + (base[idx[0]].date + '→' + base[idx[idx.length - 1]].date).padEnd(14) + String(idx.length).padStart(2) + ' c.'
    + a.p5.moy.toFixed(2).padStart(9) + b.p5.moy.toFixed(2).padStart(11)
    + ((d > 0 ? '+' : '') + d.toFixed(2)).padStart(10) + '   |  ' + g
    + '   (3/3 ' + (d3 > 0 ? '+' : '') + d3.toFixed(0) + ' pts)')
}
console.log('')
const positifs = sens.filter((x) => x > 0).length
const negatifs = sens.filter((x) => x < 0).length
console.log('  ⭐ sens de l\'amélioration par tranche : ' + sens.map((x) => (x > 0 ? '↑' : x < 0 ? '↓' : '→')).join('  ')
  + '   (' + positifs + ' en hausse, ' + negatifs + ' en baisse, ' + (sens.length - positifs - negatifs) + ' stable)')
console.log('')
console.log(positifs >= 3
  ? '  ⭐⇒ B est meilleure dans au moins 3 tranches sur 4 : le signal tient dans le temps.'
  : positifs <= 1
    ? '  ⭐⇒ B ne domine pas dans le temps : sur-apprentissage. À rejeter.'
    : '  ⭐⇒ Le signal est mitigé dans le temps : à confirmer, pas à appliquer.')
console.log('')

/* ═══════════════════════ la liste de contrôle ═══════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LA LISTE DE CONTRÔLE — 6 indicateurs, un seul ne suffit pas')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
for (const [titre, idx] of [['sur le TEST JAMAIS VU (24)', idxTest], ['sur TOUT le corpus (94)', base.map((_, i) => i)]]) {
  const a = mesure(idx, 'cote')
  const b = mesure(idx, 'P1P2P3')
  console.log('  ' + titre)
  const lignes = [
    ['podium 3/3', a.p3.plein, b.p3.plein],
    ['podium ≥2/3', a.p3.ge2, b.p3.ge2],
    ['quinté moyenne', a.p5.moy, b.p5.moy],
    ['quinté ≥3/5', a.p5.ge3, b.p5.ge3],
    ['quinté ≥4/5', a.p5.ge4, b.p5.ge4],
    ['quinté 5/5', a.p5.plein, b.p5.plein],
  ]
  let g = 0
  let p = 0
  for (const [l, x, y] of lignes) {
    const d = y - x
    if (d > 0) g++
    if (d < 0) p++
    const unite = l.includes('moyenne') ? '' : ' pts'
    const seuil = Math.abs(d) < (l.includes('moyenne') ? 0.10 : 100 / idx.length / 2) ? '   (bruit)' : ''
    console.log('    ' + l.padEnd(18) + x.toFixed(1).padStart(6) + '   →' + y.toFixed(1).padStart(6)
      + '   ' + (d === 0 ? '=' : (d > 0 ? '+' : '') + d.toFixed(2) + unite) + seuil)
  }
  console.log('    → ' + g + ' gagnés · ' + p + ' perdus')
  console.log('')
}
