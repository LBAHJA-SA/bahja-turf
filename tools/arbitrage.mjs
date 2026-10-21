/* =============================================================================
 * tools/arbitrage.mjs — LE SEUL ARBITRAGE QUI RESTE (20/10/2026)
 *
 * Tout est mesuré : le carnet prend 30 % de la marge du choix, et il ne se bat
 * que par lui-même. Il reste UNE idée non testée, et elle est concrète :
 *
 *   dans un bloc, on garde les `quota` premiers de la presse — SAUF si le
 *   cheval écarté est beaucoup plus court au marché que le dernier gardé.
 *   Alors on échange les deux.
 *
 * Ce n'est ni « le carnet », ni « le marché » : c'est le carnet avec un veto
 * du marché quand le désaccord est GROSSIER. Seuils testés : 1,2 · 1,5 · 2 · 3.
 *
 * Mesures : le cheval jeté arrive-t-il (métrique dense, 96 courses) ET le
 * ticket 3-3-1-1-0 tient-il (5/5, podium), moitié par moitié.
 *
 *   node tools\arbitrage.mjs
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
  return {
    c, grille, cl, stats: computeStats(REC.filter((_, k) => k !== i)), arr: c.q.arrivee,
    bloc: grille.groupes.map((g) => g.cases.map((x) => x.num)),
  }
})
const QUOTAS = [3, 3, 1, 1, 0]

/* ── ① la métrique dense : qui jette-t-on, et arrive-t-il ? ─────────────── */
/** renvoie le ou les chevaux écartés du bloc b, avec le veto du marché */
function ecartes(k, b, seuil) {
  const bloc = k.bloc[b]
  const q = Math.min(QUOTAS[b], bloc.length)
  if (bloc.length <= q) return null
  /* ordre du carnet = l'ordre de la grille (P1, P2, …) */
  const garde = bloc.slice(0, q)
  const jete = bloc.slice(q)
  if (!seuil || !jete.length) return jete
  /* veto : si un jeté est `seuil` fois moins cher que le dernier gardé, on échange */
  const dernier = garde[garde.length - 1]
  const cote = (n) => k.c.cotes[n].cote
  const pire = jete.slice().sort((a, z) => cote(a) - cote(z))[0]
  if (cote(pire) * seuil < cote(dernier)) {
    return [dernier, ...jete.filter((x) => x !== pire)]
  }
  return jete
}

console.log('')
console.log('  L’ARBITRAGE PRESSE / MARCHÉ — ' + C.length + ' Quintés à presse réelle')
console.log('  on garde la presse, SAUF si le jeté est nettement plus court au marché')
console.log('')
console.log('  ' + pad('seuil', 10) + pad('G1 jeté arrive', 18) + pad('G2', 10) + pad('G3', 10) + pad('G4', 10))
for (const seuil of [null, 1.2, 1.5, 2, 3, 5]) {
  const out = []
  for (let b = 0; b < 4; b++) {
    let n = 0, t5 = 0
    for (const k of C) {
      const e = ecartes(k, b, seuil)
      if (!e || !e.length) continue
      n++
      if (e.some((x) => k.arr.slice(0, 5).includes(x))) t5++
    }
    out.push(pct(t5, n))
  }
  console.log('  ' + pad(seuil == null ? '— (presse)' : '×' + seuil, 10) +
    pad(out[0], 18) + pad(out[1], 10) + pad(out[2], 10) + pad(out[3], 10))
}

/* ── ② le ticket, construit directement : place P pour G1-G3, cote pour G4 ─ */
function ticketDe(k, seuil) {
  const t = []
  for (let b = 0; b < 4; b++) {
    const cases = k.grille.groupes[b].cases
    if (!cases.length) continue
    const q = b === 2 ? Math.max(1, Math.min(QUOTAS[b], cases.length)) : Math.min(QUOTAS[b], cases.length)
    const cote = (n) => k.c.cotes[n].cote
    const ordre = b === 3
      ? cases.slice().sort((a, z) => cote(a.num) - cote(z.num) || a.place - b.place)
      : cases.slice().sort((a, z) => a.place - z.place)
    let garde = ordre.slice(0, q)
    const jete = ordre.slice(q)
    if (seuil != null && jete.length) {
      const pire = jete.slice().sort((a, z) => cote(a.num) - cote(z.num))[0]
      if (cote(pire.num) * seuil < cote(garde[garde.length - 1].num)) {
        garde = [...garde.slice(0, garde.length - 1), pire]
      }
    }
    garde.forEach((c) => t.push(c.num))
  }
  return t
}
function noter(l, seuil) {
  let p = 0, q = 0, q4 = 0
  for (const k of l) {
    const t = new Set(ticketDe(k, seuil))
    const a = k.arr
    if (a.slice(0, 3).every((x) => t.has(x))) p++
    if (a.slice(0, 5).every((x) => t.has(x))) q++
    if (a.slice(0, 5).filter((x) => t.has(x)).length >= 4) q4++
  }
  return { p, q, q4, n: l.length }
}
console.log('')
console.log('  LE TICKET 3-3-1-1-0 (carnet G1-G3 · cote G4, avec le veto)')
console.log('  ' + pad('seuil', 12) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 10) + 'chevaux')
for (const seuil of [null, 1.2, 1.5, 2, 3]) {
  const r = noter(C, seuil)
  let ch = 0
  for (const k of C) ch += ticketDe(k, seuil).length
  console.log('  ' + pad(seuil == null ? '— (presse)' : '×' + seuil, 12) + pad(pct(r.p, r.n), 10) +
    pad(pct(r.q, r.n), 10) + pad(pct(r.q4, r.n), 10) + (ch / r.n).toFixed(2))
}
console.log('')
const m = Math.floor(C.length / 2)
console.log('  MOITIÉ PAR MOITIÉ (quinté entier)')
for (const seuil of [null, 1.2, 1.5, 2, 3]) {
  const a = noter(C.slice(0, m), seuil), b = noter(C.slice(m), seuil)
  console.log('  ' + pad(seuil == null ? '— (presse)' : '×' + seuil, 12) + pad(pct(a.q, a.n), 10) + pct(b.q, b.n))
}
/* apparié sur le 5/5, la référence étant la presse pure */
console.log('')
for (const seuil of [1.2, 1.5, 2, 3]) {
  const d = C.map((k) => {
    const A = new Set(ticketDe(k, null)), B = new Set(ticketDe(k, seuil))
    const a = k.arr.slice(0, 5)
    return (a.every((x) => B.has(x)) ? 1 : 0) - (a.every((x) => A.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  let mieux = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mieux++
  }
  console.log('  ×' + pad(seuil, 6) + 'quinté : gagnées ' + pad(g, 4) + '· perdues ' + pad(p, 4) +
    '· bootstrap mieux que la presse : ' + (mieux / 100).toFixed(1) + ' %')
}
console.log('')
