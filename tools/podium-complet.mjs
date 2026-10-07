/* ---------------------------------------------------------------
 * tools\podium-complet.mjs  —  ⭐ À PORTE FERMÉE, QUI COMPLÈTE ?
 *
 *   node tools\podium-complet.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *   Le moteur garde 3-2-1-1-1. Ce script mesure, il ne touche à rien.
 *
 * LE PROBLÈME QUOI RÈGLE
 *   comparer A et D sur toutes les courses mélange deux questions :
 *      ① qui fait le podium ?      (la PORTE)
 *      ② qui complète le Quinté ?  (le COMPLÉMENT)
 *   D gagne sur l'ensemble, mais il PERD quelques courses de podium.
 *   Mélanger les deux, on ne sait jamais lequel des deux effets on mesure.
 *
 * LA MÉTHODE : PORTE FERMÉE
 *   on ne garde QUE les courses où A réussit déjà le 3/3.
 *   Dans cet univers, la porte est acquise pour les DEUX tickets.
 *   Il ne reste qu'une question : à l'intérieur, qui apporte le 4e et le 5e ?
 *   Plus aucun effet de porte ne peut polluer le résultat.
 *
 *   c'est exactement « moteur de porte » contre « moteur de complément ».
 *
 * CE QUE CE SCRIPT DONNE
 *   ① A contre D, à porte fermée : 4/4 · 5/5 · ≥4/5 · moyenne
 *   ② les TRANSITIONS : 4/5 → 5/5, 3/5 → 5/5, et les pertes
 *   ③ le profil de G2[3] et de G4[1] : où se placent-ils vraiment ?
 *   ④ la STABILITÉ sur 4 tranches chronologiques
 *   ⑤ la confirmation sur le corpus 347 (sans presse, mais plus grand)
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')
const FF = path.join(RACINE, 'data', 'corpus', 'fusion.json')
const NB_TRANCHES = 4

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const QUOTA_A = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const QUOTA_D = { G1: 3, G2: 3, G3: 1, G4: 0, G5: 1 }

const corpus = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = corpus.length

const cands = corpus.map((k) => BLOCS.map((b, i) =>
  k.presse.filter((x) => { const r = k.pDe.get(x); return r >= b.min && r <= b.max })
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))

function ticket(ki, quota) {
  const nums = []
  const siege = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    cands[ki][i].slice(0, quota[BLOCS[i].id]).forEach((num, r) => {
      nums.push(num)
      siege.set(num, BLOCS[i].id + '[' + (r + 1) + ']')
    })
  }
  return { nums, siege }
}
const TA = corpus.map((k, ki) => ticket(ki, QUOTA_A))
const TD = corpus.map((k, ki) => ticket(ki, QUOTA_D))

const h = (k, s, n_) => k.arrivee.slice(0, n_).filter((x) => s.has(x)).length

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ À PORTE FERMÉE, QUI COMPLÈTE LE QUINTÉ ?')
console.log('     ' + n + ' Quintés avec presse · A = 3-2-1-1-1   D = 3-3-1-0-1')
console.log('')
console.log('  On ne garde QUE les courses où A réussit déjà le 3/3.')
console.log('  Dans cet univers la porte est acquise pour les deux tickets :')
console.log('  il ne reste que la question du 4e et du 5e.')
console.log('')

const univers = corpus.map((_, i) => i).filter((ki) => h(corpus[ki], new Set(TA[ki].nums), 3) === 3)
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① À PORTE FERMÉE — l univers des ' + univers.length + ' courses gagnantes par A')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

function complement(idx) {
  const r = { n: idx.length, p4: 0, p5: 0, ge45: 0, moy: 0, p3: 0 }
  let s = 0
  for (const ki of idx) {
    const k = corpus[ki]
    const set = new Set(TA[ki].nums)
    const h4 = h(k, set, 4)
    const h5 = h(k, set, 5)
    if (h4 === 4) r.p4++
    if (h5 === 5) r.p5++
    if (h5 >= 4) r.ge45++
    if (h(k, set, 3) === 3) r.p3++
    s += h5
  }
  r.p4 = r.p4 / idx.length * 100
  r.p5 = r.p5 / idx.length * 100
  r.ge45 = r.ge45 / idx.length * 100
  r.p3 = r.p3 / idx.length * 100
  r.moy = s / idx.length
  return r
}
const ca = complement(univers)
const cd = complement(univers)
/* D doit être calculé sur le MÊME univers, pas sur le sien */
const complD = (idx) => {
  const r = { p4: 0, p5: 0, ge45: 0, moy: 0 }
  let s = 0
  for (const ki of idx) {
    const k = corpus[ki]
    const set = new Set(TD[ki].nums)
    const h4 = h(k, set, 4)
    const h5 = h(k, set, 5)
    if (h4 === 4) r.p4++
    if (h5 === 5) r.p5++
    if (h5 >= 4) r.ge45++
    s += h5
  }
  return { p4: r.p4 / idx.length * 100, p5: r.p5 / idx.length * 100, ge45: r.ge45 / idx.length * 100, moy: s / idx.length }
}
const cD = complD(univers)

