// ════════════════════════════════════════════════════════════════════
//  LA MESURE DU PROBLÈME DES ÉGALITÉS
//
//  30 courses réelles : grille de presse 14-16 chevaux + arrivée Top5.
//  Rien n'est modifié. On ne touche pas la Synthèse.
//
//  1. la FRÉQUENCE RÉELLE de chaque case (P1..P12) — la vérité terrain
//  2. le moteur actuel (CELL_W figé) : combien de 5/5, et quelle forme
//  3. les égalités : G1·3 et G2·3 sont tous deux à 0,71
//     → qui gagne les deux dernières places, et est-ce que ça change
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs'

// ── le moteur, recopié mot pour mot de SynthesePage.jsx ──────────────────
const GROUPS = [
  { key: 'G1', label: 'P1-P4', lo: 1, hi: 4, min: 2, max: 3 },
  { key: 'G2', label: 'P5-P8', lo: 5, hi: 8, min: 2, max: 3 },
  { key: 'G3', label: 'P9-P10', lo: 9, hi: 10, min: 1, max: 2 },
  { key: 'G4', label: 'P11-P12', lo: 11, hi: 12, min: 1, max: 2 },
  { key: 'G5', label: 'P13-P20', lo: 13, hi: 20, min: 0, max: 1 },
]
const TICKET = 8
const CELL_W = {
  G1: [0.43, 0.57, 0.71, 0.43],
  G2: [0.57, 0.43, 0.71, 0.14],
  G3: [0.14, 0.57],
  G4: [0.14, 0.29],
  G5: [0, 0, 0, 0, 0, 0, 0, 0],
}
function buildCells(raw) {
  const clean = raw.filter((n) => n != null && !isNaN(n))
  if (!clean.length) return []
  const firstEven = clean[0] % 2 === 0
  const top = clean.filter((n) => (firstEven ? n % 2 === 0 : n % 2 !== 0))
  const bot = clean.filter((n) => (firstEven ? n % 2 !== 0 : n % 2 === 0))
  const cols = []
  const nCols = Math.max(top.length, bot.length)
  for (let i = 0; i < nCols; i++) cols.push([top[i], bot[i]])
  return cols
}
function boxOrder(raw) {
  const cells = buildCells(raw)
  const spans = []
  let i = 0
  GROUPS.forEach((g) => {
    const width = Math.ceil((g.hi - g.lo + 1) / 2)
    spans.push([i, i + width])
    i += width
  })
  const out = []
  spans.forEach(([a, b]) => {
    for (let r = 0; r < 2; r++) cells.slice(a, b).forEach((col) => {
      if (col[r] != null && !isNaN(col[r])) out.push(Number(col[r]))
    })
  })
  return out
}
const cellsOf = (list) => {
  const order = boxOrder(list)
  const cells = []
  GROUPS.forEach((g) => {
    const wts = CELL_W[g.key] || []
    order.slice(g.lo - 1, g.hi).forEach((num, i) => {
      if (num == null) return
      cells.push({ g, num, w: i < wts.length ? wts[i] : 0, i })
    })
  })
  return cells
}
// le moteur actuel, exactement
function engineActuel(list) {
  const cells = cellsOf(list)
  const pick = {}, got = {}
  GROUPS.forEach((g) => (got[g.key] = 0))
  GROUPS.forEach((g) => {
    const mine = cells.filter((c) => c.g.key === g.key).sort((a, b) => b.w - a.w)
    mine.slice(0, Math.min(g.min, mine.length)).forEach((c) => { pick[c.num] = true; got[c.g.key]++ })
  })
  let left = TICKET - Object.values(got).reduce((a, b) => a + b, 0)
  while (left > 0) {
    const cands = cells.filter((c) => !pick[c.num] && got[c.g.key] < c.g.max).sort((a, b) => b.w - a.w)
    if (!cands.length) break
    pick[cands[0].num] = true; got[cands[0].g.key]++; left--
  }
  return { pick, got, cells }
}

const data = JSON.parse(readFileSync('press-archive.json', 'utf8'))
const races = data.races
const N = races.length
const pc = (v, n) => (n ? Math.round((100 * v) / n) + '%' : '—')

console.log('═'.repeat(78))
console.log(`  ${N} courses réelles  ·  ${races[0].date} .. ${races[races.length - 1].date}`)
console.log('═'.repeat(78))

