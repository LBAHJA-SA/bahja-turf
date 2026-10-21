/* =============================================================================
 * tools/g3.mjs — « SI ON ENLÈVE P9-P10, PLUS DE TRIO NI DE QUINTÉ ? »
 * (20/10/2026)
 *
 * L'utilisateur : « il me semble que P9-P10, si on les enlève, c'est ni trio
 * ni quinté — ou je me trompe ? »
 *
 * On répond en trois mesures, jamais cheval par cheval :
 *
 *   ① CE QUE LE SIÈGE DE G3 RAPPORTE — le cheval de P9-P10 qu'on prend
 *      aujourd'hui : combien de fois arrive-t-il dans les 5, dans les 3 ?
 *      Et le 4ᵉ de G1 qu'on mettrait à sa place ?
 *
 *   ② LES COURSES QUI BASCULENT — appariées, course par course :
 *      gagnées par l'échange (le 4ᵉ de G1 arrive, pas le G3) · perdues
 *      (le G3 arrive, pas le 4ᵉ de G1) · inchangées (les deux ou aucun).
 *
 *   ③ LE TRIO — P9-P10 est-il vraiment nécessaire aux 3 premiers ?
 *      Réel contre hasard à effectif égal.
 *
 *   node tools\g3.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const N = (s) => String(s || '').toUpperCase().replace(/[_\\s]+/g, ' ').trim()

/* ───────────────────────────── ① le corpus presse ──────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const PRESSE = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  PRESSE.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])) })
}
const REC = PRESSE.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))

/* ═══════════════ ① CE QUE RAPPORTE LE SIÈGE DE G3 · LE 4ᵉ DE G1 ═══════════ */
let n = 0
const R = {
  g3_top5: 0, g3_top3: 0,
  g1q_top5: 0, g1q_top3: 0,
  deux: 0, aucun: 0, seulG3: 0, seulG1: 0,
}
let basculePodiumGagne = 0, basculePodiumPerdu = 0
let basculeQuinteGagne = 0, basculeQuintePerdu = 0
let cinqA = 0, cinqB = 0, troisA = 0, troisB = 0, quatreA = 0, quatreB = 0

