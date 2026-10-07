/* ---------------------------------------------------------------
 * tools\seul-test-valide.mjs  —  ⭐ LE SEUL TEST QUI VAUT QUOI
 *
 *   node tools\seul-test-valide.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. Lecture seule. Aucun système n est modifié.
 *
 * ⚠⚠ POURQUOI LES MESURES PRÉCÉDENTES ÉTAIENT MANQUANTES
 *
 *   Sur le corpus 347, l ordre de référence EST la cote. Donc
 *   « les 8 premiers » = les 8 cotes les plus courtes.
 *   Mesurer « combien du Top 5 sont dans les 8 plus courtes »，
 *   c est une identité, pas un test : le marché doit y être bon,
 *   sinon on ne pourrait pas appeler ça un marché.
 *
 *   Et vos listes A/B sont exprimées en rangs de PRESSE.
 *   Le corpus 347 n a pas de presse. La comparaison y était donc
 *   invalide — elle comparait une hypothèse à une identité.
 *
 * LE SEUL TEST HONNÊTE
 *   sur les 94 courses QUI ONT LA PRESSE, comparer trois choses
 *   construites de la même façon :
 *
 *     ① le moteur actuel        3-2-1-1-1, blocs définis par la presse
 *     ② la liste A en rangs de presse   P1-P2-P3-P5-P6-P9-P12-P13
 *     ③ la liste B en rangs de presse   P1-P2-P4-P5-P6-P8-P12-P13
 *
 *   et en référence, le marché :
 *     ④ les 8 plus courtes cotes
 *
 *   Les quatre sont des listes de chevaux, construites avant la course,
 *   mesurées de la même façon. C est la seule comparaison honnête.
 *
 * ⚠ ET L AVERTISSEMENT DE TAILLE
 *   94 courses. Une course = 1,1 point. Le 5/5 le plus bas est à 8,5 %,
 *   soit 8 courses. Rien de ce qui suit n est une preuve, c est un ordre
 *   de grandeur. Pour une règle, il faudra 300 courses avec presse.
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

const base = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const cut = Math.round(n * 0.75)
const idxAll = base.map((_, i) => i)
const idxApp = idxAll.slice(0, cut)
const idxTest = idxAll.slice(cut)

const numsBloc = (k, i) => k.presse.filter((x) => { const r = k.pDe.get(x); return r >= BLOCS[i].min && r <= BLOCS[i].max })
const parCote = (k, i) => numsBloc(k, i).slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999))

/* ① le moteur actuel */
const moteur = (k) => BLOCS.flatMap((b, i) => parCote(k, i).slice(0, b.quota))
/* ② ③ une liste de rangs de PRESSE */
const parRangs = (k, rangs) => rangs.map((r) => k.presse[r - 1]).filter((x) => x != null)
/* ④ le marché */
const marche = (k) => Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0)
  .sort((a, b) => k.cotes[a] - k.cotes[b]).slice(0, 8)

const CANDIDATS = [
  { nom: '① moteur 3-2-1-1-1 (le actuel)', f: moteur, note: 'blocs par la presse, remplissage par la cote' },
  { nom: '② liste A en rangs de presse', f: (k) => parRangs(k, [1, 2, 3, 5, 6, 9, 12, 13]), note: 'P1-P2-P3-P5-P6-P9-P12-P13' },
  { nom: '③ liste B en rangs de presse', f: (k) => parRangs(k, [1, 2, 4, 5, 6, 8, 12, 13]), note: 'P1-P2-P4-P5-P6-P8-P12-P13' },
  { nom: '④ les 8 plus courtes cotes', f: marche, note: 'la copie du marché' },
]

function mesurer(idx, f) {
  const r = { c5: 0, c4: 0, c3: 0, c2: 0, p3: 0, ge2: 0, s5: 0, che: 0 }
  for (const ki of idx) {
    const k = base[ki]
    const nums = f(k)
    r.che += nums.length
    const c = k.arrivee.slice(0, 5).filter((x) => nums.includes(x)).length
    const h3 = k.arrivee.slice(0, 3).filter((x) => nums.includes(x)).length
    if (c === 5) r.c5++
    if (c === 4) r.c4++
    if (c === 3) r.c3++
    if (c === 2) r.c2++
    if (h3 === 3) r.p3++
    if (h3 >= 2) r.ge2++
    r.s5 += c
  }
  const t = idx.length
  return {
    c5: r.c5 / t * 100, c4: r.c4 / t * 100, c3: r.c3 / t * 100, c2: r.c2 / t * 100,
    ge45: (r.c5 + r.c4) / t * 100, moy: r.s5 / t,
    p3: r.p3 / t * 100, ge2: r.ge2 / t * 100,
    nb5: r.c5, che: r.che / t,
  }
}

