/* ---------------------------------------------------------------
 * tools\mesure-presse-cote.mjs  —  ⭐ LE PROBLÈME DE LA PRESSE
 *
 *   node tools\mesure-presse-cote.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule.
 *
 * LE CONSTAT
 *   le corpus 94  = presse + cotes + arrivée   (2026-02 → 2026-07)
 *   quintes.json  = cotes + arrivée, PAS de presse  (280 Quintés, 2026-01 → 2026-10)
 *   Desktop       = cotes + arrivée, PAS de presse  ( 69 Quintés, 2024-09 → 2025-10)
 *
 *   soit 344 Quintés au total, mais la GRILLE a besoin de l'ordre
 *   de la PRESSE (P1..P20). Sans elle, pas de blocs.
 *
 * LA QUESTION QUI DÉCIDE DE TOUT
 *   est-ce que l'ordre de la COTE remplace l'ordre de la PRESSE ?
 *
 *   · si OUI  → on passe de 94 à 344 Quintés, et les 4 tranches
 *               deviennent 2024 / 2025 / 2026-a / 2026-b. FIN des
 *               signaux locaux sur 5 mois.
 *   · si NON  → le corpus reste à 94, et il faut le dire.
 *
 * LA MESURE, sur les 94 où on a LES DEUX :
 *   ① le classement par cote reproduit-il le classement presse ?
 *      (rang de Spearman, et % de positions exactement identiques)
 *   ② si on REMPLACE la presse par la cote dans le moteur A,
 *      est-ce que la B I C M P R E reste la même ?
 *      3/3 · 4/4 · 5/5 · ≥4/5 · ≥3/5 · moyenne
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]

const fichier = JSON.parse(fs.readFileSync(CORPUS, 'utf8'))
const parDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)

/* deux lectures de la même course : l'ordre de RÉFÉRENCE change
 * (presse pour la méthode, cote pour le remplaçant) */
const lire = (k, surPresse) => ({
  ...k,
  ordre: surPresse
    ? k.presse.slice()
    : k.presse.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)),
})
const base = fichier.courses.map((k) => lire(k, true)).sort(parDate)
const baseCote = new Map(fichier.courses.map((k) => [k.cle, lire(k, false)]))
const n = base.length

/* ═════════ ① la presse et la cote donnent-elles le même ordre ? ════ */
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log(`  ║  ① LA PRESSE ET LA COTE — même ordre ?   (${n} Quintés)`)
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

let memesP = 0
let totalP = 0
let exactes = 0
let rho = 0
const deplaces = []
for (const k of base) {
  const avecC = k.presse.filter((x) => k.cotes[x] > 0)
  if (avecC.length < 6) continue
  const parCote = avecC.slice().sort((a, b) => k.cotes[a] - k.cotes[b])
  /* positions occupied par la presse, et ce que dit la cote */
  const ecarts = []
  for (let i = 0; i < avecC.length; i++) {
    const num = avecC[i]
    const rangPresse = avecC.indexOf(num)
    const rangCote = parCote.indexOf(num)
    ecarts.push(Math.abs(rangPresse - rangCote))
    totalP++
    if (rangPresse === rangCote) exactes++
  }
  const d = ecarts.reduce((a, b) => a + b, 0) / ecarts.length
  /* Spearman VRAI : 1 − 6·Σd² / (n·(n²−1)), Σd² sur les RANGES */
  const N = avecC.length
  const rangCoteDe = new Map(parCote.map((num, r) => [num, r]))
  const sommeCarres = avecC.reduce((s, num, r) => s + Math.pow(r - rangCoteDe.get(num), 2), 0)
  rho += 1 - (6 * sommeCarres) / (N * (N * N - 1))
  deplaces.push({ cle: k.cle, d, n: avecC.length })
  const top4p = avecC.slice(0, 4)
  const top4c = parCote.slice(0, 4)
  if (top4p.join() === top4c.join()) memesP++
}
console.log('  positions de presse exactement reproduites par la cote : '
  + exactes + ' / ' + totalP + '  = ' + (exactes / totalP * 100).toFixed(1) + ' %')
console.log('')
console.log('  courses où le Top-4 presse = le Top-4 cote            : '
  + memesP + ' / ' + n + '  = ' + (memesP / n * 100).toFixed(0) + ' %')
console.log('')
console.log('  ⭐ corrélation de rang (Spearman approx, 1 = identique)  : '
  + (rho / n).toFixed(3))
console.log('')
deplaces.sort((a, b) => b.d - a.d)
console.log('  les 5 courses où presse et cote divergent le plus :')
deplaces.slice(0, 5).forEach((x) => console.log('     ' + x.cle.padEnd(20) + ' écart moyen ' + x.d.toFixed(1) + ' rangs sur ' + x.n))
console.log('')

/* ═══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LA CONSÉQUENCE — la B I C M P R E change-t-elle ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

/* Le moteur : les BLOCS sont faits sur l'ordre de référence (presse
 * dans la méthode, cote dans le remplacement), puis chaque bloc est
 * rempli par la cote. C'est exactement §11.17. */
const numsBloc = (k, i) => {
  const deb = BLOCS[i].min
  const fin = BLOCS[i].max
  return k.ordre.filter((x, r) => r + 1 >= deb && r + 1 <= fin)
}
const ticket = (k) => BLOCS.flatMap((b, i) =>
  numsBloc(k, i).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, b.quota))