console.log('  La porte, pour vérifier qu elle est bien fermée pour D aussi :')
console.log('     A garde le 3/3 sur ' + ca.p3.toFixed(1) + ' % de cet univers')
console.log('     D garde le 3/3 sur ' + (univers.filter((ki) => h(corpus[ki], new Set(TD[ki].nums), 3) === 3).length / univers.length * 100).toFixed(1) + ' %')
console.log('')
console.log('                              ② LE QUATUOR      ③ LE QUINTÉ')
console.log('  univers                    4/4    ≥3/4  |  5/5   ≥4/5   ≥3/5   moyenne')
console.log('  ' + '-'.repeat(76))
console.log('  ' + 'A  (3-2-1-1-1)'.padEnd(26) + f(ca.p4) + f(ca.ge45) + '  |'
  + f(ca.p5) + f(ca.ge45) + f(ca.ge45) + ca.moy.toFixed(2).padStart(8))
console.log('  ' + 'D  (3-3-1-0-1)'.padEnd(26) + f(cD.p4) + f(cD.ge45) + '  |'
  + f(cD.p5) + f(cD.ge45) + f(cD.ge45) + cD.moy.toFixed(2).padStart(8))
console.log('  ' + 'Δ'.padEnd(26)
  + d(ca.p4, cD.p4) + d(ca.ge45, cD.ge45) + '  |'
  + d(ca.p5, cD.p5) + d(ca.ge45, cD.ge45) + d(ca.ge45, cD.ge45)
  + ((cD.moy - ca.moy > 0 ? '+' : '') + (cD.moy - ca.moy).toFixed(2)).padStart(8))
console.log('')
console.log('  en COURSES, sur ' + univers.length + ' :')
console.log('     4/4   : ' + Math.round(ca.p4 / 100 * univers.length) + ' → ' + Math.round(cD.p4 / 100 * univers.length))
console.log('     5/5   : ' + Math.round(ca.p5 / 100 * univers.length) + ' → ' + Math.round(cD.p5 / 100 * univers.length))
console.log('     ≥4/5  : ' + Math.round(ca.ge45 / 100 * univers.length) + ' → ' + Math.round(cD.ge45 / 100 * univers.length))
console.log('')
function f(v) { return v.toFixed(1).padStart(5) }
function d(a, b) { const x = b - a; return (Math.abs(x) <= 100 / univers.length / 2 ? '  =  ' : (x > 0 ? '+' : '') + x.toFixed(1)).padStart(5) }

