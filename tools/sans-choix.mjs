/* =============================================================================
 * tools/sans-choix.mjs — SUPPRIMER LE CHOIX LE PLUS CHER (20/10/2026)
 *
 * Mesure acquise : jeter un cheval de G1 coûte 36,5 % (il arrive une fois sur
 * trois), jeter dans G2 coûte 26,0 %, dans G4 18,9 %.
 *
 * Donc la seule façon de PAYER MOINS sans ajouter un cheval :
 *
 *      on prend les 4 de G1  (plus aucun choix là où il coûte le plus)
 *      on reprend le siège en G2 (3 → 2)   →  total inchangé : 8 chevaux
 *
 *   3-3-1-1-0  →  4-2-1-1-0
 *
 * On compare les deux sur les 96 Quintés à presse réelle : podium entier,
 * quinté entier, ≥4, les deux moitiés, et un bootstrap apparié.
 *
 *   node tools\sans-choix.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const BRUT = []
for (const q of TOUT) {
  const c = q.cotes
  if (!c || Object.keys(c).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(c).map(Number)
  if (nums.some((n) => !(c[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => c[n] > 1)
  if (syn.length < 10) continue
  BRUT.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: c[n] }])) })
}
const REC = BRUT.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))
const C = BRUT.map((c, i) => {
  const grille = buildGrid(c.syn, c.nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  return { c, grille, cl, stats: computeStats(REC.filter((_, k) => k !== i)), arr: c.q.arrivee }
})

function jouer(c, quotas) {
  const g2 = { groupes: c.grille.groupes.map((g, k) => ({ ...g, quota: Math.min(quotas[k], g.cases.length) })) }
  return remplirGrille(g2, c.cl, c.c.q.discipline, c.c.cotes, c.stats).ticket
}
function noter(l, quotas) {
  let p = 0, q = 0, q4 = 0, ch = 0
  for (const k of l) {
    const t = jouer(k, quotas)
    const s = new Set(t)
    ch += t.length
    if (k.arr.slice(0, 3).every((x) => s.has(x))) p++
    if (k.arr.slice(0, 5).every((x) => s.has(x))) q++
    if (k.arr.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { p, q, q4, n: l.length, moy: ch / l.length }
}

const A = [3, 3, 1, 1, 0]
const B = [4, 2, 1, 1, 0]
const D = [4, 3, 1, 0, 0]
console.log('')
console.log('  SUPPRIMER LE CHOIX LE PLUS CHER — ' + C.length + ' Quintés à presse réelle')
console.log('  ' + pad('répartition', 26) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 10) + 'chevaux')
for (const [nom, q] of [['3-3-1-1-0 (production)', A], ['4-2-1-1-0', B], ['4-3-1-0-0', D]]) {
  const r = noter(C, q)
  console.log('  ' + pad(nom, 26) + pad(pct(r.p, r.n), 10) + pad(pct(r.q, r.n), 10) + pad(pct(r.q4, r.n), 10) + r.moy.toFixed(2))
}
const m = Math.floor(C.length / 2)
console.log('')
console.log('  MOITIÉ PAR MOITIÉ')
for (const [nom, l] of [['1ʳᵉ moitié', C.slice(0, m)], ['2ᵈᵉ moitié', C.slice(m)]]) {
  const a = noter(l, A), b = noter(l, B)
  console.log('  ' + pad(nom, 14) + 'production ' + pad(pct(a.p, a.n) + ' · ' + pct(a.q, a.n), 22) +
    '· 4-2-1-1-0 ' + pct(b.p, b.n) + ' · ' + pct(b.q, b.n))
}
const boot = (d) => {
  let mm = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mm++
  }
  return mm / 100
}
console.log('')
for (const [nom, k] of [['podium entier', 3], ['quinté entier', 5]]) {
  const d = C.map((c) => {
    const a = new Set(jouer(c, A)), b = new Set(jouer(c, B))
    const arr = c.arr.slice(0, k)
    return (arr.every((x) => b.has(x)) ? 1 : 0) - (arr.every((x) => a.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  console.log('  ' + pad(nom, 16) + 'gagnées ' + pad(g, 4) + '· perdues ' + pad(p, 4) + '· bootstrap mieux : ' + boot(d).toFixed(1) + ' %')
}
console.log('')