console.log('')
console.log('  ⭐⭐ LE SEUL TEST HONNÊTE — 94 courses AVEC PRESSE')
console.log('     ' + base[0].date + ' → ' + base[n - 1].date)
console.log('')
console.log('  Les quatre listes sont construites AVANT la course, avec des')
console.log('  rangs de presse, et mesurées de la même façon.')
console.log('')

for (const [lib, idx] of [
  ['TOUT LE CORPUS  (' + n + ')', idxAll],
  ['APPRENTISSAGE  (' + cut + ')', idxApp],
  ['TEST JAMAIS VU  (' + (n - cut) + ')', idxTest],
]) {
  console.log('  ══════════════════════════════════════════════════════════════════════')
  console.log('  ║  ' + lib)
  console.log('  ══════════════════════════════════════════════════════════════════════')
  console.log('')
  console.log('                            ① LE PODIUM          ② LE TOP 5')
  console.log('  liste                       3/3    ≥2/3  |  5/5    4/5    3/5   ≥4/5  moyenne  chevaux')
  console.log('  ' + '-'.repeat(92))
  for (const c of CANDIDATS) {
    const m = mesurer(idx, c.f)
    console.log('  ' + c.nom.padEnd(26)
      + m.p3.toFixed(1).padStart(6) + m.ge2.toFixed(1).padStart(8) + '  |'
      + m.c5.toFixed(1).padStart(6) + m.c4.toFixed(1).padStart(7) + m.c3.toFixed(1).padStart(7)
      + m.ge45.toFixed(1).padStart(7) + m.moy.toFixed(2).padStart(9) + m.che.toFixed(1).padStart(9))
  }
  console.log('')
  const lA = mesurer(idx, CANDIDATS[1].f)
  const lB = mesurer(idx, CANDIDATS[2].f)
  const lM = mesurer(idx, CANDIDATS[0].f)
  console.log('  en courses : A a ' + lA.nb5 + ' Quintés, B en a ' + lB.nb5
    + ', le moteur ' + lM.nb5 + ', le marché ' + mesurer(idx, CANDIDATS[3].f).nb5)
  console.log('  ⚠ ' + idx.length + ' courses : une course = ' + (100 / idx.length).toFixed(1) + ' point.')
  console.log('')
}

console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  LA LECTURE HONNÊTE')
  console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
const M = mesurer(idxAll, moteur)
const A = mesurer(idxAll, CANDIDATS[1].f)
const B = mesurer(idxAll, CANDIDATS[2].f)
const K = mesurer(idxAll, CANDIDATS[3].f)
console.log('  5/5 sur ' + n + ' courses (une course = 1,1 point) :')
console.log('')
console.log('     moteur ' + M.c5.toFixed(1) + ' %  (' + M.nb5 + ')')
console.log('     liste A ' + A.c5.toFixed(1) + ' %  (' + A.nb5 + ')')
console.log('     liste B ' + B.c5.toFixed(1) + ' %  (' + B.nb5 + ')')
console.log('     marché ' + K.c5.toFixed(1) + ' %  (' + K.nb5 + ')')
console.log('')
console.log('  couverture moyenne : moteur ' + M.moy.toFixed(2) + ' · A ' + A.moy.toFixed(2)
  + ' · B ' + B.moy.toFixed(2) + ' · marché ' + K.moy.toFixed(2))
console.log('')
console.log('  podium 3/3 : moteur ' + M.p3.toFixed(1) + ' % · A ' + A.p3.toFixed(1)
  + ' % · B ' + B.p3.toFixed(1) + ' % · marché ' + K.p3.toFixed(1) + ' %')
console.log('')

const mieuxA = A.nb5 > M.nb5 && A.moy > M.moy
const mieuxB = B.nb5 > M.nb5 && B.moy > M.moy
if (mieuxA) console.log('  ⭐ liste A bat le moteur, sur 5/5 ET sur la moyenne.')
else if (mieuxB) console.log('  ⭐ liste B bat le moteur, sur 5/5 ET sur la moyenne.')
else console.log('  ⭐ Aucune des deux listes ne bat le moteur.')
console.log('')
console.log('  ⚠ MÊME SI L UNE DES DEUX GAGNE :')
console.log('     · ' + n + ' courses, un écart de 2 Quintés n est pas une preuve.')
console.log('     · le corpus 347, sans presse, ne peut PAS confirmer : vos rangs')
console.log('       y seraient des rangs de cote, pas de presse.')
console.log('     · le 5/5 plafonne à environ 8 % avec 8 chevaux sur ces courses.')
console.log('       L objectif de 75 % est hors d atteinte à ce nombre de chevaux,')
console.log('       quel que soit le classement utilisé.')
console.log('')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('  Pour trancher, il faut 300 courses AVEC presse.')
console.log('  La presse n est archivable que par pronostics-turf.info, qui ne garde')
console.log('  que la course du jour. C est une collecte quotidienne, pas un rattrapage.')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('')