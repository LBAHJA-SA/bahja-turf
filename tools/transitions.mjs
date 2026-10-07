/* ---------------------------------------------------------------
 * tools\transitions.mjs  —  ⭐ QUELLE TRANSITION, ET POURQUOI
 *
 *   node tools\transitions.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *
 * A = tout par la cote (l'état actuel)
 * B = A, sauf qu'on ÉCARTE P7 de G2
 *
 * Les deux tickets ne peuvent différer que d'UN cheval : P7 sort, P8 entre.
 * Toute la différence de résultat vient donc de là, et rien d'autre.
 *
 * On regarde course par course ce qui s'est réellement passé :
 *
 *   · A = 3/5 et B = 4/5   →  on a GAGNÉ un rang
 *   · A = 4/5 et B = 5/5   →  on a GAGNÉ le Quinté
 *   · A = 4/5 et B = 3/5   →  on a PERDU un rang
 *   · A = 5/5 et B = 4/5   →  on a PERDU le Quinté
 *
 * Et la question décisive : **chaque gain vient-il bien de P8 qui entre
 * dans le Top 5 ?** Si oui, le mécanisme est réel. Si les gains viennent
 * de courses où P8 n'était pas arrivé, alors B n'a rien/fonts par hasard.
 *
 * Et le tout : est-ce que les gains sont répartis dans le temps, ou
 * concentrés sur une seule période ?
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
    return { ...k, pDe }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)
const parCote = (k, i, echappe) => {
  const nums = numsDuBloc(k, i)
  let out = echappe == null ? nums : nums.filter((x) => k.pDe.get(x) !== echappe)
  return out.sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999))
}
const ticket = (k, echappe) => BLOCS.flatMap((b, i) => parCote(k, i, echappe).slice(0, b.quota)).filter(Boolean)
const P = (k, r) => k.presse.find((x) => k.pDe.get(x) === r)

const hits = (k, tk) => k.top5.filter((x) => tk.includes(x)).length

/* ══════════════════════════════════════════════════════════════════════ */
const lignes = []
for (let i = 0; i < n; i++) {
  const k = base[i]
  const ta = ticket(k, null)
  const tb = ticket(k, 7)
  const sa = new Set(ta)
  const sb = new Set(tb)
  const entres = tb.filter((x) => !sa.has(x))
  const sortis = ta.filter((x) => !sb.has(x))
  const p7 = P(k, 7)
  const p8 = P(k, 8)
  const ha = hits(k, ta)
  const hb = hits(k, tb)
  lignes.push({
    i, cle: k.cle, date: k.date, train: i < COUPURE,
    ha, hb, d: hb - ha,
    identique: entres.length === 0 && sortis.length === 0,
    p7, p8,
    echappe: sortis.includes(p7),
    entre: entres.includes(p8),
    p7Arrive: k.top5.includes(p7),
    p8Arrive: k.top5.includes(p8),
    top5: k.top5,
  })
}

const changees = lignes.filter((l) => !l.identique)
console.log('')
console.log('  ⭐⭐ LES TRANSITIONS — A (par la cote) contre B (on écarte P7)')
console.log(`     ${n} Quintés · ${changees.length} courses où le ticket change réellement`)
console.log('')

