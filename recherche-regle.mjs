// ════════════════════════════════════════════════════════════════════
//  LA RÈGLE — avec validation, sans se，告诉 soi-même
//
//  30 courses réelles, grille de presse 14-16 chevaux avec «fois cité».
//  Règles du carnet : découpage intact, ticket de 8, G1→G4, G5 zéro.
//  Le quota est une borne (min/max), pas une forme imposée.
//
//  On cherche la règle qui maximize le 5/5, puis on la valide en
//  leave-one-out : on la trouve sur 29, on la teste sur la 30e.
//  Une règle qui ne tient pas hors échantillon ne vaut rien.
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs'

const GROUPS = [
  { key: 'G1', lo: 1, hi: 4, min: 2, max: 3 },
  { key: 'G2', lo: 5, hi: 8, min: 2, max: 3 },
  { key: 'G3', lo: 9, hi: 10, min: 1, max: 2 },
  { key: 'G4', lo: 11, hi: 12, min: 1, max: 2 },
  { key: 'G5', lo: 13, hi: 20, min: 0, max: 1 },
]
const TICKET = 8
const CELL_W = { G1: [0.43, 0.57, 0.71, 0.43], G2: [0.57, 0.43, 0.71, 0.14], G3: [0.14, 0.57], G4: [0.14, 0.29], G5: [0, 0, 0, 0, 0, 0, 0, 0] }
const ACTIFS = GROUPS.filter((g) => g.key !== 'G5')

function buildCells(raw) {
  const c = raw.filter((n) => n != null && !isNaN(n))
  const fe = c[0] % 2 === 0
  const t = c.filter((n) => (fe ? n % 2 === 0 : n % 2 !== 0))
  const b = c.filter((n) => (fe ? n % 2 !== 0 : n % 2 === 0))
  const o = []
  for (let i = 0; i < Math.max(t.length, b.length); i++) o.push([t[i], b[i]])
  return o
}
function boxOrder(raw) {
  const cells = buildCells(raw); const sp = []; let i = 0
  for (const g of GROUPS) { const w = Math.ceil((g.hi - g.lo + 1) / 2); sp.push([i, i + w]); i += w }
  const out = []
  for (const [a, b] of sp) for (let r = 0; r < 2; r++) cells.slice(a, b).forEach((c) => {
    if (c[r] != null && !isNaN(c[r])) out.push(Number(c[r]))
  })
  return out
}
function cases(r) {
  const ordre = boxOrder(r.grille)
  const foisDe = new Map(r.grille_foix.map(([p, n, f]) => [n, f]))
  return ordre.map((n, i) => ({ place: i + 1, num: n, fois: foisDe.get(n) ?? 0, g: GROUPS.find((g) => i + 1 >= g.lo && i + 1 <= g.hi) }))
    .filter((c) => c.num != null)
}
const data = JSON.parse(readFileSync('press-archive-fois.json', 'utf8'))
const races = data.races
const N = races.length
const pc = (v, n) => (n ? Math.round((100 * v) / n) + '%' : '—')
const groupeDe = (p) => GROUPS.find((g) => p >= g.lo && p <= g.hi)?.key
const jouables = races.filter((r) => r.arrivee.every((n) => {
  const p = boxOrder(r.grille).indexOf(n) + 1
  return p >= 1 && p <= 12
}))
const J = jouables.length
const bon = (r, sel) => r.arrivee.filter((x) => sel.includes(x)).length

// ── la famille de règles : score = fois^α / place^β ─────────────────────
const SCORE = (a, b) => (c) => Math.pow(Math.max(c.fois, 0.001), a) / Math.pow(c.place, b)
// l'exposant du rapport P13/P1 : plus il est gros, plus la citation compte
function moteur(r, a, b) {
  const cs = cases(r)
  const pick = {}; const got = {}
  for (const g of GROUPS) got[g.key] = 0
  for (const g of ACTIFS) {
    const mine = cs.filter((c) => c.g.key === g.key).sort((x, y) => SCORE(a, b)(y) - SCORE(a, b)(x) || x.place - y.place)
    for (const c of mine.slice(0, Math.min(g.min, mine.length))) { pick[c.num] = true; got[g.key]++ }
  }
  let left = TICKET - Object.values(got).reduce((x, y) => x + y, 0)
  while (left > 0) {
    const c = cs.filter((x) => !pick[x.num] && got[x.g.key] < x.g.max).sort((x, y) => SCORE(a, b)(y) - SCORE(a, b)(x) || x.place - y.place)[0]
    if (!c) break
    pick[c.num] = true; got[c.g.key]++; left--
  }
  return { sel: Object.keys(pick).map(Number), got }
}
function moteurFigé(r) {
  const cs = cases(r); const pick = {}; const got = {}
  for (const g of GROUPS) got[g.key] = 0
  const poids = (c) => CELL_W[c.g.key]?.[c.place - c.g.lo] ?? 0
  for (const g of ACTIFS) {
    const mine = cs.filter((c) => c.g.key === g.key).sort((x, y) => poids(y) - poids(x))
    for (const c of mine.slice(0, Math.min(g.min, mine.length))) { pick[c.num] = true; got[g.key]++ }
  }
  let left = TICKET - Object.values(got).reduce((x, y) => x + y, 0)
  while (left > 0) {
    const c = cs.filter((x) => !pick[x.num] && got[x.g.key] < x.g.max).sort((x, y) => poids(y) - poids(x))[0]
    if (!c) break
    pick[c.num] = true; got[c.g.key]++; left--
  }
  return { sel: Object.keys(pick).map(Number), got }
}

const GRILLE = []
for (let a = 0; a <= 4; a += 0.5) for (let b = 0; b <= 3; b += 0.25) GRILLE.push([a, b])

