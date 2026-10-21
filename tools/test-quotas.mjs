/* =============================================================================
 * tools/test-quotas.mjs — LES RÉPARTITIONS À 8 CHEVAUX (20/10/2026)
 *
 * Demande de l'utilisateur : « fais un test sur 3-3-1-1-0 ».
 *
 * 3-3-1-1-0 = 8 chevaux, comme 3-2-1-1-1 : ce n'est pas un 9ᵉ siège, c'est
 * LE SIÈGE DE G5 DÉPLACÉ VERS G2. On garde le même nombre de chevaux, on
 * change seulement d'où ils viennent.
 *
 * On mesure le PODIUM ENSEMBLE et le QUINTÉ COMPLET (§11.25), jamais le cheval
 * isolé. Deux corpus :
 *
 *   ① les 96 Quintés à presse réelle (data/quintes.json) — le vrai buildGrid,
 *     G1-G3 remplis au carnet, G4-G5 au marché (la règle §11.23) ;
 *   ② les 123 Quintés français des archives (§11.25), sans presse : les blocs
 *     sont les tranches de marché (G1 = rangs 1-4 … G5 = 13+), donc le test
 *     porte sur la STRUCTURE seule.
 *
 *   node tools\test-quotas.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const pad = (s, n) => String(s).padEnd(n)
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1)

/* ───────────────────────────── ① le corpus presse ──────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const presse = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? q.presse : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  let g
  try { g = buildGrid(syn, nums) } catch { continue }
  const blocs = {}
  for (const gr of g.groupes) {
    blocs[gr.id] = gr.cases.filter((c) => c.num != null)
      .map((c) => ({ num: c.num, place: c.place }))
  }
  if (!blocs.G1 || !blocs.G2) continue
  const rang = Object.fromEntries(nums.slice().sort((a, b) => cotes[a] - cotes[b] || a - b).map((n, i) => [n, i + 1]))
  presse.push({ blocs, rang, arrivee: q.arrivee.slice(0, 5) })
}

/* ─────────────────────────── ② le corpus archives ──────────────────────── */
const ARCH = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
const statsCles = new Set(TOUT.filter((q) => q.date).map((q) => q.date + '|' + String(q.track || '').toUpperCase().replace(/[_\s]+/g, ' ')))
const arch = []
for (const c of ARCH) {
  if (statsCles.has(c.date + '|' + String(c.track).toUpperCase().replace(/[_\s]+/g, ' '))) continue
  const ordre = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  const blocs = {
    G1: ordre.slice(0, 4).map((n, i) => ({ num: n, place: i + 1 })),
    G2: ordre.slice(4, 8).map((n, i) => ({ num: n, place: i + 5 })),
    G3: ordre.slice(8, 10).map((n, i) => ({ num: n, place: i + 9 })),
    G4: ordre.slice(10, 12).map((n, i) => ({ num: n, place: i + 11 })),
    G5: ordre.slice(12).map((n, i) => ({ num: n, place: i + 13 })),
  }
  const rang = Object.fromEntries(ordre.map((n, i) => [n, i + 1]))
  arch.push({ blocs, rang, arrivee: c.arrivee.slice(0, 5) })
}
function cotesB(c, n) { return c.cotes[n] }

/* ─────────────────────────────── le remplissage ────────────────────────── */
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']

/** ordre dans le bloc : 'C' = carnet (place de presse) · 'M' = marché (cote) */
function remplir(course, quota, ordre = 'CC CMM'.replace(/ /g, '')) {
  const out = []
  for (let i = 0; i < 5; i++) {
    const q = quota[i]
    if (!q) continue
    const cs = (course.blocs[IDS[i]] || []).slice()
    cs.sort(ordre[i] === 'M'
      ? (a, b) => (course.rang[a.num] ?? 99) - (course.rang[b.num] ?? 99) || a.place - b.place
      : (a, b) => a.place - b.place)
    out.push(...cs.slice(0, q).map((x) => x.num))
  }
  return out
}

function noter(corpus, quota, ordre) {
  let pod = 0, pod2 = 0, qui = 0, qui4 = 0, s = 0
  for (const c of corpus) {
    const t = new Set(remplir(c, quota, ordre))
    const p = c.arrivee.slice(0, 3).filter((x) => t.has(x)).length
    const q = c.arrivee.slice(0, 5).filter((x) => t.has(x)).length
    if (p === 3) pod++
    if (p >= 2) pod2++
    if (q === 5) qui++
    if (q >= 4) qui4++
    s += q
  }
  const n = corpus.length || 1
  return { n: corpus.length, pod: pod / n, pod2: pod2 / n, qui: qui / n, qui4: qui4 / n, moy: s / n, nq: qui }
}

