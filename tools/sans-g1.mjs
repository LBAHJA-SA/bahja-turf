/* ---------------------------------------------------------------
 * tools\sans-g1.mjs  —  ⭐ 8 CHEVAUX  contre  5 SANS G1
 *
 *   node tools\sans-g1.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule. Quotas 3-2-1-1-1 intacts.
 *
 * LA QUESTION, EN DEUX TEMPS
 *   ① la B I C M P R E  du moteur tel quel :
 *          3 G1 + 2 G2 + 1 G3 + 1 G4 + 1 G5   = 8 chevaux
 *
 *   ② la même course, les mêmes choix, MAIS on enlève les 3 de G1 :
 *          2 G2 + 1 G3 + 1 G4 + 1 G5          = 5 chevaux
 *
 *   puis on lit ce qui reste :
 *      · le TRIO   (3/3, ≥2/3)     → la valeur réelle de G1 sur la porte
 *      · le QUINTE (5/5, ≥4/5, ≥3/5, moyenne) → la valeur de G1 sur la qualité
 *
 *   si le 5/5 ne s effondre pas, G1 apporte du bruit et non de la valeur.
 *   si il s effondre, G1 est encore nécessaire.
 *
 * LES DEUX NIVEAUX
 *   TEST  — les 24 dernières courses, JAMAIS VUES
 *   TOUT  — les 94 courses
 *   (l apprentissage 70 est affiché aussi, pour voir si ça bougeait déjà)
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

const corpus = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = corpus.length

/** les choix du moteur : chaque bloc rempli par la cote */
const numsBloc = (k, i) => k.presse.filter((x) => {
  const r = k.pDe.get(x)
  return r >= BLOCS[i].min && r <= BLOCS[i].max
})
const choix = corpus.map((k) => BLOCS.map((b, i) =>
  numsBloc(k, i).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, b.quota)))

/** ② le même ticket, sans les 3 de G1 */
const choixSansG1 = choix.map((blocs) => blocs.slice(1).flat())

const idxAll = corpus.map((_, i) => i)
const idxApp = idxAll.slice(0, COUPURE)
const idxTest = idxAll.slice(COUPURE)

/* ══════════════════════════════════════════════════════════════════ */
const vide = () => ({ t3: [], t4: [], t5: [], porte: 0, molte: 0 })

function mesurer(idx, source) {
  const portes = []
  let n3 = 0
  let ge2 = 0
  let plein5 = 0
  let ge4 = 0
  let ge3 = 0
  for (const ki of idx) {
    const k = corpus[ki]
    const tk = new Set(source === 'sansG1' ? choixSansG1[ki] : choix[ki].flat())
    const a = k.arrivee
    const h3 = a.slice(0, 3).filter((x) => tk.has(x)).length
    const h4 = a.slice(0, 4).filter((x) => tk.has(x)).length
    const h5 = a.slice(0, 5).filter((x) => tk.has(x)).length
    if (h3 === 3) { n3++; portes.push({ h4, h5 }) }
    if (h3 >= 2) ge2++
    if (h5 === 5) plein5++
    if (h4 === 4) ge4++
    if (h5 >= 3) ge3++
  }
  const nb = idx.length
  const np = portes.length
  return {
    nb, np,
    p3: n3 / nb * 100, n3,
    ge2: ge2 / nb * 100,
    p5: plein5 / nb * 100, n5: plein5,
    ge4: ge4 / nb * 100,
    ge35: ge3 / nb * 100,
    moy: portes.length ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
  }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ 8 CHEVAUX  contre  5 SANS G1')
console.log('     ' + n + ' Quintés · ' + corpus[0].date + ' → ' + corpus[n - 1].date)
console.log('')
console.log('     8 chevaux : 3 G1 + 2 G2 + 1 G3 + 1 G4 + 1 G5   (le moteur)')
console.log('     5 chevaux :          2 G2 + 1 G3 + 1 G4 + 1 G5   (G1 retiré)')
console.log('')

const NIVEAUX = [
  ['TEST — JAMAIS VU', idxTest],
  ['TOUT LE CORPUS', idxAll],
  ['APPRENTISSAGE', idxApp],
]
const f = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(6))
const d = (a, b, bruit) => {
  const x = b - a
  return (Math.abs(x) <= bruit ? '   =  ' : (x > 0 ? '+' : '') + x.toFixed(1)).padStart(7)
}