/* ═══ ② les transitions ══════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LES TRANSITIONS — 4/5 → 5/5, c est ça qu on cherche')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const T = []
for (const ki of univers) {
  const k = corpus[ki]
  const ha = h(k, new Set(TA[ki].nums), 5)
  const hd = h(k, new Set(TD[ki].nums), 5)
  T.push({ ki, cle: k.cle, ha, hd, t: Math.floor(corpus.indexOf(k) / Math.ceil(n / NB_TRANCHES)) })
}
const groups = [
  ['4/5 → 5/5   le gain hunted', T.filter((x) => x.ha === 4 && x.hd === 5)],
  ['3/5 → 5/5   le saut', T.filter((x) => x.ha === 3 && x.hd === 5)],
  ['5/5 → 5/5   garde', T.filter((x) => x.ha === 5 && x.hd === 5)],
  ['5/5 → 4/5   perte', T.filter((x) => x.ha === 5 && x.hd === 4)],
  ['4/5 → 3/5   perte', T.filter((x) => x.ha === 4 && x.hd === 3)],
]
let sol = 0
for (const [lib, v] of groups) {
  if (!v.length) { console.log('  ' + lib.padEnd(24) + '   0'); continue }
  sol += v.length
  console.log('  ' + lib.padEnd(24) + String(v.length).padStart(3) + '   ' + v.map((x) => x.cle.slice(5, 10)).join(' '))
}
console.log('  ' + '-'.repeat(70))
const g = T.filter((x) => x.ha === 4 && x.hd === 5).length
const p = T.filter((x) => x.ha === 5 && x.hd < 5).length
console.log('  gains  ' + g + '   ·   pertes  ' + p + '   →   solde  ' + (g - p > 0 ? '+' : '') + (g - p))
console.log('')

/* ═══ ③ le profil des deux sièges ════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ OÙ SE PLACENT RÉELLEMENT G2[3] ET G4[1] ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const duel = {
  'G2[3] (dans D)': { n: 0, p: [0, 0, 0, 0, 0, 0], top3: 0, top5: 0, porte: 0, porteN: 0 },
  'G4[1] (dans A)': { n: 0, p: [0, 0, 0, 0, 0, 0], top3: 0, top5: 0, porte: 0, porteN: 0 },
}
const estDansUnivers = new Set(univers)
for (let ki = 0; ki < n; ki++) {
  const k = corpus[ki]
  const paires = [['G2[3] (dans D)', 'G2[3]', TD[ki].siege], ['G4[1] (dans A)', 'G4[1]', TA[ki].siege]]
  for (const [nom, cle, siege] of paires) {
    const found = [...siege.entries()].find(([, v]) => v === cle)
    if (!found) continue
    const d = duel[nom]
    d.n++
    const pl = k.arrivee.indexOf(found[0]) + 1
    d.p[Math.min(pl, 6) - 1]++
    if (pl >= 1 && pl <= 3) d.top3++
    if (pl >= 1 && pl <= 5) d.top5++
    /* à l'intérieur de l'univers "podium acquis", ce siège a-t-il만원 le podium ? */
    if (estDansUnivers.has(ki)) { d.porteN++; if (pl >= 1 && pl <= 3) d.porte++ }
  }
}
console.log('  siège              pris   1er   2e   3e   4e   5e   6e+   | podium  Top5   podium|univers')
console.log('  ' + '-'.repeat(94))
for (const s of ['G2[3] (dans D)', 'G4[1] (dans A)']) {
  const d = duel[s]
  console.log('  ' + s.padEnd(17) + String(d.n).padStart(5)
    + String(d.p[0]).padStart(6) + String(d.p[1]).padStart(5) + String(d.p[2]).padStart(5)
    + String(d.p[3]).padStart(5) + String(d.p[4]).padStart(5) + String(d.p[5]).padStart(5)
    + '   |' + (d.top3 / d.n * 100).toFixed(1).padStart(6) + '%' + (d.top5 / d.n * 100).toFixed(1).padStart(6) + '%'
    + (d.porteN ? (d.porte / d.porteN * 100).toFixed(1).padStart(10) + '%' : ''))
}
console.log('')
const g2 = duel['G2[3] (dans D)']
const g4 = duel['G4[1] (dans A)']
console.log('  ⭐ podium   G2[3] ' + (g2.top3 / g2.n * 100).toFixed(1) + ' %   contre   G4[1] ' + (g4.top3 / g4.n * 100).toFixed(1) + ' %')
console.log('    Top 5    G2[3] ' + (g2.top5 / g2.n * 100).toFixed(1) + ' %   contre   G4[1] ' + (g4.top5 / g4.n * 100).toFixed(1) + ' %')
console.log('    4e       G2[3] ' + g2.p[3] + ' fois      contre   G4[1] ' + g4.p[3] + ' fois')
console.log('    5e       G2[3] ' + g2.p[4] + ' fois      contre   G4[1] ' + g4.p[4] + ' fois')
console.log('')
console.log('    ⭐ LA FONCTION DE G2[3] :')
const tot23 = g2.p[0] + g2.p[1] + g2.p[2]
const tot45 = g2.p[3] + g2.p[4]
console.log('       sur ' + g2.n + ' prises, ' + tot23 + ' sur le podium, ' + tot45 + ' en 4e-5e, '
  + g2.p[5] + ' hors du Top 5.')
console.log('       ⇒ sa force est APRÈS le podium : ' + (tot45 > tot23 ? 'oui' : 'non') + '.')
console.log('')