PRESSE.forEach((c, i) => {
  const grille = buildGrid(c.syn, c.nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const stats = computeStats(REC.filter((_, k) => k !== i))
  const { ticket, detail } = remplirGrille(grille, cl, c.q.discipline, c.cotes, stats)
  const bloc = (id) => detail.find((g) => g.id === id)

  const g3pris = (bloc('G3')?.cases || []).find((x) => x.pris)
  const g1coupe = (bloc('G1')?.cases || []).filter((x) => !x.pris).sort((a, b) => a.place - b.place)[0]
  if (!g3pris || !g1coupe) return
  n++

  const arr = c.q.arrivee
  const a5 = arr.slice(0, 5), a3 = arr.slice(0, 3)
  const g3in5 = a5.includes(g3pris.num), g1in5 = a5.includes(g1coupe.num)
  const g3in3 = a3.includes(g3pris.num), g1in3 = a3.includes(g1coupe.num)

  if (g3in5) R.g3_top5++
  if (g3in3) R.g3_top3++
  if (g1in5) R.g1q_top5++
  if (g1in3) R.g1q_top3++
  if (g3in5 && g1in5) R.deux++
  else if (!g3in5 && !g1in5) R.aucun++
  else if (g3in5) R.seulG3++
  else R.seulG1++

  /* le ticket actuel contient le G3 ; le nouveau contient le 4ᵉ de G1 */
  const setA = new Set(ticket)
  const setB = new Set(ticket.filter((x) => x !== g3pris.num).concat([g1coupe.num]))
  const cA5 = a5.filter((x) => setA.has(x)).length, cB5 = a5.filter((x) => setB.has(x)).length
  const cA3 = a3.filter((x) => setA.has(x)).length, cB3 = a3.filter((x) => setB.has(x)).length
  if (cB5 > cA5) basculeQuinteGagne++
  else if (cB5 < cA5) basculeQuintePerdu++
  if (cB3 > cA3) basculePodiumGagne++
  else if (cB3 < cA3) basculePodiumPerdu++
  if (cA5 === 5) cinqA++
  if (cB5 === 5) cinqB++
  if (cA5 >= 4) quatreA++
  if (cB5 >= 4) quatreB++
  if (cA3 === 3) troisA++
  if (cB3 === 3) troisB++
})

console.log('\n  ① LE SIÈGE DE G3 (P9-P10) CONTRE LE 4ᵉ DE G1 — ' + n + ' Quintés à presse réelle\n')
console.log('  ' + pad('le cheval', 34) + pad('arrive top-5', 16) + 'arrive top-3')
console.log('  ' + pad('le siège de G3 (pris aujourd’hui)', 34) + pad(pct(R.g3_top5, n), 16) + pct(R.g3_top3, n))
console.log('  ' + pad('le 4ᵉ de G1 (pris à la place)', 34) + pad(pct(R.g1q_top5, n), 16) + pct(R.g1q_top3, n))

console.log('\n  LES DEUX, COURSE PAR COURSE')
console.log('     les deux arrivent dans les 5   : ' + pct(R.deux, n))
console.log('     aucun des deux dans les 5      : ' + pct(R.aucun, n))
console.log('     SEUL le G3 arrive              : ' + pct(R.seulG3, n) + '   ← ce que l’échange perd')
console.log('     SEUL le 4ᵉ de G1 arrive        : ' + pct(R.seulG1, n) + '   ← ce que l’échange gagne')

/* ═════════════════ ② LE TRIO — P9-P10 est-il indispensable ? ══════════════ */
/* Sur les mêmes courses : combien de fois le trio contient-il un cheval de G3,
 * et combien de fois en contiendrait-il un si on tirait 3 chevaux au hasard
 * dans le peloton (même effectif). */
let trioG3 = 0, trioTotal = 0, hasardG3 = 0
let quintG3 = 0, quintTotal = 0
let trioHaut = 0
PRESSE.forEach((c, i) => {
  const grille = buildGrid(c.syn, c.nums)
  const casesDe = {}
  let tot = 0
  for (const g of grille.groupes) for (const cs of g.cases) { casesDe[cs.num] = g.id; tot++ }
  const arr = c.q.arrivee
  trioTotal++
  if (arr.slice(0, 3).some((x) => casesDe[x] === 'G3')) trioG3++
  if (arr.slice(0, 3).some((x) => casesDe[x] === 'G1' || casesDe[x] === 'G2')) trioHaut++
  quintTotal++
  if (arr.slice(0, 5).some((x) => casesDe[x] === 'G3')) quintG3++
  /* le hasard : 3 chevaux sur `tot`, dont 2 cases de G3 */
  const p = 1 - ((tot - 2) / tot) * ((tot - 3) / (tot - 1)) * ((tot - 4) / (tot - 2))
  hasardG3 += p
})

console.log('\n  ② LE TRIO ET LE QUINTÉ — G3 est-il indispensable ?\n')
console.log('  ' + pad('', 32) + pad('réel', 12) + 'au hasard')
console.log('  ' + pad('le trio contient un G3', 32) + pad(pct(trioG3, trioTotal), 12) + pct(hasardG3, trioTotal))
console.log('  ' + pad('le trio contient un G1 ou G2', 32) + pad(pct(trioHaut, trioTotal), 12) + '—')
console.log('  ' + pad('le quinté contient un G3', 32) + pad(pct(quintG3, quintTotal), 12) + '—')

/* ═════════════════════ ③ CE QUE ÇA COÛTE VRAIMENT ════════════════════════ */
console.log('\n  ③ LES COURSES QUI BASCULENT (le ticket complet, pas le cheval)\n')
console.log('  ' + pad('', 34) + 'quinté   podium')
console.log('  ' + pad('courses gagnées par l’échange', 34) + pad(basculeQuinteGagne, 9) + basculePodiumGagne)
console.log('  ' + pad('courses perdues par l’échange', 34) + pad(basculeQuintePerdu, 9) + basculePodiumPerdu)
console.log('\n  ET LE COMPTE FINAL, SUR LES MÊMES 96 COURSES\n')
console.log('  ' + pad('', 30) + pad('3-3-1-1-0', 14) + '4-3-0-1-0')
console.log('  ' + pad('podium entier (3/3)', 30) + pad(pct(troisA, n), 14) + pct(troisB, n))
console.log('  ' + pad('≥4 du quinté', 30) + pad(pct(quatreA, n), 14) + pct(quatreB, n))
console.log('  ' + pad('quinté entier (5/5)', 30) + pad(pct(cinqA, n), 14) + pct(cinqB, n))
console.log('')