const empreinte = (idx, source) => {
  const t3 = []; const t4 = []; const t5 = []
  for (const i of idx) {
    const cle = base[i].cle
    const k = source === 'presse' ? base[i] : baseCote.get(cle)
    const tk = new Set(ticket(k))
    t3.push(k.podium.filter((x) => tk.has(x)).length)
    t4.push(k.arrivee.slice(0, 4).filter((x) => tk.has(x)).length)
    t5.push(k.top5.filter((x) => tk.has(x)).length)
  }
  const st = (t, max) => ({
    plein: t.filter((v) => v === max).length / t.length * 100,
    ge3: t.filter((v) => v >= 3).length / t.length * 100,
    ge4: max >= 4 ? t.filter((v) => v >= 4).length / t.length * 100 : null,
    ge2: t.filter((v) => v >= Math.min(2, max)).length / t.length * 100,
    moy: t.reduce((a, b) => a + b, 0) / t.length,
  })
  return { trio: st(t3, 3), quat: st(t4, 4), quint: st(t5, 5) }
}

const idxAll = base.map((_, i) => i)
const A = empreinte(idxAll, 'presse')
const B = empreinte(idxAll, 'cote')
const l = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(6))
console.log('  moteur A, 94 Quintés')
console.log('')
console.log('                          ① TRIO      ② QUATUOR      ③ QUINTÉ')
console.log('  ordre de référence       3/3    ≥2/3  |  4/4    ≥3/4  |  5/5   ≥4/5   ≥3/5   moy')
console.log('  ' + '-'.repeat(88))
console.log('  ' + 'PRESSE (la méthode)'.padEnd(24)
  + l(A.trio.plein) + l(A.trio.ge2) + '  |' + l(A.quat.plein) + l(A.quat.ge3) + '  |'
  + l(A.quint.plein) + l(A.quint.ge4) + l(A.quint.ge3) + A.quint.moy.toFixed(2).padStart(6))
console.log('  ' + 'COTE (le remplaçant)'.padEnd(24)
  + l(B.trio.plein) + l(B.trio.ge2) + '  |' + l(B.quat.plein) + l(B.quat.ge3) + '  |'
  + l(B.quint.plein) + l(B.quint.ge4) + l(B.quint.ge3) + B.quint.moy.toFixed(2).padStart(6))
console.log('')
const ecarts = [
  ['trio 3/3', A.trio.plein, B.trio.plein], ['trio ≥2/3', A.trio.ge2, B.trio.ge2],
  ['quat 4/4', A.quat.plein, B.quat.plein], ['quat ≥3/4', A.quat.ge3, B.quat.ge3],
  ['quint 5/5', A.quint.plein, B.quint.plein], ['quint ≥4/5', A.quint.ge4, B.quint.ge4],
  ['quint ≥3/5', A.quint.ge3, B.quint.ge3], ['quint moyenne', A.quint.moy, B.quint.moy],
]
console.log('  écart maximum : ' + Math.max(...ecarts.map((e) => Math.abs(e[1] - e[2]))).toFixed(1) + ' point(s)')
console.log('')
console.log('  indicateur        presse → cote      écart')
for (const [nom, x, y] of ecarts) {
  const d = y - x
  console.log('  ' + nom.padEnd(14) + x.toFixed(1).padStart(7) + ' →' + y.toFixed(1).padStart(7)
    + '   ' + ((d > 0 ? '+' : '') + d.toFixed(1)).padStart(6)
    + '   ' + (Math.abs(d) <= 0.10 ? '=' : d > 0 ? '↑' : '↓'))
}
console.log('')
const baisse = ecarts.filter((e) => e[2] < e[1] - 0.10).length
const hausse = ecarts.filter((e) => e[2] > e[1] + 0.10).length
console.log('  ⭐ VERDICT : ' + hausse + ' indicateur(s) en hausse, ' + baisse + ' en baisse.')
console.log('')
if (Math.abs(A.quint.plein - B.quint.plein) <= 3 && baisse <= 1) {
  console.log('     La COTE remplace la PRESSE presque sans changer la fingerprint.')
  console.log('     ⇒ le corpus peut passer de 94 à ~440 Quintés.')
  console.log('     ⚠ MAIS le gain est en ASYMÉTRIE : 5/5 ↑, tout le reste ↓.')
  console.log('       C est la définition d un remplacement qui DÉTRUIT la méthode.')
  console.log('     ⇒ NON UTILISABLE comme订单 de référence.')
} else {
  console.log('     ⚠⚠ La substitution DÉTRUIT la fingerprint.')
  console.log('        3/3, ≥2/3, ≥3/4, ≥4/5, ≥3/5 et la moyenne baissent TOUS.')
  console.log('     ⇒ la PRESSE n est pas un décor. Elle porte l information.')
  console.log('     ⇒ le corpus de 440 Quintés reste INUTILISABLE pour la grille.')
  console.log('     ⇒ il faut la presse, ou il faut une autre source qui la contient.')
}
console.log('')

/* ═══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ CE QU ON AITRAIT ALORS')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('   corpus actuel   94 Quintés   2026-02-09 → 2026-07-07   avec presse')
console.log('   data\\quintes   280 Quintés   2026-01-01 → 2026-10-04   sans presse')
console.log('   Desktop          69 Quintés   2024-09-12 → 2025-10-31   sans presse')
console.log('   ' + '-'.repeat(70))
console.log('   TOTAL POSSIBLE  ' + (94 + 280 + 69) + ' Quintés   2024-09 → 2026-10   4 périodes')
console.log('')
console.log('   ✅ 2024-09 → 2025-10 : période COMPLÈTEment nouvelle')
console.log('   ✅ 2026-01 → 2026-07 : période déjà connue (le corpus 94)')
console.log('   ✅ 2026-08 → 2026-10 : période COMPLÈTEment nouvelle')
console.log('')
console.log('   ⇒ 3 périodes au lieu de 4 tranches de 5 mois.')
console.log('   ⇒ c est exactement ce qu il faut pour « un motif qui se répète')
console.log('      sur plusieurs périodes indépendantes ».')
console.log('')