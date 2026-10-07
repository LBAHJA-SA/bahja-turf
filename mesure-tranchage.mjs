// ════════════════════════════════════════════════════════════════════
//  RÉSOUDRE LES ÉGALITÉS — 30 courses réelles
//
//  Règles du carnet, non négociables :
//    · le découpage G1..G5 et la lecture en travers ne bougent pas
//    · le ticket va de G1 à G4, G5 reste à zéro
//    · les égalités, elles, se décident course par course
//
//  On compare : le moteur figé, le plafond réel, et cinq façons
//  de trancher quand deux cases pèsent pareil.
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

function buildCells(raw) {
  const clean = raw.filter((n) => n != null && !isNaN(n))
  if (!clean.length) return []
  const firstEven = clean[0] % 2 === 0
  const top = clean.filter((n) => (firstEven ? n % 2 === 0 : n % 2 !== 0))
  const bot = clean.filter((n) => (firstEven ? n % 2 !== 0 : n % 2 === 0))
  const cols = []
  for (let i = 0; i < Math.max(top.length, bot.length); i++) cols.push([top[i], bot[i]])
  return cols
}
function boxOrder(raw) {
  const cells = buildCells(raw)
  const spans = []; let i = 0
  for (const g of GROUPS) { const w = Math.ceil((g.hi - g.lo + 1) / 2); spans.push([i, i + w]); i += w }
  const out = []
  for (const [a, b] of spans) for (let r = 0; r < 2; r++) cells.slice(a, b).forEach((c) => {
    if (c[r] != null && !isNaN(c[r])) out.push(Number(c[r]))
  })
  return out
}
const ACTIFS = GROUPS.filter((g) => g.key !== 'G5')     // G5 reste à zéro
function cellsOf(list) {
  const order = boxOrder(list); const cells = []
  for (const g of GROUPS) {
    const wts = CELL_W[g.key] || []
    order.slice(g.lo - 1, g.hi).forEach((num, i) => {
      if (num == null) return
      cells.push({ g, num, w: i < wts.length ? wts[i] : 0, i, place: g.lo + i })
    })
  }
  return cells
}

// ── un moteur générique : poids fournis, règle de départage fournie ───────
function engine(list, poids, tie, T = TICKET) {
  const cells = cellsOf(list)
  const poidsDe = (c) => (poids ? poids[c.g.key][c.i] ?? 0 : c.w)
  const pick = {}; const got = {}
  for (const g of GROUPS) got[g.key] = 0
  // 1) les minimums
  for (const g of ACTIFS) {
    const mine = cells.filter((c) => c.g.key === g.key)
    mine.sort((a, b) => poidsDe(b) - poidsDe(a) || tie(a, b, list))
    for (const c of mine.slice(0, Math.min(g.min, mine.length))) { pick[c.num] = true; got[c.g.key]++ }
  }
  // 2) le reste, à la case la plus forte qui reste
  let left = T - Object.values(got).reduce((a, b) => a + b, 0)
  while (left > 0) {
    const cands = cells.filter((c) => !pick[c.num] && got[c.g.key] < c.g.max)
    if (!cands.length) break
    cands.sort((a, b) => poidsDe(b) - poidsDe(a) || tie(a, b, list))
    pick[cands[0].num] = true; got[cands[0].g.key]++; left--
  }
  return { pick, got }
}

// ── le poids qu'il faut vraiment, mesuré sur ces 30 courses ─────────────
const data = JSON.parse(readFileSync('press-archive.json', 'utf8'))
const races = data.races
const N = races.length
const placeOf = (r) => Object.fromEntries(boxOrder(r.grille).map((n, i) => [n, i + 1]))
const hits = {}; const vues = {}
for (const g of GROUPS) for (let i = 0; i < g.hi - g.lo + 1; i++) { hits[`${g.key}.${i}`] = 0; vues[`${g.key}.${i}`] = 0 }
for (const r of races) {
  const po = placeOf(r)
  for (const c of cellsOf(r.grille)) {
    const k = `${c.g.key}.${c.i}`
    if (c.g.key === 'G5') continue
    vues[k]++
    if (r.arrivee.includes(c.num)) hits[k]++
  }
}
const MESURE = { G1: [], G2: [], G3: [], G4: [], G5: [] }
for (const g of ACTIFS) for (let i = 0; i < g.hi - g.lo + 1; i++) MESURE[g.key][i] = hits[`${g.key}.${i}`] / Math.max(1, vues[`${g.key}.${i}`])

// ── les façons de trancher une égalité ──────────────────────────────────
const TIES = {
  'figée — G1 gagne toujours (aujourd’hui)': (a, b) => a.g.lo - b.g.lo,
  'la case la plus proche de la cote (P basse)': (a, b) => a.place - b.place,
  'la case la plus loin (P haute)': (a, b) => b.place - a.place,
  'alterner : G1 un coup, G2 le suivant': (a, b) => (a.g.key === 'G1' ? -1 : 1) - (b.g.key === 'G1' ? -1 : 1),
  'tirage : la plus haute case gagne': (a, b, list) => (a.num * 7 + list.length * 13) % 5 - (b.num * 7 + list.length * 13) % 5,
}

