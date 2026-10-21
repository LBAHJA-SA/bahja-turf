/* =============================================================================
 * tools/egaler.mjs — TOUTES LES RÉPARTITIONS À 8 CHEVAUX (20/10/2026)
 *
 * L'utilisateur a tranché : « un siège de plus, c'est un ticket de 16 ».
 * Ajouter un cheval n'est pas une réponse — c'est de la dilution. La seule
 * question honnête est donc : **à 8 chevaux, quelle répartition couvre le
 * mieux le podium et le quinté ?**
 *
 * On énumère TOUTES les compositions (q1..q5) de 8 sièges dans les 5 blocs,
 * dans les limites du carnet (G1 et G2 ont 4 cases, G3 et G4 en ont 2), et on
 * mesure les deux métriques denses :
 *
 *   · podium entier  = les 3 premiers sont dans le ticket
 *   · quinté entier  = les 5 premiers sont dans le ticket
 *
 * Deux corpus, pour ne pas conclure sur un seul :
 *   ① 96 Quintés à presse réelle — le vrai buildGrid, G1-G3 au carnet, G4-G5
 *     au marché (§11.23).
 *   ② 123 Quintés français des archives — blocs = tranches de marché.
 *
 * ⚠ Aucune règle choisie sur un corpus n'est validée par le même corpus : on
 *   regarde si le classement des répartitions se RESSEMBLE sur les deux.
 *
 *   node tools\egaler.mjs
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

/* ───────────────────────────── ② le corpus archives ────────────────────── */
const ARCH = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
const cles = new Set(TOUT.filter((x) => x.date).map((x) => x.date + '|' + N(x.track)))
const ARCHIVES = ARCH.filter((c) => !cles.has(c.date + '|' + N(c.track)))

/* ─────────────────────────── toutes les compositions ───────────────────── */
/* ⚠ 20/10/2026 — CORRIGÉ. G3 porte `obligatoire: true` dans GROUPES et
 * `remplirGrille` fait `Math.max(1, g.quota)` : un quota 0 sur G3 est IMPOSSIBLE,
 * le moteur le remet à 1. Une première version énumérait q3 = 0 et croyait
 * mesurer un ticket de 8 : c'était un ticket de 9 (le « ticket de 16 » que
 * l'utilisateur a refusé). Le total est maintenant VÉRIFIÉ, course par course. */
const COMBOS = []
for (let q1 = 0; q1 <= 4; q1++)
  for (let q2 = 0; q2 <= 4; q2++)
    for (let q3 = 1; q3 <= 2; q3++)
      for (let q4 = 0; q4 <= 2; q4++) {
        const q5 = 8 - q1 - q2 - q3 - q4
        if (q5 < 0 || q5 > 8) continue
        COMBOS.push([q1, q2, q3, q4, q5])
      }
const cle = (q) => q.join('-')

/* ─────────────────────────────── la mesure ─────────────────────────────── */
function noterPresse() {
  const out = Object.fromEntries(COMBOS.map((q) => [cle(q), { pod: 0, qui: 0, q4: 0, n: 0, ch: 0, ecart: 0 }]))
  PRESSE.forEach((c, i) => {
    const grille = buildGrid(c.syn, c.nums)
    const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
      .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const stats = computeStats(REC.filter((_, k) => k !== i))
    for (const q of COMBOS) {
      const g2 = { groupes: grille.groupes.map((g, k) => ({ ...g, quota: Math.min(q[k], g.cases.length) })) }
      const t = remplirGrille(g2, cl, c.q.discipline, c.cotes, stats).ticket
      const s = new Set(t)
      const r = out[cle(q)]
      r.n++; r.ch += t.length
      /* ⚠ le total réel se vérifie — c'est ce qui a attrapé le bug du q3 = 0 */
      if (t.length !== q.reduce((a, b) => a + b, 0)) r.ecart++
      if (c.q.arrivee.slice(0, 3).every((x) => s.has(x))) r.pod++
      if (c.q.arrivee.slice(0, 5).every((x) => s.has(x))) r.qui++
      if (c.q.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) r.q4++
    }
  })
  return out
}

function noterArchives() {
  const out = Object.fromEntries(COMBOS.map((q) => [cle(q), { pod: 0, qui: 0, q4: 0, n: 0, ch: 0 }]))
  for (const c of ARCHIVES) {
    const ordre = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
    const bl = [ordre.slice(0, 4), ordre.slice(4, 8), ordre.slice(8, 10), ordre.slice(10, 12), ordre.slice(12)]
    for (const q of COMBOS) {
      const s = new Set()
      q.forEach((k, i) => bl[i].slice(0, k).forEach((x) => s.add(x)))
      const r = out[cle(q)]
      r.n++; r.ch += s.size
      if (c.arrivee.slice(0, 3).every((x) => s.has(x))) r.pod++
      if (c.arrivee.slice(0, 5).every((x) => s.has(x))) r.qui++
      if (c.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) r.q4++
    }
  }
  return out
}

