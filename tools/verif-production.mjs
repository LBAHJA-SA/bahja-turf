/* =============================================================================
 * tools/verif-production.mjs — le ticket RÉEL du moteur (20/10/2026)
 *
 * Ne fixe aucun quota : il lit `quotasEffectifs()` et `remplirGrille()` du
 * vrai moteur. Sert à vérifier, après chaque changement de GROUPES, que la
 * longueur du ticket et les métriques denses sont celles annoncées.
 *
 *   node tools\verif-production.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille, quotasEffectifs } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')

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

function noter(l) {
  let p = 0, q = 0, q4 = 0, n = 0
  const tailles = {}
  for (const k of l) {
    const t = remplirGrille(k.grille, k.cl, k.c.q.discipline, k.c.cotes, k.stats).ticket
    const s = new Set(t)
    n++
    tailles[t.length] = (tailles[t.length] || 0) + 1
    if (k.arr.slice(0, 3).every((x) => s.has(x))) p++
    if (k.arr.slice(0, 5).every((x) => s.has(x))) q++
    if (k.arr.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { p, q, q4, n, tailles }
}
const m = Math.floor(C.length / 2)
const A = noter(C.slice(0, m)), B = noter(C.slice(m)), T = noter(C)

console.log('')
console.log('  LE TICKET DU MOTEUR — ' + C.length + ' Quintés à presse réelle')
console.log('  quotas lus dans GROUPES : ' + quotasEffectifs().map((x) => x.n).join('-'))
console.log('')
console.log('  longueur du ticket : ' + Object.entries(T.tailles).map(([k, v]) => k + ' chevaux × ' + v).join(' · '))
console.log('')
console.log('  podium entier  ' + pct(T.p, T.n))
console.log('  quinté entier  ' + pct(T.q, T.n))
console.log('  ≥4 du quinté   ' + pct(T.q4, T.n))
console.log('')
console.log('  1ʳᵉ moitié     ' + pct(A.p, A.n) + ' · ' + pct(A.q, A.n))
console.log('  2ᵈᵉ moitié     ' + pct(B.p, B.n) + ' · ' + pct(B.q, B.n))
console.log('')
