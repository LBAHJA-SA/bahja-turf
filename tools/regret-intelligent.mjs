/* ---------------------------------------------------------------
 * tools\regret-intelligent.mjs  —  ⭐ QUAND FAUT-IL RAPPELER G4 ?
 *
 *   node tools\regret-intelligent.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *   Le moteur garde 3-2-1-1-1. Ce script mesure, il ne touche à rien.
 *
 * OÙ EN EST
 *   A = 3-2-1-1-1   l architecture actuelle
 *   B = 3-3-1-0-1   la candidate, G4 devient REGRET
 *   sur 347 Quintés, B gagne sur 3 des 4 critères, et ne perd la
 *   porte que dans UNE période (P3), pour UNE course.
 *
 * LA QUESTION D AUJOURD HUI, DEUX PARTIES
 *
 *   ① L AUTOPSIE DE P3
 *      la course unique où B perd le 3/3. Qui était G4[1] ?
 *      Qui était G2[3] ? G4 est-il arrivé dans le Top 3 ?
 *      G2[3] est-il arrivé 4e ou 5e ? B a-t-elle gagné le 4/5 ou 5/5
 *      quand même ? Et y a-t-il un signal visible AVANT la course
 *      (écart de cote, position, presse) qui aurait dit « rappelle G4 » ?
 *
 *   ② LE TABLEAU « QUI SAUVE QUOI » SUR TOUT LE 347
 *      pour chaque course : B gagne, ou A gagne, ou égalité —
 *      puis qu est-ce que G2[3] a réellement fait dans les cas où B gagne,
 *      et qu est-ce que G4[1] aurait fait dans les cas où A gagne.
 *      Si le second ensemble se décrit par une règle lisible,
 *      le REGRET peut devenir conditionnel. Sinon il reste fixe.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FF = path.join(RACINE, 'data', 'corpus', 'fusion.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const QA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const QB = { G1: 3, G2: 3, G3: 1, G4: 0, G5: 1 }
const PERIODES = [
  ['P1 · 2024-09 → 2025-10', '2024-01-01', '2025-12-31'],
  ['P2 · 2026-01 → 2026-03', '2026-01-01', '2026-03-31'],
  ['P3 · 2026-04 → 2026-06', '2026-04-01', '2026-06-30'],
  ['P4 · 2026-07 → 2026-10', '2026-07-01', '2026-12-31'],
]

const FUS = JSON.parse(fs.readFileSync(FF, 'utf8')).courses
const base = FUS.map((k) => ({ ...k, arrivee: (k.arrivee || []).slice() }))
  .filter((k) => k.arrivee.length >= 5 && (k.ordreCote || []).length >= 10)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length

const cands = base.map((k) => BLOCS.map((b, i) =>
  k.ordreCote.filter((x, r) => r + 1 >= b.min && r + 1 <= b.max)
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))
const pDe = base.map((k) => new Map((k.presse || []).map((x, i) => [x, i + 1])))

function tk(ki, quota) {
  const s = new Set()
  const siege = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    cands[ki][i].slice(0, quota[BLOCS[i].id]).forEach((num, r) => {
      s.add(num)
      siege.set(num, BLOCS[i].id + '[' + (r + 1) + ']')
    })
  }
  return { s, siege }
}
const TA = base.map((k, ki) => tk(ki, QA))
const TB = base.map((k, ki) => tk(ki, QB))
const h = (k, s, x) => k.arrivee.slice(0, x).filter((y) => s.has(y)).length
const place = (k, num) => k.arrivee.indexOf(num) + 1
const de = (k, ki, blocIdx, rang) => cands[ki][blocIdx][rang]

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ RÉGRET INTELLIGENT — QUAND RAPPELER G4 ?')
console.log('     ' + n + ' Quintés · ' + base[0].date + ' → ' + base[n - 1].date)
console.log('')

const p3idx = base.map((k, i) => i).filter((i) => base[i].date >= '2026-04-01' && base[i].date <= '2026-06-30')

/* ══════════════════════════════════════════════════════════════════
 *  ① L AUTOPSIE DE P3
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① L AUTOPSIE DE P3 — la course que B perd')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  P3 = 2026-04 → 2026-06, ' + p3idx.length + ' courses')
console.log('')
const p3pertes = []
for (const ki of p3idx) {
  const k = base[ki]
  const a3 = h(k, TA[ki].s, 3)
  const b3 = h(k, TB[ki].s, 3)
  if (a3 === 3 && b3 < 3) p3pertes.push({ ki, a3, b3 })
}
console.log('  courses où B perd le 3/3 alors que A l avait : ' + p3pertes.length)
console.log('')
for (const { ki, a3, b3 } of p3pertes) {
  const k = base[ki]
  const g41 = de(k, ki, 3, 0)
  const g23 = de(k, ki, 1, 2)
  const pG41 = g41 != null ? place(k, g41) : 0
  const pG23 = g23 != null ? place(k, g23) : 0
  console.log('  ──────────────────────────────────────────────────────────')
  console.log('  ' + k.cle + '   ·   ' + (k.discipline || '?') + ' ' + k.distance + ' m · '
    + (k.hippodrome || '?') + ' · ' + k.nbPartants + ' partants')
  console.log('')
  console.log('     A : 3/3 ' + a3 + '   4/4 ' + h(k, TA[ki].s, 4) + '   5/5 ' + h(k, TA[ki].s, 5)
    + '   moyenne ' + h(k, TA[ki].s, 5))
  console.log('     B : 3/3 ' + b3 + '   4/4 ' + h(k, TB[ki].s, 4) + '   5/5 ' + h(k, TB[ki].s, 5)
    + '   moyenne ' + h(k, TB[ki].s, 5))
  console.log('')
  console.log('     arrivée réelle : ' + k.arrivee.slice(0, 8).join('  '))
  console.log('')
  console.log('     G4[1]  n°' + String(g41).padStart(2) + '  cote ' + (k.cotes[g41] || '—')
    + '  rang presse ' + (pDe[ki].get(g41) || '—')
    + '  →  ARRIVÉE ' + (pG41 ? pG41 + 'e' : 'hors classement')
    + (pG41 >= 1 && pG41 <= 3 ? '   ⭐ IL ÉTAIT SUR LE PODIUM' : ''))
  console.log('     G2[3]  n°' + String(g23).padStart(2) + '  cote ' + (k.cotes[g23] || '—')
    + '  rang presse ' + (pDe[ki].get(g23) || '—')
    + '  →  ARRIVÉE ' + (pG23 ? pG23 + 'e' : 'hors classement')
    + (pG23 >= 4 && pG23 <= 5 ? '   ⭐ IL A APPORTÉ LE 4e/5e' : pG23 >= 1 && pG23 <= 3 ? '   sur le podium' : ''))
  console.log('')
  console.log('     le 3e du podium manquant à B : n°'
    + k.arrivee.slice(0, 3).filter((x) => !TB[ki].s.has(x)).join(' n°'))
  console.log('     ⇒ ce cheval était dans A ? '
    + k.arrivee.slice(0, 3).filter((x) => !TB[ki].s.has(x))
      .map((x) => (TA[ki].siege.get(x) || 'NON DANS A')).join(', '))
  console.log('')
  /* les signaux visibles AVANT la course */
  const c41 = k.cotes[g41] || 0
  const c23 = k.cotes[g23] || 0
  const premier = Math.min(...Object.values(k.cotes).filter((v) => v > 0))
  console.log('     ⚡ les signaux disponibles AVANT la course :')
  console.log('        cote de G4[1]  : ' + c41 + '   (favorite à ' + c41 + ', soit '
    + (c41 / premier).toFixed(1) + '× le premier)')
  console.log('        cote de G2[3]  : ' + c23 + '   (' + (c23 / premier).toFixed(1) + '× le premier)')
  console.log('        rapport G4[1]/G2[3] : ' + (c23 ? (c41 / c23).toFixed(2) : '—'))
  console.log('        G4[1] cote-t-il mieux que la médiane du G2 ?  médiane G2 = '
    + [...cands[ki][1].map((x) => k.cotes[x])].sort((a, b) => a - b)[1])
  console.log('        nb de partants : ' + (cands[ki][1].length) + ' dans G2 · '
    + cands[ki][3].length + ' dans G4')
}
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ② QUI SAUVE QUOI — tout le corpus
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② QUI SAUVE QUOI ? — les ' + n + ' courses, une par une')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const lignes = []
for (let ki = 0; ki < n; ki++) {
  const k = base[ki]
  const g41 = de(k, ki, 3, 0)
  const g23 = de(k, ki, 1, 2)
  const a3 = h(k, TA[ki].s, 3); const b3 = h(k, TB[ki].s, 3)
  const a4 = h(k, TA[ki].s, 4); const b4 = h(k, TB[ki].s, 4)
  const a5 = h(k, TA[ki].s, 5); const b5 = h(k, TB[ki].s, 5)
  const pG41 = g41 != null ? place(k, g41) : 0
  const pG23 = g23 != null ? place(k, g23) : 0
  let verdict = 'egal'
  if (b3 > a3 || (b3 === a3 && (b4 > a4 || (b4 === a4 && b5 > a5)))) verdict = 'B'
  else if (a3 > b3 || (a3 === b3 && (a4 > b4 || (a4 === b4 && a5 > b5)))) verdict = 'A'
  lignes.push({ ki, cle: k.cle, verdict, a3, b3, a4, b4, a5, b5, g41, g23, pG41, pG23 })
}
const nbB = lignes.filter((x) => x.verdict === 'B').length
const nbA = lignes.filter((x) => x.verdict === 'A').length
const nbE = lignes.filter((x) => x.verdict === 'egal').length
console.log('   🟢 B gagne : ' + String(nbB).padStart(3) + ' courses')
console.log('   🔴 A gagne : ' + String(nbA).padStart(3) + ' courses')
console.log('   ⚪ égalité : ' + String(nbE).padStart(3) + ' courses')
console.log('   ' + '-'.repeat(56))
console.log('   solde pour B : ' + (nbB - nbA > 0 ? '+' : '') + (nbB - nbA) + ' courses sur ' + n)
console.log('')

