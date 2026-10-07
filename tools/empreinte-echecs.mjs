/* ---------------------------------------------------------------
 * tools\empreinte-echecs.mjs  —  ⭐⭐⭐ LA SIGNATURE DE L'ÉCHEC
 *
 *   node tools\empreinte-echecs.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *   Moteur de référence : A = tout rempli par la cote (l'état actuel).
 *
 * LA QUESTION, une fois pour toutes :
 *
 *   quand le moteur rate le 4/4 ou le 5/5, QUEL CHEVAL MANQUE,
 *   DE QUEL GROUPE, et à QUELLE PLACE DE PRESSE ?
 *
 * Et surtout : est-ce qu'on l'a raté parce qu'on a mal choisi
 * (notre faute), ou parce qu'on ne pouvait pas le prendre
 * (le quota du bloc ne suffit pas) ?
 *
 * Ces deux causes n'appellent PAS la même correction. C'est tout l'objet
 * de ce tableau.
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
const NOMS = BLOCS.map((b) => b.id)

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
const ticketA = (k) => BLOCS.flatMap((b, i) => numsDuBloc(k, i).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, b.quota))
const rangBloc = (k, num) => numsDuBloc(k, blocDe(k, num)).sort((a, b) => k.pDe.get(a) - k.pDe.get(b)).indexOf(num) + 1

/* ══════════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐⭐ LA SIGNATURE DE L ÉCHEC — moteur A (tout par la cote), quotas 3-2-1-1-1')
console.log(`     ${n} Quintés`)
console.log('')

/* ═══════════ ① où vont les arrivants, et les prend-on ? ═══════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① CHAQUE GROUPE : exposition et capture')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  bloc   quota   top 3    top 4    top 5   |  attrapé/3  attrapé/4  attrapé/5')
console.log('  ' + '-'.repeat(78))
const expo = NOMS.map(() => ({ t3: 0, t4: 0, t5: 0, c3: 0, c4: 0, c5: 0 }))
for (const k of base) {
  const tk = new Set(ticketA(k))
  for (let i = 0; i < 5; i++) {
    const bi = blocDe(k, k.top5[i])
    if (bi < 0) continue
    const p = tk.has(k.top5[i])
    if (i < 3) { expo[bi].t3++; if (p) expo[bi].c3++ }
    expo[bi].t4++; if (p) expo[bi].c4++
    expo[bi].t5++; if (p) expo[bi].c5++
  }
}
BLOCS.forEach((b, i) => {
  const e = expo[i]
  const r = (a, c) => (a ? (c / a * 100).toFixed(0).padStart(8) + ' %' : '       —')
  console.log('  ' + b.id.padEnd(6) + String(b.quota).padStart(5) + String(e.t3).padStart(9) + String(e.t4).padStart(9)
    + String(e.t5).padStart(9) + '  |' + r(e.t3, e.c3) + r(e.t4, e.c4) + r(e.t5, e.c5))
})
const T = (sel) => expo.reduce((s, e) => s + sel(e), 0)
const C = (sel) => expo.reduce((s, e) => s + sel(e), 0)
console.log('  ' + '-'.repeat(78))
console.log('  ' + 'TOTAL'.padEnd(6) + ''.padStart(5) + String(T((e) => e.t3)).padStart(9) + String(T((e) => e.t4)).padStart(9)
  + String(T((e) => e.t5)).padStart(9) + '  |')
console.log('')

/* ═══════ ② LA SIGNATURE : les manquants, selon le niveau atteint ══════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LA SIGNATURE — les chevaux manquants, par niveau atteint')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const niveaux = [5, 4, 3, 2, 1, 0]
const parNiveau = {}
for (const h of niveaux) parNiveau[h] = { nb: 0, manques: [], atteint: [0, 0, 0, 0, 0, 0] }

for (const k of base) {
  const tk = new Set(ticketA(k))
  const pris = k.top5.filter((x) => tk.has(x)).length
  const manquants = k.top5.filter((x) => !tk.has(x)).map((x) => ({
    num: x, bloc: BLOCS[blocDe(k, x)].id, rangBloc: rangBloc(k, x), p: k.pDe.get(x), cote: k.cotes[x] || 999,
  }))
  parNiveau[pris].nb++
  parNiveau[pris].manques.push(manquants)
  parNiveau[pris].atteint[pris]++
}

console.log('  niveau   courses   manquants   G1   G2   G3   G4   G5  |  rang de PRESSE des manquants')
console.log('  ' + '-'.repeat(94))
for (const h of niveaux) {
  const d = parNiveau[h]
  if (!d.nb) continue
  const tot = d.manques.reduce((s, m) => s + m.length, 0)
  const parBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  d.manques.forEach((ms) => ms.forEach((m) => parBloc[m.bloc]++))
  const rangs = d.manques.flat().map((m) => m.p).sort((a, b) => a - b)
  const med = rangs.length ? rangs[Math.floor(rangs.length / 2)] : 0
  console.log('  ' + String(h + '/5').padEnd(9) + String(d.nb).padStart(6) + String(tot).padStart(12)
    + NOMS.map((x) => (parBloc[x] ? String(parBloc[x]).padStart(5) : '    ·')).join('')
    + '  |  médian P' + String(med).padEnd(3) + ' min P' + String(rangs[0] || '-').padEnd(4) + ' max P' + (rangs[rangs.length - 1] || '-'))
}
console.log('')

/* ═════════ ③ la faute à nous, ou le quota ? ════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ DEUX CAUSES DIFFÉRENTES — ne pas les confondre')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
let notreFaute = 0
let quotaInsuffisant = 0
let details = { choisi: 0, quota: 0 }
for (const h of niveaux) {
  for (const ms of parNiveau[h].manques) {
    const parBloc = {}
    ms.forEach((m) => { parBloc[m.bloc] = (parBloc[m.bloc] || 0) + 1 })
    for (const [id, cnt] of Object.entries(parBloc)) {
      const q = BLOCS.find((b) => b.id === id).quota
      if (cnt > q) { quotaInsuffisant++; details.quota += cnt - q } else { notreFaute++; details.choisi += cnt }
    }
  }
}
console.log('  Manquants dans un bloc où le quota SUFFISAIT  (on aurait pu les prendre) : '
  + notreFaute + ' groupes-manquants   → ' + details.choisi + ' chevaux')
console.log('  Manquants dans un bloc où le quota NE SUFFISAIT PAS (structurellement)     : '
  + quotaInsuffisant + ' groupes-manquants   → ' + details.quota + ' chevaux')
console.log('')
console.log('  ⭐ si la première ligne est grosse, le problème est la CHOIX.')
console.log('    si c’est la seconde, le problème est la FORME de 3-2-1-1-1.')
console.log('')

/* ═══════ ④ le LE MANQUANT UNIQUE : le cas le plus instructif ═════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE CHEVAL UNIQUE QUI MANQUE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  situation            courses   le manquant est…')
console.log('  ' + '-'.repeat(74))
const situations = [
  ['4/4 raté — il en manque UN', (ms) => ms.length === 1],
  ['5/5 raté — il en manque UN', (ms) => ms.length === 1],
  ['3/5 — il en manque DEUX', (ms) => ms.length === 2],
  ['2/5 ou moins', (ms) => ms.length >= 3],
]
for (const [libre, filtre] of situations) {
  const vus = []
  for (const h of niveaux) for (const ms of parNiveau[h].manques) if (filtre(ms)) vus.push(ms)
  if (!vus.length) { console.log('  ' + libre.padEnd(24) + '   0'); continue }
  const parBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  vus.forEach((ms) => ms.forEach((m) => parBloc[m.bloc]++))
  const rangBloc = {}
  vus.forEach((ms) => ms.forEach((m) => { rangBloc[`${m.bloc}[${m.rangBloc}]`] = (rangBloc[`${m.bloc}[${m.rangBloc}]`] || 0) + 1 }))
  const tot = vus.reduce((s, ms) => s + ms.length, 0)
  const dom = Object.entries(parBloc).sort((a, b) => b[1] - a[1])[0]
  console.log('  ' + libre.padEnd(24) + String(vus.length).padStart(7) + '   '
    + NOMS.map((x) => (parBloc[x] ? `${x} ${parBloc[x]}`.padStart(6) : '     ·')).join('')
    + '   → dominant : ' + dom[0] + ' (' + (dom[1] / tot * 100).toFixed(0) + ' %)')
  const rg = Object.entries(rangBloc).sort((a, b) => b[1] - a[1]).slice(0, 4)
  console.log('  ' + ''.padEnd(24) + ''.padStart(7) + '   rang DANS le bloc : '
    + rg.map(([c, v]) => c + ' ×' + v).join('   '))
}
console.log('')

/* ═════════ ⑤ le raté unique, par bloc et par rang dans le bloc ═══════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ POUR CHACUN DES 5 BLOCS : le manque unique, et sa place dans le bloc')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  bloc   le manque est-il 1er du bloc ?   2e ?   3e ?   4e ?   |   verdict')
console.log('  ' + '-'.repeat(80))
BLOCS.forEach((b, bi) => {
  const rang = { 1: 0, 2: 0, 3: 0, 4: 0 }
  let tot = 0
  for (const h of niveaux) {
    for (const ms of parNiveau[h].manques) {
      if (ms.length !== 1) continue
      const m = ms[0]
      if (m.bloc !== b.id) continue
      tot++
      if (rang[m.rangBloc]) rang[m.rangBloc]++
    }
  }
  if (!tot) { console.log('  ' + b.id.padEnd(6) + ' (jamais le manquant unique)'); return }
  const parts = [1, 2, 3, 4].map((r) => String(rang[r] || 0).padStart(6))
  const dominante = [1, 2, 3, 4].reduce((a, b) => (rang[b] > rang[a] ? b : a), 1)
  console.log('  ' + b.id.padEnd(6) + parts.join('  ') + '   |   ' + tot + ' fois   → surtout le ' + dominante + (['er', 'e', 'e', 'e'][dominante - 1]))
})
console.log('')
console.log('  (rangs 3 et 4 n existent que pour G1 et G2)')
console.log('')