/* ═══ ④ stabilité dans le temps ═══════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ STABLE DANS LE TEMPS ? — 4 tranches, univers fermé')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  tranche              n    5/5 : A → D        ≥4/5 : A → D        moyenne : A → D')
console.log('  ' + '-'.repeat(76))
const sens = []
for (let t = 0; t < NB_TRANCHES; t++) {
  const idx = univers.filter((ki) => T.find((x) => x.ki === ki).t === t)
  if (idx.length < 3) { console.log('  T' + (t + 1) + '   ' + String(idx.length).padStart(3) + '  — trop peu'); continue }
  const a = complement(idx)
  const d = complD(idx)
  const b = 100 / idx.length / 2
  const d5 = d.p5 - a.p5
  const d45 = d.ge45 - a.ge45
  const dm = d.moy - a.moy
  sens.push({ d5, d45, dm, b })
  console.log('  T' + (t + 1) + '  ' + corpus[idx[0]].date.slice(5) + '→' + corpus[idx[idx.length - 1]].date.slice(5)
    + '  ' + String(idx.length).padStart(3)
    + '   ' + a.p5.toFixed(1) + ' → ' + d.p5.toFixed(1) + sig(d5, b).padStart(3)
    + '   ' + a.ge45.toFixed(1) + ' → ' + d.ge45.toFixed(1) + sig(d45, b).padStart(3)
    + '   ' + a.moy.toFixed(2) + ' → ' + d.moy.toFixed(2) + sig(dm, 0.03).padStart(3))
}
console.log('')
if (sens.length) {
  for (const [lib, cle, seuil] of [['5/5', 'd5', 'b'], ['≥4/5', 'd45', 'b'], ['moyenne', 'dm', 0.03]]) {
    const s = sens.map((x) => sig(x[cle], seuil === 'b' ? x.b : seuil))
    console.log('     ' + lib.padEnd(8) + s.join('  ') + '   → '
      + sens.filter((x) => sig(x[cle], seuil === 'b' ? x.b : seuil) === '↑').length + '↑ / '
      + sens.filter((x) => sig(x[cle], seuil === 'b' ? x.b : seuil) === '↓').length + '↓')
  }
}
console.log('')
function sig(x, b) { return Math.abs(x) <= b ? '=' : x > 0 ? '↑' : '↓' }

/* ═══ ⑤ confirmation sur 347 ═════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ CONFIRMATION SUR LE CORPUS 347 (sans presse)')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const fusion = JSON.parse(fs.readFileSync(FF, 'utf8')).courses
  .map((k) => ({ ...k, o: (k.ordreCote || []).slice() }))
  .filter((k) => k.o.length >= 10 && (k.arrivee || []).length >= 5)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const candsF = fusion.map((k) => BLOCS.map((b, i) =>
  k.o.filter((x, r) => r + 1 >= b.min && r + 1 <= b.max)
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))
const tkF = (ki, quota) => {
  const s = new Set()
  const siege = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    candsF[ki][i].slice(0, quota[BLOCS[i].id]).forEach((num, r) => { s.add(num); siege.set(num, BLOCS[i].id + '[' + (r + 1) + ']') })
  }
  return { s, siege }
}
const TA_F = fusion.map((k, ki) => tkF(ki, QUOTA_A))
const TD_F = fusion.map((k, ki) => tkF(ki, QUOTA_D))
const hf = (k, s, n_) => k.arrivee.slice(0, n_).filter((x) => s.has(x)).length
const univF = fusion.map((_, i) => i).filter((ki) => hf(fusion[ki], TA_F[ki].s, 3) === 3)

const cc = (T2, idx) => {
  let p4 = 0; let p5 = 0; let ge45 = 0; let s = 0
  for (const ki of idx) {
    const k = fusion[ki]
    const h4 = hf(k, T2[ki].s, 4)
    const h5 = hf(k, T2[ki].s, 5)
    if (h4 === 4) p4++
    if (h5 === 5) p5++
    if (h5 >= 4) ge45++
    s += h5
  }
  return { p4: p4 / idx.length * 100, p5: p5 / idx.length * 100, ge45: ge45 / idx.length * 100, moy: s / idx.length }
}
const aF = cc(TA_F, univF)
const dF = cc(TD_F, univF)
console.log('  univers fermé sur 347 : ' + univF.length + ' courses où A réussit le 3/3')
console.log('')
console.log('                              ② LE QUATUOR      ③ LE QUINTÉ')
console.log('  ' + ''.padEnd(26) + '4/4    ≥4/5  |  5/5   ≥4/5   moyenne')
console.log('  ' + '-'.repeat(64))
console.log('  ' + 'A  (3-2-1-1-1)'.padEnd(26) + aF.p4.toFixed(1).padStart(5) + aF.ge45.toFixed(1).padStart(7) + '  |'
  + aF.p5.toFixed(1).padStart(5) + aF.ge45.toFixed(1).padStart(7) + aF.moy.toFixed(2).padStart(9))
console.log('  ' + 'D  (3-3-1-0-1)'.padEnd(26) + dF.p4.toFixed(1).padStart(5) + dF.ge45.toFixed(1).padStart(7) + '  |'
  + dF.p5.toFixed(1).padStart(5) + dF.ge45.toFixed(1).padStart(7) + dF.moy.toFixed(2).padStart(9))
console.log('  ' + 'Δ'.padEnd(26)
  + ((dF.p4 - aF.p4 > 0 ? '+' : '') + (dF.p4 - aF.p4).toFixed(1)).padStart(5)
  + ((dF.ge45 - aF.ge45 > 0 ? '+' : '') + (dF.ge45 - aF.ge45).toFixed(1)).padStart(7) + '  |'
  + ((dF.p5 - aF.p5 > 0 ? '+' : '') + (dF.p5 - aF.p5).toFixed(1)).padStart(5)
  + ((dF.ge45 - aF.ge45 > 0 ? '+' : '') + (dF.ge45 - aF.ge45).toFixed(1)).padStart(7)
  + ((dF.moy - aF.moy > 0 ? '+' : '') + (dF.moy - aF.moy).toFixed(2)).padStart(9))
console.log('')
const duelF = { 'G2[3] dans D': { n: 0, p: [0, 0, 0, 0, 0, 0] }, 'G4[1] dans A': { n: 0, p: [0, 0, 0, 0, 0, 0] } }
for (let ki = 0; ki < fusion.length; ki++) {
  const k = fusion[ki]
  for (const [nom, cle, sg] of [['G2[3] dans D', 'G2[3]', TD_F[ki].siege], ['G4[1] dans A', 'G4[1]', TA_F[ki].siege]]) {
    const found = [...sg.entries()].find(([, v]) => v === cle)
    if (!found) continue
    duelF[nom].n++
    duelF[nom].p[Math.min(k.arrivee.indexOf(found[0]) + 1, 6) - 1]++
  }
}
console.log('  le même duel sur 347 :')
console.log('  siège              pris   1er   2e   3e   4e   5e   6e+   | podium   Top5')
console.log('  ' + '-'.repeat(80))
for (const s of ['G2[3] dans D', 'G4[1] dans A']) {
  const d = duelF[s]
  const t3 = d.p[0] + d.p[1] + d.p[2]
  const t5 = t3 + d.p[3] + d.p[4]
  console.log('  ' + s.padEnd(17) + String(d.n).padStart(5)
    + String(d.p[0]).padStart(6) + String(d.p[1]).padStart(5) + String(d.p[2]).padStart(5)
    + String(d.p[3]).padStart(5) + String(d.p[4]).padStart(5) + String(d.p[5]).padStart(5)
    + '   |' + (t3 / d.n * 100).toFixed(1).padStart(6) + '%' + (t5 / d.n * 100).toFixed(1).padStart(6) + '%')
}
console.log('')
const G2F = duelF['G2[3] dans D']
const G4F = duelF['G4[1] dans A']
console.log('  ⭐ podium : ' + (G2F.p[0] + G2F.p[1] + G2F.p[2]) / G2F.n * 100 + ' % contre '
  + (G4F.p[0] + G4F.p[1] + G4F.p[2]) / G4F.n * 100 + ' %')
console.log('    Top 5  : ' + (G2F.p[0] + G2F.p[1] + G2F.p[2] + G2F.p[3] + G2F.p[4]) / G2F.n * 100 + ' % contre '
  + (G4F.p[0] + G4F.p[1] + G4F.p[2] + G4F.p[3] + G4F.p[4]) / G4F.n * 100 + ' %')
console.log('    4e     : ' + G2F.p[3] + ' contre ' + G4F.p[3] + '      5e : ' + G2F.p[4] + ' contre ' + G4F.p[4])
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Le corpus 347 n a pas de presse : « G2[3] » y est le 3e')
console.log('   rang de COTE dans le bloc, pas le 3e rang de PRESSE. Ce')
console.log('    n est pas le même siège. Le 347 confirme l idées générale')
console.log('    (un siège plus bas dans un bloc donne plus de 4e-5e),')
console.log('    il ne confirme pas le siège exact G2[3].')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')