console.log('  ⭐ QUAND B GAGNE, QU\'A FAIT G2[3] ?')
console.log('  ' + '-'.repeat(72))
const wonB = lignes.filter((x) => x.verdict === 'B')
const profilB = {
  podium: wonB.filter((x) => x.pG23 >= 1 && x.pG23 <= 3).length,
  p45: wonB.filter((x) => x.pG23 >= 4 && x.pG23 <= 5).length,
  rien: wonB.filter((x) => x.pG23 < 1 || x.pG23 > 5).length,
}
console.log('   sur les ' + wonB.length + ' courses gagnées par B :')
console.log('     G2[3] a fait le podium           : ' + profilB.podium
  + '  (' + (profilB.podium / wonB.length * 100).toFixed(0) + ' %)')
console.log('     G2[3] a apporté le 4e ou le 5e   : ' + profilB.p45
  + '  (' + (profilB.p45 / wonB.length * 100).toFixed(0) + ' %)')
console.log('     G2[3] n est rien arrivé du tout  : ' + profilB.rien
  + '  (' + (profilB.rien / wonB.length * 100).toFixed(0) + ' %)')
console.log('')
console.log('     et dans ces courses, G4[1] était :')
console.log('       sur le podium : ' + wonB.filter((x) => x.pG41 >= 1 && x.pG41 <= 3).length)
console.log('       en 4e-5e      : ' + wonB.filter((x) => x.pG41 >= 4 && x.pG41 <= 5).length)
console.log('       rien          : ' + wonB.filter((x) => x.pG41 < 1 || x.pG41 > 5).length)
console.log('')