for (const [lib, idx] of NIVEAUX) {
  const A = mesurer(idx, 'avecG1')
  const B = mesurer(idx, 'sansG1')
  const bruit = 100 / idx.length / 2
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ║  ' + lib + '   (' + A.nb + ' courses)')
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                         ① LE TRIO          ② LE QUATUOR      ③ LE QUINTE')
  console.log('  ' + ''.padEnd(26) + '3/3    ≥2/3  |  4/4    ≥3/4  |  5/5   ≥4/5   ≥3/5   moy')
  console.log('  ' + '-'.repeat(80))
  console.log('  ' + '8 chevaux (avec G1)'.padEnd(26)
    + f(A.p3) + f(A.ge2) + '  |' + f(A.c44 == null ? null : A.ge4) + f(A.ge35) + '  |'
    + f(A.p5) + f(A.ge4) + f(A.ge35) + A.moy.toFixed(2).padStart(6))
  console.log('  ' + '5 chevaux (sans G1)'.padEnd(26)
    + f(B.p3) + f(B.ge2) + '  |' + f(B.ge4) + f(B.ge35) + '  |'
    + f(B.p5) + f(B.ge4) + f(B.ge35) + B.moy.toFixed(2).padStart(6))
  console.log('  ' + 'Δ'.padEnd(26)
    + d(A.p3, B.p3, bruit) + d(A.ge2, B.ge2, bruit) + '  |'
    + d(A.ge4, B.ge4, bruit) + d(A.ge35, B.ge35, bruit) + '  |'
    + d(A.p5, B.p5, bruit) + d(A.ge4, B.ge4, bruit) + d(A.ge35, B.ge35, bruit)
    + ((B.moy - A.moy > 0 ? '+' : '') + (B.moy - A.moy).toFixed(2)).padStart(8))
  console.log('')
  console.log('     en COURSES :  porte 3/3 ' + A.n3 + ' → ' + B.n3
    + '   ·   5/5 ' + A.n5 + ' → ' + B.n5
    + '   ·   courses 5/5 après la porte ' + (A.c55 == null ? 0 : Math.round(A.c55 / 100 * A.np))
    + ' → ' + (B.c55 == null ? 0 : Math.round(B.c55 / 100 * B.np)))
  console.log('')
  if (lib === 'TEST — JAMAIS VU') {
    console.log('  ⭐ SUR LE TEST :')
    const perte = A.n3 - B.n3
    console.log('     ' + perte + ' ticket gagnant perdu sur ' + A.nb
      + ' quand on retire les 3 de G1  (' + perte + '/' + A.nb + ')')
    console.log('     5/5 : ' + A.n5 + ' → ' + B.n5 + '   (' + (B.n5 - A.n5 > 0 ? '+' : '') + (B.n5 - A.n5) + ')')
    console.log('')
    console.log('     ⚠ ' + A.nb + ' courses : 1 course = ' + (100 / A.nb).toFixed(1) + ' point.')
    console.log('')
  }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LA LECTURE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const A = mesurer(idxTest, 'avecG1')
const B = mesurer(idxTest, 'sansG1')
const pertePorte = A.n3 - B.n3
const perte5 = A.n5 - B.n5
console.log('  Sur le TEST, en retirant 3 chevaux sur ' + A.nb + ' courses :')
console.log('     la porte 3/3  : ' + A.p3.toFixed(1) + ' → ' + B.p3.toFixed(1)
  + '   (' + pertePorte + ' tickets perdus)')
console.log('     le 5/5         : ' + A.p5.toFixed(1) + ' → ' + B.p5.toFixed(1)
  + '   (' + (perte5 > 0 ? '+' : '') + perte5 + ' courses)')
console.log('')
console.log('  ⭐ Si le 5/5 ne bouge presque pas, G1 est du bruit.')
console.log('    S il s effondre, G1 est encore utile.')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ET POURTANT : que reste-t-il si on retire G1 ?
 *  un test.appel n'a pas de baseline à 5 chevaux dans la littérature.
 *  on peut comparer à un ticket de 5 chevaux tiré au hasard par la cote
 *  (les 5 meilleures cotes), pour savoir si les 5 « cachés » valent
 *  mieux que 5 favoris.
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ET LES 5 « CACHÉS » VIDENT-ILS LE TICKET ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const cinqFavoris = corpus.map((k) => Object.keys(k.cotes).map(Number)
  .filter((x) => k.cotes[x] > 0).sort((a, b) => k.cotes[a] - k.cotes[b]).slice(0, 5))
for (const [lib, idx] of [['TEST', idxTest], ['TOUT', idxAll]]) {
  const A = mesurer(idx, 'avecG1')
  const B = mesurer(idx, 'sansG1')
  const C = (() => {
    const portes = []; let n3 = 0; let n5 = 0; let ge2 = 0; let ge35 = 0
    for (const ki of idx) {
      const k = corpus[ki]
      const tk = new Set(cinqFavoris[ki])
      const h3 = k.arrivee.slice(0, 3).filter((x) => tk.has(x)).length
      const h5 = k.arrivee.slice(0, 5).filter((x) => tk.has(x)).length
      if (h3 === 3) { n3++; portes.push(h5) }
      if (h3 >= 2) ge2++
      if (h5 === 5) n5++
      if (h5 >= 3) ge35++
    }
    const nb = idx.length
    const np = portes.length
    return {
      p3: n3 / nb * 100, ge2: ge2 / nb * 100, p5: n5 / nb * 100,
      ge35: ge35 / nb * 100, moy: np ? portes.reduce((a, v) => a + v, 0) / np : 0,
    }
  })()
  console.log('  ' + lib + ' (' + idx.length + ' courses)')
  console.log('    ticket                       3/3     ≥2/3     5/5     ≥3/5   moyenne')
  console.log('    ' + '8 chevaux (le moteur)'.padEnd(26) + f(A.p3) + f(A.ge2) + f(A.p5) + f(A.ge35) + A.moy.toFixed(2).padStart(7))
  console.log('    ' + '5 sans G1 (2G2+G3+G4+G5)'.padEnd(26) + f(B.p3) + f(B.ge2) + f(B.p5) + f(B.ge35) + B.moy.toFixed(2).padStart(7))
  console.log('    ' + '5 meilleures cotes'.padEnd(26) + f(C.p3) + f(C.ge2) + f(C.p5) + f(C.ge35) + C.moy.toFixed(2).padStart(7))
  console.log('')
}
console.log('  ⚠ « 5 meilleures cotes » est la référence honnête : un ticket de')
console.log('    5 chevaux pris au hasard par le marché. Si les 5 « cachés » ne')
console.log('    font pas mieux que cela, retirer G1 ne coûte rien mais ne gagne rien.')
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  Rappel : ce test ne change AUCUNE règle. Il mesure seulement ce')
console.log('  que vaut G1. Les quotas 3-2-1-1-1 restent intacts.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')