const pc = (v, n) => (n ? Math.round((100 * v) / n) + '%' : '—')
const jouer = (fn) => {
  let q = 0, quatre = 0, trois = 0; const formes = {}
  for (const r of races) {
    const { pick, got } = fn(r)
    const sel = Object.keys(pick).map(Number)
    if (sel.length < TICKET) continue
    const b = r.arrivee.filter((x) => sel.includes(x)).length
    if (b === 5) q++; else if (b === 4) quatre++; else if (b === 3) trois++
    const f = `G1=${got.G1} G2=${got.G2} G3=${got.G3} G4=${got.G4}`
    formes[f] = (formes[f] || 0) + 1
  }
  return { q, quatre, trois, formes }
}

console.log('═'.repeat(74))
console.log(`  ${N} courses réelles  ·  2021..2025  ·  ticket de 8, G1→G4, G5 zéro`)
console.log('═'.repeat(74))
console.log('\n① LA MESURE : 5/5 sur 30 courses\n')
console.log('   moteur                                                5/5      4/5    3/5')
console.log('   ' + '─'.repeat(70))
const r0 = jouer((r) => engine(r.grille, null, TIES[Object.keys(TIES)[0]]))
console.log(`   moteur figé (aujourd'hui)                            ${String(r0.q).padStart(3)} ${pc(r0.q, N).padStart(5)}  ${String(r0.quatre).padStart(5)}  ${String(r0.trois).padStart(5)}`)

// le plafond : les 8 meilleures cases mesurées, quotas respectés
let oracle = 0
for (const r of races) {
  const cells = cellsOf(r.grille).filter((c) => c.g.key !== 'G5')
  const cho = []; const got = {}
  for (const g of ACTIFS) cho.push(...cells.filter((c) => c.g.key === g.key).sort((a, b) => MESURE[b.g.key][b.i] - MESURE[a.g.key][a.i]).slice(0, g.max))
  const best = cho.sort((a, b) => MESURE[b.g.key][b.i] - MESURE[a.g.key][a.i]).slice(0, TICKET)
  if (r.arrivee.every((x) => best.map((c) => c.num).includes(x))) oracle++
}
console.log(`   plafond (les 8 meilleures cases, mesurées)            ${String(oracle).padStart(3)} ${pc(oracle, N).padStart(5)}   ← le maximum possible`)

console.log('\n\n② TRANCHER L\'ÉGALITÉ — avec les poids MESURÉS, cinq règles\n')
for (const [nom, tie] of Object.entries(TIES)) {
  const r = jouer((rr) => engine(rr.grille, MESURE, tie))
  const nf = Object.keys(r.formes).length
  console.log(`   ${nom.padEnd(48)} ${String(r.q).padStart(2)} ${pc(r.q, N).padStart(5)}   ${nf} formes`)
}

console.log('\n\n③ CE QUE ÇA CHANGE — formes produites\n')
const rows = []
for (const [nom, tie] of Object.entries(TIES)) {
  const r = jouer((rr) => engine(rr.grille, nom.startsWith('figée') ? null : MESURE, tie))
  rows.push([nom, r])
}
const toutes = [...new Set(rows.flatMap(([, r]) => Object.keys(r.formes)))]
console.log('   ' + 'règle'.padEnd(46) + toutes.map((f) => f.split(' ').map((x) => x.replace('=', '')).join('/').padStart(7)).join(''))
for (const [nom, r] of rows) {
  console.log('   ' + nom.padEnd(46) + toutes.map((f) => String(r.formes[f] ?? 0).padStart(7)).join('') + `   5/5=${r.q}`)
}

console.log('\n\n④ DÉTAIL : quelles cases, course par course\n')
const cible = jouer((rr) => engine(rr.grille, MESURE, TIES['la case la plus proche de la cote (P basse)']))
const ancien = jouer((rr) => engine(rr.grille, null, TIES[Object.keys(TIES)[0]]))
let g = 0, ga = 0
for (const r of races) {
  const A = Object.keys(ancienPick(r.grille)).map(Number)
  const B = Object.keys(engine(r.grille, MESURE, TIES['la case la plus proche de la cote (P basse)']).pick).map(Number)
  const bA = r.arrivee.filter((x) => A.includes(x)).length
  const bB = r.arrivee.filter((x) => B.includes(x)).length
  if (bB === 5) g++
  if (bA === 5) ga++
  const po = placeOf(r)
  const fmt = (a) => a.map((n) => `P${po[n]}`).sort((a, b) => +a.slice(1) - +b.slice(1)).join(' ')
  console.log(`   ${r.date}  ${(r.hippodrome || '').slice(0, 14).padEnd(14)} arrivée ${r.arrivee.map((n) => `P${po[n]}`).join('-')}`)
  console.log(`      figé   ${fmt(A).padEnd(30)} ${bA}/5`)
  console.log(`      mesuré ${fmt(B).padEnd(30)} ${bB}/5  ${bB > bA ? '✅' : bB < bA ? '❌' : '='}`)
}
console.log(`\n   figé    : ${ga}/30  ${pc(ga, N)}`)
console.log(`   mesuré  : ${g}/30  ${pc(g, N)}`)
function ancienPick(l) { return engine(l, null, TIES[Object.keys(TIES)[0]]).pick }