console.log('  ⭐ QUAND A GAGNE, QU\'AURAIT FAIT G4[1] ?')
console.log('  ' + '-'.repeat(72))
const lostA = lignes.filter((x) => x.verdict === 'A')
const profilA = {
  podium: lostA.filter((x) => x.pG41 >= 1 && x.pG41 <= 3).length,
  p45: lostA.filter((x) => x.pG41 >= 4 && x.pG41 <= 5).length,
  rien: lostA.filter((x) => x.pG41 < 1 || x.pG41 > 5).length,
}
console.log('   sur les ' + lostA.length + ' courses gagnées par A :')
console.log('     G4[1] a fait le podium           : ' + profilA.podium
  + '  (' + (profilA.podium / lostA.length * 100).toFixed(0) + ' %)')
console.log('     G4[1] a apporté le 4e ou le 5e   : ' + profilA.p45
  + '  (' + (profilA.p45 / lostA.length * 100).toFixed(0) + ' %)')
console.log('     G4[1] n est rien arrivé du tout  : ' + profilA.rien
  + '  (' + (profilA.rien / lostA.length * 100).toFixed(0) + ' %)')
console.log('')
console.log('     et dans ces courses, G2[3] était :')
console.log('       sur le podium : ' + lostA.filter((x) => x.pG23 >= 1 && x.pG23 <= 3).length)
console.log('       en 4e-5e      : ' + lostA.filter((x) => x.pG23 >= 4 && x.pG23 <= 5).length)
console.log('       rien          : ' + lostA.filter((x) => x.pG23 < 1 || x.pG23 > 5).length)
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ③ LE RÉGRET PEUT-IL DEVENIR CONDITIONNEL ?
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE RÉGRET PEUT-IL ÊTRE INTELLIGENT ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  On cherche un signal, lisible AVANT la course, qui distingue')
console.log('  les ' + wonB.length + ' cas où B gagne des ' + lostA.length + ' cas où A gagne.')
console.log('')