function bilan(rs, a, b) {
  let q = 0, quatre = 0, trois = 0
  const f = {}
  for (const r of rs) {
    const { sel, got } = a === null ? moteurFigé(r) : moteur(r, a, b)
    const n = bon(r, sel)
    if (n === 5) q++; else if (n === 4) quatre++; else if (n === 3) trois++
    const k = `G1=${got.G1} G2=${got.G2} G3=${got.G3} G4=${got.G4}`
    f[k] = (f[k] || 0) + 1
  }
  return { q, quatre, trois, formes: f }
}

console.log('═'.repeat(78))
console.log(`  RECHERCHE DE RÈGLE  ·  ${N} courses (dont ${J} jouables)  ·  2021..2025`)
console.log('═'.repeat(78))

// ── ① la règle figée, pour référence ────────────────────────────────────
const fig = bilan(races, null)
const figJ = bilan(jouables, null)
console.log(`\n① RÉFÉRENCE — le moteur d'aujourd'hui (CELL_W figé)\n`)
console.log(`   toutes    : ${fig.q}/${N} 5/5 (${pc(fig.q, N)})   ${fig.quatre}×4/5   ${fig.trois}×3/5`)
console.log(`   jouables  : ${figJ.q}/${J} 5/5 (${pc(figJ.q, J)})`)
console.log(`   formes    : ${Object.entries(fig.formes).map(([f, n]) => `${f} ×${n}`).join('  ')}`)

// ── ② la grille des règles ──────────────────────────────────────────────
console.log(`\n\n② TOUTES LES RÈGLES score = fois^α ÷ place^β\n`)
const res = GRILLE.map(([a, b]) => ({ a, b, t: bilan(races, a, b), j: bilan(jouables, a, b) }))
res.sort((x, y) => (y.t.q - x.t.q) || (y.j.q - x.j.q))
console.log('    α (citations)   β (place)     5/5 toutes   5/5 jouables   4/5   formes')
console.log('    ' + '─'.repeat(74))
for (const x of res.slice(0, 12)) {
  console.log(`    ${x.a.toFixed(1).padStart(8)}   ${x.b.toFixed(2).padStart(8)}   ${String(x.t.q).padStart(6)}/${N} ${pc(x.t.q, N).padStart(7)}   ${String(x.j.q).padStart(6)}/${J} ${pc(x.j.q, J).padStart(7)}  ${String(x.t.quatre).padStart(4)}   ${Object.keys(x.t.formes).length}`)
}
console.log('\n    … et les scores « purs » :')
for (const [nom, a, b] of [['citations seules (place ignorée)', 1, 0], ['place seule (citations ignorées)', 0, 1]]) {
  const t = bilan(races, a, b), j = bilan(jouables, a, b)
  console.log(`    ${nom.padEnd(34)} ${String(t.q).padStart(3)}/${N} 5/5  ·  ${String(j.q).padStart(2)}/${J} jouables  ·  ${Object.keys(t.formes).length} formes`)
}

// ── ③ validation leave-one-out ──────────────────────────────────────────
console.log(`\n\n③ VALIDATION — on trouve sur 29, on teste sur la 30ᵉ\n`)
function loo(filtre) {
  let bonnes = 0
  for (let i = 0; i < filtre.length; i++) {
    const reste = filtre.filter((_, k) => k !== i)
    // on choisirait (a,b) sur les 29, puis on l'applique à la i
    let meil = null
    for (const [a, b] of GRILLE) {
      const q = reste.filter((r) => bon(r, moteur(r, a, b).sel) === 5).length
      if (!meil || q > meil.q) meil = { a, b, q }
    }
    if (bon(filtre[i], moteur(filtre[i], meil.a, meil.b).sel) === 5) bonnes++
  }
  return bonnes
}
const looT = loo(races)
const looJ = loo(jouables)
const inSample = bilan(races, res[0].a, res[0].b).q
console.log(`   dans l'échantillon (toutes)  : ${inSample}/${N}  ${pc(inSample, N)}   ← optimiste`)
console.log(`   hors échantillon  LOO (toutes): ${looT}/${N}  ${pc(looT, N)}   ← le vrai`)
console.log(`   hors échantillon  LOO (jouab.): ${looJ}/${J}  ${pc(looJ, J)}`)
console.log(`\n   → la LOO est la seule ligne qui compte. La première sert à`)

// ── ④ la règle gagnante, course par course ──────────────────────────────
const A = res[0].a, B = res[0].b
console.log(`\n\n④ LA RÈGLE α=${A} β=${B} — course par course\n`)
console.log('   date         ticket (en P)                        forme      5/5  figé')
let qs = 0, qf = 0
for (const r of races) {
  const po = Object.fromEntries(boxOrder(r.grille).map((n, i) => [n, i + 1]))
  const { sel, got } = moteur(r, A, B)
  const f = moteurFigé(r)
  const ns = bon(r, sel), nf = bon(r, f.sel)
  if (ns === 5) qs++
  if (nf === 5) qf++
  const forme = `G1=${got.G1} G2=${got.G2} G3=${got.G3} G4=${got.G4}`
  console.log(`   ${r.date}  ${sel.map((n) => `P${po[n]}`).sort((a, b) => +a.slice(1) - +b.slice(1)).join(' ').padEnd(34)} ${forme.padEnd(20)} ${ns}/5  ${nf}/5 ${ns > nf ? '✅' : ns < nf ? '❌' : '='}`)
}
console.log(`\n   nouvelle règle : ${qs}/${N}  ${pc(qs, N)}`)
console.log(`   moteur figé    : ${qf}/${N}  ${pc(qf, N)}`)