const A = noterPresse()
const B = noterArchives()
const NOM = { '3-3-1-1-0': 'la production actuelle' }

/* ─────────────────────────────── le rapport ────────────────────────────── */
const tri = (R) => Object.entries(R).sort((x, y) => (y[1].qui / y[1].n) - (x[1].qui / x[1].n))

console.log('\n  À 8 CHEVAUX CONSTANTS — toutes les répartitions possibles (' + COMBOS.length + ')')
console.log('  aucun siège ajouté : ce qui entre d’un côté sort de l’autre\n')

const top = tri(A).slice(0, 12)
console.log('  ① 96 QUINTÉS À PRESSE RÉELLE — classées par quinté entier')
console.log('  ' + pad('répartition', 12) + pad('chev.', 7) + pad('podium entier', 15) + pad('quinté entier', 15) + pad('≥4 quinté', 12) + 'note')
for (const [k, r] of top) {
  const b = B[k]
  const stable = (r.qui / r.n) >= 0.11 && (b.qui / b.n) >= 0.10
  console.log('  ' + pad(k, 12) + pad((r.ch / r.n).toFixed(1), 7) + pad(pct(r.pod, r.n), 15) + pad(pct(r.qui, r.n), 15) + pad(pct(r.q4, r.n), 12) +
    (r.ecart ? '⚠ ' + r.ecart + ' tickets hors total' : NOM[k] ? '← production' : stable ? '✓ tient aussi sur les archives' : ''))
}

console.log('\n  ② 123 QUINTÉS FRANÇAIS DES ARCHIVES — classées par quinté entier')
console.log('  ' + pad('répartition', 12) + pad('podium entier', 15) + pad('quinté entier', 15) + pad('≥4 quinté', 12) + 'note')
for (const [k, r] of tri(B).slice(0, 12)) {
  const a = A[k]
  const stable = (r.qui / r.n) >= 0.10 && (a.qui / a.n) >= 0.11
  console.log('  ' + pad(k, 12) + pad(pct(r.pod, r.n), 15) + pad(pct(r.qui, r.n), 15) + pad(pct(r.q4, r.n), 12) +
    (NOM[k] ? '← production' : stable ? '✓ tient aussi sur la presse' : ''))
}

/* ─────────────── le classement moyen des deux corpus ───────────────────── */
console.log('\n  ③ LE CLASSEMENT MOYEN — la seule liste qui compte')
const rang = (R) => {
  const t = tri(R)
  return Object.fromEntries(t.map(([k], i) => [k, i + 1]))
}
const ra = rang(A), rb = rang(B)
const moy = COMBOS.map((q) => {
  const k = cle(q)
  return { k, m: (ra[k] + rb[k]) / 2, a: A[k], b: B[k] }
}).sort((x, y) => x.m - y.m)
console.log('  ' + pad('répartition', 12) + pad('rang presse', 12) + pad('rang archives', 14) +
  pad('podium (P/A)', 20) + pad('quinté (P/A)', 22) + 'note')
for (const x of moy.slice(0, 10)) {
  console.log('  ' + pad(x.k, 12) + pad(ra[x.k], 12) + pad(rb[x.k], 14) +
    pad(pct(x.a.pod, x.a.n) + ' / ' + pct(x.b.pod, x.b.n), 20) +
    pad(pct(x.a.qui, x.a.n) + ' / ' + pct(x.b.qui, x.b.n), 22) +
    (NOM[x.k] ? '← production' : ''))
}
const prod = '3-3-1-1-0'
console.log('\n  la production ' + prod + ' : rang ' + ra[prod] + '/' + COMBOS.length +
  ' sur la presse · rang ' + rb[prod] + '/' + COMBOS.length + ' sur les archives' +
  ' · rang moyen ' + moy.findIndex((x) => x.k === prod) + 1 + '/' + COMBOS.length)

/* ─────────────── les variantes qui prennent le 4ᵉ de G1 ────────────────── */
console.log('\n  ④ CELLES QUI PRENNENT LE 4ᵉ DE G1 — à 8 chevaux, en rendant un siège')
console.log('  ' + pad('répartition', 12) + pad('ce qu’on rend', 20) + pad('podium P/A', 22) + 'quinté P/A')
for (const q of COMBOS.filter((x) => x[0] === 4)) {
  const k = cle(q)
  const rendu = q[1] < 3 ? '1 de G2' : q[2] < 1 ? 'G3' : q[3] < 1 ? 'G4' : q[4] < 1 ? 'G5' : '—'
  console.log('  ' + pad(k, 12) + pad(rendu, 20) +
    pad(pct(A[k].pod, A[k].n) + ' / ' + pct(B[k].pod, B[k].n), 22) +
    pct(A[k].qui, A[k].n) + ' / ' + pct(B[k].qui, B[k].n))
}
console.log('')