/* ─────────────────────────────── les répartitions ──────────────────────── */
const QUOTAS = [
  { v: [3, 2, 1, 1, 1], nom: '3-2-1-1-1  (le moteur, §11.23)' },
  { v: [3, 3, 1, 1, 0], nom: '3-3-1-1-0  ← demandé' },
  { v: [3, 2, 1, 1, 0], nom: '3-2-1-1-0  (7 chevaux)' },
  { v: [2, 3, 1, 1, 1], nom: '2-3-1-1-1' },
  { v: [4, 1, 1, 1, 1], nom: '4-1-1-1-1' },
  { v: [3, 2, 2, 1, 0], nom: '3-2-2-1-0' },
  { v: [2, 2, 1, 1, 1], nom: '2-2-1-1-1  (7 chevaux)' },
  { v: [3, 3, 0, 1, 1], nom: '3-3-0-1-1' },
  { v: [3, 3, 1, 0, 1], nom: '3-3-1-0-1' },
]

console.log('\n  ① LES 96 QUINTÉS À PRESSE RÉELLE — G1-G3 au carnet · G4-G5 au marché')
console.log('  ' + pad('répartition', 30) + pad('chev.', 7) + pad('podium entier', 15) + pad('quinté entier', 15) + pad('≥4 quinté', 12) + 'x/5')
for (const k of QUOTAS) {
  const r = noter(presse, k.v, 'CC CMM'.replace(/ /g, ''))
  const nb = k.v.reduce((a, b) => a + b, 0)
  console.log('  ' + pad(k.nom, 30) + pad(nb, 7) + pad(pct(r.pod), 15) + pad(pct(r.qui), 15) + pad(pct(r.qui4), 12) + r.moy.toFixed(2))
}

console.log('\n  ② LES 123 QUINTÉS FRANÇAIS DES ARCHIVES — blocs = tranches de marché')
console.log('     (G1 = rangs 1-4 · G2 = 5-8 · G3 = 9-10 · G4 = 11-12 · G5 = 13+)')
console.log('  ' + pad('répartition', 30) + pad('chev.', 7) + pad('podium entier', 15) + pad('quinté entier', 15) + pad('≥4 quinté', 12) + 'x/5')
for (const k of QUOTAS) {
  const r = noter(arch, k.v, 'MMMMM')
  const nb = k.v.reduce((a, b) => a + b, 0)
  console.log('  ' + pad(k.nom, 30) + pad(nb, 7) + pad(pct(r.pod), 15) + pad(pct(r.qui), 15) + pad(pct(r.qui4), 12) + r.moy.toFixed(2))
}

/* ─────────────── ③ la stabilité : 3-3-1-1-0 contre la production ────────── */
console.log('\n  ③ STABILITÉ — moitié par moitié')
{
  const A = presse.slice(0, Math.floor(presse.length / 2)), B = presse.slice(Math.floor(presse.length / 2))
  const a1 = noter(A, [3, 2, 1, 1, 1], 'CCCMM'), b1 = noter(B, [3, 2, 1, 1, 1], 'CCCMM')
  const a2 = noter(A, [3, 3, 1, 1, 0], 'CCCMM'), b2 = noter(B, [3, 3, 1, 1, 0], 'CCCMM')
  console.log('     presse    3-2-1-1-1 : ' + pct(a1.pod) + ' / ' + pct(a1.qui) + '   |   ' + pct(b1.pod) + ' / ' + pct(b1.qui))
  console.log('     presse    3-3-1-1-0 : ' + pct(a2.pod) + ' / ' + pct(a2.qui) + '   |   ' + pct(b2.pod) + ' / ' + pct(b2.qui))

  const C = arch.slice(0, Math.floor(arch.length / 2)), D = arch.slice(Math.floor(arch.length / 2))
  const c1 = noter(C, [3, 2, 1, 1, 1], 'MMMMM'), d1 = noter(D, [3, 2, 1, 1, 1], 'MMMMM')
  const c2 = noter(C, [3, 3, 1, 1, 0], 'MMMMM'), d2 = noter(D, [3, 3, 1, 1, 0], 'MMMMM')
  console.log('     archives  3-2-1-1-1 : ' + pct(c1.pod) + ' / ' + pct(c1.qui) + '   |   ' + pct(d1.pod) + ' / ' + pct(d1.qui))
  console.log('     archives  3-3-1-1-0 : ' + pct(c2.pod) + ' / ' + pct(c2.qui) + '   |   ' + pct(d2.pod) + ' / ' + pct(d2.qui))
}