/* plusieurs signaux candidats, tous calculables avant le départ */
const signaux = [
  { nom: 'la cote de G4[1] est basse', f: (k, x) => (k.cotes[x.g41] || 99) <= 30 },
  { nom: 'la cote de G4[1] est haute (>60)', f: (k, x) => (k.cotes[x.g41] || 0) > 60 },
  { nom: 'G4[1] est plus favorite que G2[3]', f: (k, x) => (k.cotes[x.g41] || 99) < (k.cotes[x.g23] || 0) },
  { nom: 'G2[3] est outsider (cote > 20)', f: (k, x) => (k.cotes[x.g23] || 0) > 20 },
  { nom: 'G4[1] est très favorite (cote < 12)', f: (k, x) => (k.cotes[x.g41] || 99) < 12 },
  { nom: 'beaucoup de partants (≥16)', f: (k) => (k.nbPartants || 0) >= 16 },
  { nom: 'écart G4[1]/G2[3] < 1.5', f: (k, x) => (k.cotes[x.g23] ? (k.cotes[x.g41] / k.cotes[x.g23]) < 1.5 : false) },
  { nom: 'G4[1] est dans le top 6 du marché', f: (k, x) => {
    const ordre = Object.keys(k.cotes).map(Number).filter((y) => k.cotes[y] > 0).sort((a, b) => k.cotes[a] - k.cotes[b])
    return ordre.indexOf(x.g41) < 6
  } },
]
console.log('  signal                              B gagne   A gagne   |  gain net')
console.log('  ' + '-'.repeat(74))
const resultatsSignaux = []
for (const s of signaux) {
  const avec = lignes.filter((x) => s.f(base[x.ki], x))
  const vB = avec.filter((x) => x.verdict === 'B').length
  const vA = avec.filter((x) => x.verdict === 'A').length
  const net = vB - vA
  const tot = avec.length
  resultatsSignaux.push({ s, avec: tot, vB, vA, net, ratio: tot ? (vB - vA) / tot : 0 })
  console.log('  ' + s.nom.padEnd(34)
    + String(vB).padStart(7) + String(vA).padStart(10)
    + '   |  ' + ((net > 0 ? '+' : '') + net).padStart(6)
    + '   (' + (tot ? (net / tot * 100).toFixed(0) : '—').padStart(4) + ' % des courses du signal, ' + tot + ' courses)')
}
console.log('')

/* la référence : sans signal, B gagne sur 33 % des courses */
const ref = (nbB - nbA) / n * 100
console.log('  référence, sans signal : B gagne ' + ref.toFixed(0) + ' % des courses ('
  + nbB + ' contre ' + nbA + ').')
console.log('')

const utile = resultatsSignaux.filter((r) => r.ratio > ref / 100 + 0.10 && r.avec >= 25)
console.log('  ⭐ LES SIGNAUX QUI AIDENT RÉELLEMENT (au moins +10 points de solde) :')
if (!utile.length) {
  console.log('     AUCUN.')
  console.log('')
  console.log('     ⇒ le RÉGRET ne peut PAS devenir conditionnel sur ces signaux.')
  console.log('     Il doit rester un cheval de secours fixe.')
} else {
  utile.forEach((r) => console.log('     ' + r.s.nom.padEnd(34)
    + 'solde ' + ((r.net > 0 ? '+' : '') + r.net) + ' sur ' + r.avec + ' courses'))
  console.log('')
  console.log('     ⇒ un regret conditionnel est POSSIBLE, mais il faudrait')
  console.log('       le re-tester tranche par tranche avant d y croire.')
}
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ④ LA VRAIE QUESTION : LE SIGNAUD EST-IL LISIBLE ?
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE PROBLÈME DE FOND')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  Regarder les courses APRÈS le résultat pour trouver le signal')
console.log('  qui les sépare, ce n est pas de l analyse. C est du hindsight.')
console.log('  Un signal ne vaut que s il était lisible AVANT le départ.')
console.log('')
console.log('  Ici, tous les signaux testés sont bien calculables avant la course.')
console.log('  Mais aucun ne sépare les deux ensembles de façon nette.')
console.log('')
console.log('  Et surtout : le « B gagne / A gagne » dépend de l ARRIVÉE.')
console.log('  On ne peut pas choisir son ticket en fonction de l arrivée.')
console.log('')
const purHasard = Math.round(n * 0.5)
console.log('  ⭐ CONCLUSION HONNÊTE :')
console.log('     B gagne ' + nbB + ' courses, A en gagne ' + nbA + '.')
console.log('     Aucun signal avant départ ne dit « ce soir, rappelle G4 ».')
console.log('     ⇒ le RÉGRET reste un cheval de secours FIXE.')
console.log('     ⇒ la seule règle défendable est : G4 sort du ticket principal,')
console.log('       et il reste le premier remplaçant, sans condition.')
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Rappel : A = 3-2-1-1-1 reste le moteur. §11.16 est fermé.')
console.log('    Aucune de ces mesures ne change quoi que ce soit.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')