/* =============================================================================
 * tools/pattern-couple.mjs — LE PATRON DU COUPLÉ (11/10/2026, demande utilisateur).
 * « De ce test on saura à quoi ressemble le couplé. » Deux vues, un passage :
 *  A) ce qui GAGNE : distribution des clés (fam_pair|rank_pair) des vrais
 *     1-2 / 1-3 / 2-3, et des trios COARSE (27 clés — dense, pas comme FULL).
 *  B) ce qui RAPPORTE : taux wins/starts des clés ASSISES aux rangs du marché
 *     (même définition que le labo), avec support.
 * Lecture seule, aucun artefact. Usage : node tools/pattern-couple.mjs
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'
import { famille } from './empreinte-v3.mjs'

const rangsDe = (partants) => {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c))
    .sort((a, b) => a.c - b.c)
  return { ordre, parRang: new Map(ordre.map((x, i) => [x.num, i + 1])) }
}
const famDe = (partants) => {
  const m = new Map()
  for (const p of partants) {
    const f = famille(Number(p.cote_pmu ?? NaN))
    if (f) m.set(p.num, f)
  }
  return m
}
const coarse = (f) => (f.startsWith('FAV') ? 'FAV' : f.startsWith('OUT') ? 'OUT' : 'TOC')

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
console.log('courses : ' + tout.length)

const win = { p12: new Map(), p13: new Map(), p23: new Map(), coarse: new Map() }
const slot = { p12: new Map(), p13: new Map(), p23: new Map(), coarse: new Map() }
/* wins CONDITIONNELS aux assises (même événement que starts, sinon le taux
 * dépasse 100% : les gagnants viennent de tous les rangs, pas des slots) */
const winSlot = { coarse: new Map() }
const bump = (map, k) => map.set(k, (map.get(k) || 0) + 1)

for (const c of tout) {
  const { ordre, parRang } = rangsDe(c.partants)
  if (ordre.length < 3) continue
  const fams = famDe(c.partants)
  const a = c.arrivee.slice(0, 3)
  if (a.some((n) => !fams.get(n) || parRang.get(n) == null)) continue
  // A) ce qui gagne
  bump(win.p12, fams.get(a[0]) + '-' + fams.get(a[1]) + '|' + parRang.get(a[0]) + '-' + parRang.get(a[1]))
  bump(win.p13, fams.get(a[0]) + '-' + fams.get(a[2]) + '|' + parRang.get(a[0]) + '-' + parRang.get(a[2]))
  bump(win.p23, fams.get(a[1]) + '-' + fams.get(a[2]) + '|' + parRang.get(a[1]) + '-' + parRang.get(a[2]))
  bump(win.coarse, [a[0], a[1], a[2]].map((n) => coarse(fams.get(n))).join('-'))
  // B) les clés assises aux rangs du marché
  const h = [ordre[0].num, ordre[1].num, ordre[2].num]
  if (h.some((n) => !fams.get(n))) continue
  const k12 = fams.get(h[0]) + '-' + fams.get(h[1]) + '|1-2'
  const k13 = fams.get(h[0]) + '-' + fams.get(h[2]) + '|1-3'
  const k23 = fams.get(h[1]) + '-' + fams.get(h[2]) + '|2-3'
  const kc = [h[0], h[1], h[2]].map((n) => coarse(fams.get(n))).join('-')
  bump(slot.p12, k12); bump(slot.p13, k13); bump(slot.p23, k23); bump(slot.coarse, kc)
  if (a[0] === h[0] && a[1] === h[1] && a[2] === h[2]) bump(winSlot.coarse, kc)
}

const top = (map, n = 12) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, v]) => k + '×' + v).join('  ')
console.log('')
console.log('A) CE QUI GAGNE [clé×fois]')
console.log('  1-2 : ' + top(win.p12))
console.log('  1-3 : ' + top(win.p13))
console.log('  2-3 : ' + top(win.p23))
console.log('  trio COARSE : ' + top(win.coarse, 27))
// taux : pour les clés les plus assises, wins = fois où l'assise a gagné
console.log('')
console.log('B) TAUX DES ASSISES (top assises par starts)')
for (const [nom, mp] of [['p12', slot.p12], ['p13', slot.p13], ['p23', slot.p23]]) {
  const tops = [...mp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  console.log('  ' + nom + ' : ' + tops.map(([k, s]) => {
    // wins = courses où cette clé assise = la clé gagnante : recompté via win[] quand les rangs sont 1-2/1-3/2-3
    const w = win[nom].get(k) || 0
    return k + ' ' + (w / Math.max(1, s) * 100).toFixed(1) + '%(' + w + '/' + s + ')'
  }).join('  '))
}
const topc = [...slot.coarse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
console.log('  coarse : ' + topc.map(([k, s]) => {
  const w = winSlot.coarse.get(k) || 0
  return k + ' ' + (w / Math.max(1, s) * 100).toFixed(1) + '%(' + w + '/' + s + ')'
}).join('  '))
console.log('')