/* ───────── ④ ce que 3-3-1-1-0 échange : le 4ᵉ de G2 contre G5 ──────────── */
console.log('\n  ④ L’ÉCHANGE — ce qu’on gagne et ce qu’on perd')
{
  let gagne = 0, perd = 0, egal = 0, gagneQ = 0, perdQ = 0
  for (const c of presse) {
    const t1 = new Set(remplir(c, [3, 2, 1, 1, 1], 'CCCMM'))
    const t2 = new Set(remplir(c, [3, 3, 1, 1, 0], 'CCCMM'))
    const p1 = c.arrivee.slice(0, 3).every((x) => t1.has(x))
    const p2 = c.arrivee.slice(0, 3).every((x) => t2.has(x))
    if (p2 && !p1) gagne++
    else if (p1 && !p2) perd++
    else egal++
    const q1 = c.arrivee.slice(0, 5).every((x) => t1.has(x))
    const q2 = c.arrivee.slice(0, 5).every((x) => t2.has(x))
    if (q2 && !q1) gagneQ++
    else if (q1 && !q2) perdQ++
  }
  console.log('     podium : gagné ' + gagne + ' · perdu ' + perd + ' · inchangé ' + egal + '   (sur ' + presse.length + ')')
  console.log('     quinté : gagné ' + gagneQ + ' · perdu ' + perdQ)
  /* combien de fois le 4ᵉ de G2 arrive (le cheval que 3-3-1-1-0 ajoute) */
  let arrive4 = 0, arriveG5 = 0
  for (const c of presse) {
    const g2 = (c.blocs.G2 || []).slice().sort((a, b) => a.place - b.place)[3]
    if (g2 && c.arrivee.includes(g2.num)) arrive4++
    const g5 = (c.blocs.G5 || []).slice().sort((a, b) => (c.rang[a.num] ?? 99) - (c.rang[b.num] ?? 99))[0]
    if (g5 && c.arrivee.includes(g5.num)) arriveG5++
  }
  console.log('     le 4ᵉ de G2 arrive dans les 5 : ' + pct(arrive4 / presse.length) + '  (' + arrive4 + '/' + presse.length + ')')
  console.log('     le 1ᵉʳ de G5 au marché       : ' + pct(arriveG5 / presse.length) + '  (' + arriveG5 + '/' + presse.length + ')')
}
/* ───────── ⑤ bootstrap apparié : 3-3-1-1-0 contre 3-2-1-1-1 ─────────────── */
console.log('\n  ⑤ BOOTSTRAP APPARIÉ — 10 000 tirages, 3-3-1-1-0 contre 3-2-1-1-1')
for (const [nom, corpus, ordre] of [['presse (96)', presse, 'CCCMM'], ['archives (123)', arch, 'MMMMM']]) {
  const d = corpus.map((c) => {
    const t1 = new Set(remplir(c, [3, 2, 1, 1, 1], ordre))
    const t2 = new Set(remplir(c, [3, 3, 1, 1, 0], ordre))
    const p1 = c.arrivee.slice(0, 3).every((x) => t1.has(x)), p2 = c.arrivee.slice(0, 3).every((x) => t2.has(x))
    const q1 = c.arrivee.slice(0, 5).every((x) => t1.has(x)), q2 = c.arrivee.slice(0, 5).every((x) => t2.has(x))
    const x1 = c.arrivee.slice(0, 5).filter((x) => t1.has(x)).length
    const x2 = c.arrivee.slice(0, 5).filter((x) => t2.has(x)).length
    return { dp: p2 - p1, dq: q2 - q1, dx: x2 - x1 }
  })
  let posP = 0, posQ = 0, negQ = 0
  const dx = []
  for (let b = 0; b < 10000; b++) {
    let sp = 0, sq = 0, sx = 0
    for (let k = 0; k < corpus.length; k++) {
      const z = d[Math.floor(Math.random() * corpus.length)]
      sp += z.dp; sq += z.dq; sx += z.dx
    }
    if (sp > 0) posP++
    if (sq > 0) posQ++
    if (sq < 0) negQ++
    dx.push(sx / corpus.length)
  }
  dx.sort((a, b) => a - b)
  const qt = (p) => dx[Math.floor(p * (dx.length - 1))]
  console.log('     ' + pad(nom, 16) + 'podium mieux dans ' + pad(pct(posP / 10000), 9) +
    ' · quinté mieux dans ' + pad(pct(posQ / 10000), 9) + ' · pire dans ' + pct(negQ / 10000))
  console.log('     ' + pad('', 16) + 'chevaux trouvés : +' + qt(0.5).toFixed(2) + '  IC 90 % [' +
    qt(0.05).toFixed(2) + ' ; ' + qt(0.95).toFixed(2) + ']')
}
console.log('')
