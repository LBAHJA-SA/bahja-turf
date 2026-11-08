/* =============================================================================
 * tools\diag-discipline-moteur.mjs — LE RENDEMENT DU MOTEUR PAR DISCIPLINE
 * (08/11/2026)
 *
 * Question de l'utilisateur : « Statistiques montre une grande différence entre
 * Plat et Attelé pour les P — c'est de là qu'on cherche ».
 *
 * Ce script ne juge PAS les quotas : il appelle le VRAI remplirGrille
 * (3-2-1-1-1, G1-G2 carnet, G3 echange20, G4 marché, G5 echange20) et mesure,
 * discipline par discipline, ce que le ticket de 8 rapporte déjà.
 *
 * Puis il refait la même chose en ajoutant LE 4ᵉ DE LA PRESSE (le cheval que
 * G1 coupe), pour voir si le besoin d'une case de plus dépend de la discipline.
 *
 *   node tools\diag-discipline-moteur.mjs
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'

const norm = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return s || 'autre'
}

/* corpus 96, moteur RÉEL (quotas 3-2-1-1-1, G1-G2 carnet, G3 echange20, G4 marché, G5 echange20) */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const acc = {}
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue

  const grille = buildGrid(syn, nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const c = Object.fromEntries(Object.entries(cotes).map(([n, v]) => [n, { cote: v }]))
  const t = new Set(remplirGrille(grille, cl, q.discipline, c, null, null).ticket)
  const arr = q.arrivee.slice(0, 5)
  const d = norm(q.discipline)
  acc[d] = acc[d] || { n: 0, qui: 0, pod: 0, q4: 0 }
  acc[d].n++
  if (arr.every((x) => t.has(x))) acc[d].qui++
  if (arr.slice(0, 3).every((x) => t.has(x))) acc[d].pod++
  if (arr.filter((x) => t.has(x)).length >= 4) acc[d].q4++
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
console.log('')
console.log('MOTEUR RÉEL (3-2-1-1-1) — corpus 96, par discipline')
console.log('─'.repeat(64))
let N = 0, Q = 0
for (const [d, v] of Object.entries(acc)) {
  N += v.n; Q += v.qui
  console.log(d.padEnd(10), String(v.n).padStart(3), 'courses  quinté', pct(v.qui, v.n).padStart(7),
    ' podium', pct(v.pod, v.n).padStart(7), ' ≥4', pct(v.q4, v.n).padStart(7))
}
console.log('─'.repeat(64))
console.log('TOUT'.padEnd(10), String(N).padStart(3), 'courses  quinté', pct(Q, N).padStart(7))
console.log('')

/* ── et si on ajoutait le 4ᵉ de G1, discipline par discipline ? ──────────── */
const acc2 = {}
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const grille = buildGrid(syn, nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const c = Object.fromEntries(Object.entries(cotes).map(([n, v]) => [n, { cote: v }]))
  const t1 = new Set(remplirGrille(grille, cl, q.discipline, c, null, null).ticket)
  /* le 4ᵉ de G1 = le 4ᵉ rang de presse (G1 = les 4 premiers cités) */
  const g1 = grille.groupes[0].cases.slice().sort((a, b) => a.place - b.place)
  const extra = g1[3]?.num
  const t2 = new Set([...t1, ...(extra != null ? [extra] : [])])
  const arr = q.arrivee.slice(0, 5)
  const d = norm(q.discipline)
  acc2[d] = acc2[d] || { n: 0, a: 0, b: 0 }
  acc2[d].n++
  if (arr.every((x) => t1.has(x))) acc2[d].a++
  if (arr.every((x) => t2.has(x))) acc2[d].b++
}
console.log('T1 (8 chevaux) → T1 + le 4ᵉ de la presse (9)')
console.log('─'.repeat(64))
for (const [d, v] of Object.entries(acc2)) {
  console.log(d.padEnd(10), String(v.n).padStart(3), 'courses   5/5 :', pct(v.a, v.n).padStart(7), '→', pct(v.b, v.n).padStart(7),
    ' (' + (v.b - v.a > 0 ? '+' : '') + (v.b - v.a) + ' courses)')
}
console.log('')