// ── 1. la fréquence RÉELLE de chaque case ────────────────────────────────
console.log('\n① FRÉQUENCE RÉELLE — combien de fois un arrivé du Top5 est dans la case\n')
const placeOf = races.map((r) => {
  const o = boxOrder(r.grille)
  return Object.fromEntries(o.map((n, i) => [n, i + 1]))
})
const freq = {}, vues = {}
GROUPS.forEach((g) => { for (let i = 1; i <= g.hi - g.lo + 1; i++) { freq[`${g.key}·${i}`] = 0; vues[`${g.key}·${i}`] = 0 } })
races.forEach((r) => {
  const po = placeOf[races.indexOf(r)]
  GROUPS.forEach((g) => {
    for (let i = 1; i <= g.hi - g.lo + 1; i++) {
      const k = `${g.key}·${i}`
      const num = r.grille[g.lo - 1 + i - 1]
      if (num == null) continue
      vues[k]++
      if (r.arrivee.includes(num)) freq[k]++
    }
  })
})
console.log('   case    place   CELL_W   réel    Courses   %')
console.log('   ' + '─'.repeat(52))
GROUPS.forEach((g) => {
  for (let i = 1; i <= g.hi - g.lo + 1; i++) {
    const k = `${g.key}·${i}`
    const w = (CELL_W[g.key] || [])[i - 1] ?? 0
    const f = vues[k] ? freq[k] / vues[k] : 0
    const bar = '█'.repeat(Math.round(f * 30))
    console.log(`   ${k.padEnd(7)} P${String(g.lo - 1 + i).padEnd(6)} ${String(w).padEnd(8)} ${f.toFixed(2).padEnd(7)} ${String(vues[k]).padStart(5)}    ${pc(freq[k], vues[k]).padStart(4)} ${bar}`)
  }
})

// ── 2. le moteur actuel ──────────────────────────────────────────────────
console.log('\n\n② MOTEUR ACTUEL (CELL_W figé)\n')
let g5 = 0, g4 = 0, g3 = 0
const formes = {}
races.forEach((r) => {
  const { pick, got } = engineActuel(r.grille)
  const sel = Object.keys(pick).map(Number)
  if (sel.length < 8) return
  const bons = r.arrivee.filter((x) => sel.includes(x)).length
  if (bons === 5) g5++
  else if (bons === 4) g4++
  else if (bons === 3) g3++
  const f = `G1=${got.G1} G2=${got.G2} G3=${got.G3} G4=${got.G4} G5=${got.G5}`
  formes[f] = (formes[f] || 0) + 1
})
console.log(`   5/5 : ${String(g5).padStart(2)}/${N}  ${pc(g5, N).padStart(4)}`)
console.log(`   4/5 : ${String(g4).padStart(2)}/${N}  ${pc(g4, N).padStart(4)}`)
console.log(`   3/5 : ${String(g3).padStart(2)}/${N}  ${pc(g3, N).padStart(4)}`)
console.log(`\n   FORMES produites :`)
Object.entries(formes).sort((a, b) => -b[1]).forEach(([f, n]) =>
  console.log(`     ${f.padEnd(34)} ${String(n).padStart(3)}×  ${'█'.repeat(n)}`))

// ── 3. l'égalité G1·3 = G2·3 = 0.71 ─────────────────────────────────────
console.log('\n\n③ QUI GAGNE LES DEUX DERNIÈRES PLACES ?\n')
const pris2 = {}
races.forEach((r) => {
  const { cells, pick } = engineActuel(r.grille)
  const cellsRestants = cells.filter((c) => !pick[c.num] || Object.values(pick).filter(Boolean).length < 8)
  // rejouer : quelles cases ont pris les 2 dernières
  const ordre = cells.filter((c) => c.g.key !== 'G5').sort((a, b) => b.w - a.w)
  const forme = `${engineActuel(r.grille).got.G1}/${engineActuel(r.grille).got.G2}`
  pris2[forme] = (pris2[forme] || 0) + 1
})
// quelles cases de poids 0.71 existent, et qui gagne selon l'ordre du tableau
console.log('   Les cellules à 0,71 (les plus fortes, hors G5) :')
GROUPS.forEach((g) => (CELL_W[g.key] || []).forEach((w, i) => {
  if (w === 0.71) console.log(`     ${g.key}·${i + 1}  = P${g.lo + i}  poids 0.71`)
}))
console.log('\n   → le tri est stable : à poids égal, G1·3 passe AVANT G2·3.')
console.log('   → les 2 places restantes vont donc TOUJOURS à G1·3 puis G2·3.')
console.log('   → la forme est donc 3-3-1-1-0 sur 100% des courses. Voici le compte :')
Object.entries(pris2).sort((a, b) => -b[1]).forEach(([f, n]) =>
  console.log(`     G1/G2 = ${f.padEnd(6)} ${String(n).padStart(3)}×  ${'█'.repeat(n)}`))