/* ═════════════════ ① le mécanisme : la substitution ═════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LE MÉCANISME — qu est-ce qui change, exactement')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  courses où P7 sort et P8 entre : ' + changees.filter((l) => l.echappe && l.entre).length + ' / ' + changees.length)
const autres = changees.filter((l) => !(l.echappe && l.entre))
console.log('')
console.log('  ⚠⚠ LE MÉCANISME RÉEL : B ne veut PAS dire « on prend P8 ».')
console.log('     B veut dire « P7 ne sera JAMAIS choisi dans G2 ». Le remplissage')
console.log('     reste par la cote, donc quand P7 sort, c est le SUIVANT par cote qui')
console.log('     entre — et ce n est pas toujours P8.')
console.log('')
const paires = new Map()
changees.forEach((l) => {
  const k = base[l.i]
  const entrant = (function () {
    const ta = new Set(ticket(k, null))
    const tb = new Set(ticket(k, 7))
    const e = ticket(k, 7).find((x) => !ta.has(x))
    return e == null ? '—' : 'P' + k.pDe.get(e)
  })()
  const sorti = (function () {
    const ta = new Set(ticket(k, null))
    const tb = new Set(ticket(k, 7))
    const s = ticket(k, null).find((x) => !tb.has(x))
    return s == null ? '—' : 'P' + k.pDe.get(s)
  })()
  const cle2 = sorti + ' → ' + entrant
  if (!paires.has(cle2)) paires.set(cle2, { nb: 0, gain: 0, perte: 0, entrantArrive: 0 })
  const e = paires.get(cle2)
  e.nb++
  if (l.d > 0) e.gain++
  if (l.d < 0) e.perte++
  if (l.entre && l.p8Arrive) e.entrantArrive++
})
console.log('  substitution      courses   gains   pertes   dont P8 arrivé (gain)')
console.log('  ' + '-'.repeat(66))
for (const [cle, v] of [...paires.entries()].sort((a, b) => b[1].nb - a[1].nb)) {
  console.log('  ' + cle.padEnd(16) + String(v.nb).padStart(7) + String(v.gain).padStart(8) + String(v.perte).padStart(9)
    + String(v.entrantArrive).padStart(21))
}
console.log('')
if (autres.length) {
  console.log('  ' + autres.length + ' course(s) où ce n est PAS P7→P8 — le reste est P7→P6.')
  console.log('')
}
console.log('')
const p7Gagne = changees.filter((l) => l.echappe && l.p7Arrive)
const p8Gagne = changees.filter((l) => l.echappe && l.p8Arrive)
console.log('  P7 était arrivé     dans ' + String(p7Gagne.length).padStart(3) + ' courses  → B les a perdus')
console.log('  P8 était arrivé     dans ' + String(p8Gagne.length).padStart(3) + ' courses  → B les a gagnés')
console.log('')

/* ═════════════════ ② les transitions ═══════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LES TRANSITIONS, course par course')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  transition      courses   P7 arrivé   P8 arrivé   → B gagne grâce à')
console.log('  ' + '-'.repeat(78))
const trans = [
  ['A 3/5 → B 4/5', (l) => l.ha === 3 && l.hb === 4],
  ['A 4/5 → B 5/5', (l) => l.ha === 4 && l.hb === 5],
  ['A 3/5 → B 5/5', (l) => l.ha === 3 && l.hb === 5],
  ['A 4/5 → B 3/5', (l) => l.ha === 4 && l.hb === 3],
  ['A 5/5 → B 4/5', (l) => l.ha === 5 && l.hb === 4],
  ['A 5/5 → B 3/5', (l) => l.ha === 5 && l.hb === 3],
]
let gainsN = 0
let pertesN = 0
for (const [lib, f] of trans) {
  const v = changees.filter(f)
  if (!v.length) { console.log('  ' + lib.padEnd(16) + '     0'); continue }
  const g = v.filter((l) => l.p8Arrive).length
  const p = v.filter((l) => l.p7Arrive).length
  const net = v.filter((l) => l.d > 0).length
  const perte = v.filter((l) => l.d < 0).length
  if (net > 0) gainsN += net
  if (perte > 0) pertesN += perte
  console.log('  ' + lib.padEnd(16) + String(v.length).padStart(7) + String(p).padStart(12) + String(g).padStart(12)
    + '   → ' + (net > 0 ? 'P8 était bien arrivé (' + g + '/' + net + ')' : perte ? 'perte' : ''))
}
console.log('  ' + '-'.repeat(78))
console.log('  gains nets : ' + gainsN + '   ·   pertes nettes : ' + pertesN + '   →   solde : ' + (gainsN - pertesN > 0 ? '+' : '') + (gainsN - pertesN))
console.log('')

/* ═════════════ ③ le point qui décide de tout ══════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE TEST DÉCISIF — le gain vient-il de P8, ou du hasard ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const ameliorations = changees.filter((l) => l.d > 0)
const degradations = changees.filter((l) => l.d < 0)
console.log('  Une amélioration EXIGE que P8 soit arrivé ET que P7 ne l\'était pas.')
console.log('  Sinon B a juste échangé un faux positif pour un autre.')
console.log('')
const propres = ameliorations.filter((l) => l.p8Arrive && !l.p7Arrive)
console.log('  améliorations totales                     : ' + ameliorations.length)
console.log('  … dont P8 arrivé ET P7 NON arrivé (propres): ' + propres.length
  + '   (' + (ameliorations.length ? (propres.length / ameliorations.length * 100).toFixed(0) : 0) + ' %)')
console.log('  … sales (P7 arrivé aussi, ou P8 pas arrivé): ' + (ameliorations.length - propres.length))
console.log('')
const salesGains = degradations.filter((l) => l.p7Arrive && !l.p8Arrive)
console.log('  dégradations totales                      : ' + degradations.length)
console.log('  … dont P7 arrivé ET P8 NON arrivé (honnêtes): ' + salesGains.length
  + '   (' + (degradations.length ? (salesGains.length / degradations.length * 100).toFixed(0) : 0) + ' %)')
console.log('')
console.log('  ⭐ proportion de « vraies » parmi les gains : '
  + (ameliorations.length ? (propres.length / ameliorations.length * 100).toFixed(0) + ' %' : '—')
  + '   |   parmi les pertes : '
  + (degradations.length ? (salesGains.length / degradations.length * 100).toFixed(0) + ' %' : '—'))
console.log('')

/* ═════════════════ ④ les gains dans le temps ═══════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ OÙ SONT LES GAINS ? — 4 tranches chronologiques')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const NB = 4
const taille = Math.ceil(n / NB)
console.log('  tranche                   B-A moyen   gains   pertes   sold   |  les 5/5 : A → B')
console.log('  ' + '-'.repeat(80))
const solds = []
for (let t = 0; t < NB; t++) {
  const idx = base.map((_, i) => i).slice(t * taille, Math.min((t + 1) * taille, n))
  const sous = lignes.filter((l) => idx.includes(l.i) && !l.identique)
  if (!sous.length) continue
  const d = sous.reduce((s, l) => s + l.d, 0) / sous.length
  const g = sous.filter((l) => l.d > 0).length
  const p = sous.filter((l) => l.d < 0).length
  const a5 = sous.filter((l) => l.ha === 5).length
  const b5 = sous.filter((l) => l.hb === 5).length
  solds.push(g - p)
  console.log('  ' + (base[idx[0]].date + '→' + base[idx[idx.length - 1]].date).padEnd(14) + String(idx.length).padStart(2) + ' c.'
    + ((d > 0 ? '+' : '') + d.toFixed(2)).padStart(12) + String(g).padStart(8) + String(p).padStart(9)
    + String(g - p).padStart(7) + '   |   ' + a5 + ' → ' + b5
    + (b5 > a5 ? '  (+' + (b5 - a5) + ')' : b5 < a5 ? '  (-' + (a5 - b5) + ')' : ''))
}
console.log('')
const posT = solds.filter((x) => x > 0).length
console.log('  ⭐ tranches à solde positif : ' + posT + ' / ' + solds.length)
console.log(posT >= 3 ? '  ⇒ les gains sont RÉPARTIS dans le temps : signal réel.'
  : posT <= 1 ? '  ⇒ les gains sont CONCENTRÉS : fluctuation.'
    : '  ⇒ mitigé : à confirmer, PAS à appliquer.')
console.log('')

/* ═════════════════ ⑤ le détail des gains ═══════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LE DÉTAIL DES 5/5 GAGNÉS')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const cinq = changees.filter((l) => l.ha === 4 && l.hb === 5)
if (!cinq.length) console.log('  (aucun 4/5 → 5/5)')
cinq.forEach((l) => {
  console.log('  ' + l.cle.padEnd(20) + 'A 4/5 → B 5/5    P8 (' + l.p8 + ') est arrivé : '
    + (l.p8Arrive ? 'OUI' : 'NON') + '   P7 (' + l.p7 + ') : ' + (l.p7Arrive ? 'arrivé aussi' : 'pas arrivé'))
  console.log('  ' + ''.padEnd(20) + 'top5 réel : ' + l.top5.join(' '))
})
console.log('')
const cinqPerdus = changees.filter((l) => l.ha === 5 && l.hb === 4)
if (!cinqPerdus.length) console.log('  ✅ aucun 5/5 perdu')
else {
  console.log('  ❌ 5/5 perdus : ' + cinqPerdus.length)
  cinqPerdus.forEach((l) => {
    console.log('  ' + l.cle.padEnd(20) + 'A 5/5 → B 4/5    P7 (' + l.p7 + ') est arrivé : '
      + (l.p7Arrive ? 'OUI — c est lui qu on a perdu' : 'NON'))
    console.log('  ' + ''.padEnd(20) + 'top5 réel : ' + l.top5.join(' '))
  })
}
console.log('')
