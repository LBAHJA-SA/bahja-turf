// ════════════════════════════════════════════════════════════════════
//  POURQUOI 3% — où se perdent les arrivées
//  30 courses réelles, grille 14-16 chevaux, arrivée Top5.
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
function buildCells(raw) {
  const clean = raw.filter((n) => n != null && !isNaN(n))
  const firstEven = clean[0] % 2 === 0
  const top = clean.filter((n) => (firstEven ? n % 2 === 0 : n % 2 !== 0))
  const bot = clean.filter((n) => (firstEven ? n % 2 !== 0 : n % 2 === 0))
  const cols = []
  for (let i = 0; i < Math.max(top.length, bot.length); i++) cols.push([top[i], bot[i]])
  return cols
}
function boxOrder(raw) {
  const cells = buildCells(raw); const spans = []; let i = 0
  for (const g of GROUPS) { const w = Math.ceil((g.hi - g.lo + 1) / 2); spans.push([i, i + w]); i += w }
  const out = []
  for (const [a, b] of spans) for (let r = 0; r < 2; r++) cells.slice(a, b).forEach((c) => {
    if (c[r] != null && !isNaN(c[r])) out.push(Number(c[r]))
  })
  return out
}
const data = JSON.parse(readFileSync('press-archive.json', 'utf8'))
const races = data.races
const N = races.length
const pc = (v, n) => Math.round((100 * v) / n) + '%'

const placeOf = (r) => Object.fromEntries(boxOrder(r.grille).map((n, i) => [n, i + 1]))
const groupe = (p) => GROUPS.find((g) => p >= g.lo && p <= g.hi)?.key ?? '?'

console.log('═'.repeat(76))
console.log(`  OÙ SE PERDENT LES 5 D'ARRIVÉE  ·  ${N} courses  ·  2021..2025`)
console.log('═'.repeat(76))

// ── 1. combien d'arrivés tombent hors de G1..G4 ? ────────────────────────
console.log('\n① OÙ TOMBENT LES ARRIVÉS DU TOP5\n')
const buckets = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0, hors: 0 }
const coursesAvecG5 = []
races.forEach((r, i) => {
  const po = placeOf(r)
  const ps = r.arrivee.map((n) => po[n])
  ps.forEach((p) => { if (p == null) buckets.hors++; else buckets[groupe(p)]++ })
  if (ps.some((p) => p != null && groupe(p) === 'G5')) coursesAvecG5.push(i)
})
const tot = Object.values(buckets).reduce((a, b) => a + b, 0)
for (const k of ['G1', 'G2', 'G3', 'G4', 'G5', 'hors']) {
  const bar = '█'.repeat(Math.round((buckets[k] / tot) * 46))
  console.log(`   ${k.padEnd(5)} ${String(buckets[k]).padStart(3)}/${tot}  ${pc(buckets[k], tot).padStart(4)}  ${bar}`)
}

// ── 2. combien de courses sont perdes d'avance avec G5 = 0 ──────────────
console.log(`\n② COURSES PERDUES D'AVANCE — un seul arrivé à P13+ et le 5/5 est mort\n`)
console.log(`   courses avec ≥1 arrivé en G5 (P13-P20) : ${String(coursesAvecG5.length).padStart(2)}/${N}  ${pc(coursesAvecG5.length, N).padStart(4)}`)
console.log(`   courses jouables avec G5 = 0          : ${String(N - coursesAvecG5.length).padStart(2)}/${N}  ${pc(N - coursesAvecG5.length, N).padStart(4)}`)

// ── 3. le plafond avec et sans G5 ───────────────────────────────────────
function plafond(actifs) {
  let n = 0
  for (const r of races) {
    const cells = []
    for (const g of GROUPS) {
      if (!actifs.includes(g.key)) continue
      const part = boxOrder(r.grille).slice(g.lo - 1, g.hi).filter(Boolean)
      part.forEach((num, i) => cells.push({ num, g }))
    }
    // on prend le maximum de chaque groupe puis on coupe à 8
    const pool = []
    for (const g of GROUPS) {
      if (!actifs.includes(g.key)) continue
      pool.push(...cells.filter((c) => c.g.key === g.key).slice(0, g.max))
    }
    const best = pool.slice(0, TICKET).map((c) => c.num)
    if (r.arrivee.every((x) => best.includes(x))) n++
  }
  return n
}
console.log(`\n③ LE PLAFOND — le ticket parfait, avec la connaissance de l'arrivée\n`)
console.log(`   G1..G4 seulement (G5 = 0) : ${String(plafond(['G1', 'G2', 'G3', 'G4'])).padStart(2)}/${N}  ${pc(plafond(['G1', 'G2', 'G3', 'G4']), N).padStart(4)}`)
console.log(`   G1..G5 (G5 = 1 cheval)   : ${String(plafond(['G1', 'G2', 'G3', 'G4', 'G5'])).padStart(2)}/${N}  ${pc(plafond(['G1', 'G2', 'G3', 'G4', 'G5']), N).padStart(4)}`)
console.log('\n   → G5 = 0 plafonne le moteur à 3%, quelles que soient les égalités tranchées.')

// ── 4. le détail course par course ──────────────────────────────────────
console.log(`\n\n④ COURSE PAR COURSE\n`)
races.forEach((r) => {
  const po = placeOf(r)
  const ps = r.arrivee.map((n) => `${n}·P${po[n] ?? '?'}`)
  const g5 = r.arrivee.filter((n) => po[n] != null && groupe(po[n]) === 'G5').length
  console.log(`   ${r.date}  ${(r.hippodrome || '').slice(0, 15).padEnd(15)} ${ps.join(' ').padEnd(42)} ${g5 ? `⚠ ${g5} en G5 → mort` : 'jouable'}`)
})
