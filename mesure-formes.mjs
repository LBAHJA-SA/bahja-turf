// ════════════════════════════════════════════════════════════════════
//  QUELLE FORME ? — les 6 formes légales, testées une par une
//  30 courses, G5 = 0, quotas respectés.
//  On compare aussi : choisir par place, ou par nombre de citations.
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs'

const GROUPS = [
  { key: 'G1', lo: 1, hi: 4 }, { key: 'G2', lo: 5, hi: 8 },
  { key: 'G3', lo: 9, hi: 10 }, { key: 'G4', lo: 11, hi: 12 },
  { key: 'G5', lo: 13, hi: 20 },
]
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
const bon = (r, sel) => r.arrivee.filter((x) => sel.includes(x)).length
const jouables = races.filter((r) => r.arrivee.every((n) => { const p = boxOrder(r.grille).indexOf(n) + 1; return p >= 1 && p <= 12 }))
const J = jouables.length

const FORMES = [[2, 2, 2, 2], [2, 3, 1, 2], [2, 3, 2, 1], [3, 2, 1, 2], [3, 2, 2, 1], [3, 3, 1, 1]]
function ticket(r, forme, par) {
  const cs = cases(r)
  const cles = ['G1', 'G2', 'G3', 'G4']
  const sel = []
  cles.forEach((k, gi) => {
    const mine = cs.filter((c) => c.g.key === k)
      .sort((a, b) => (par === 'fois' ? b.fois - a.fois || a.place - b.place : a.place - b.place))
    for (const c of mine.slice(0, forme[gi])) sel.push(c.num)
  })
  return sel
}

console.log('═'.repeat(76))
console.log(`  QUELLE FORME ?  ·  ${N} courses (${J} jouables)  ·  G5 = 0`)
console.log('═'.repeat(76))
console.log('\n  forme              par PLACE          par CITATIONS')
console.log('  ' + '─'.repeat(62))
const lignes = []
for (const f of FORMES) {
  const nom = `G1=${f[0]} G2=${f[1]} G3=${f[2]} G4=${f[3]}`
  const a = { t: races.filter((r) => bon(r, ticket(r, f, 'place')) === 5).length, j: jouables.filter((r) => bon(r, ticket(r, f, 'place')) === 5).length }
  const b = { t: races.filter((r) => bon(r, ticket(r, f, 'fois')) === 5).length, j: jouables.filter((r) => bon(r, ticket(r, f, 'fois')) === 5).length }
  lignes.push([nom, a, b])
  console.log(`  ${nom.padEnd(18)} ${String(a.t).padStart(2)}/${N} ${pc(a.t, N).padStart(4)} · ${String(a.j).padStart(2)}/${J}    ${String(b.t).padStart(2)}/${N} ${pc(b.t, N).padStart(4)} · ${String(b.j).padStart(2)}/${J}`)
}
const meilleure = lignes.sort((x, y) => (y[2].j - x[2].j) || (y[2].t - x[2].t))[0]
const figee = lignes.find((l) => l[0] === 'G1=3 G2=3 G3=1 G4=1')
console.log(`\n  meilleure forme : ${meilleure[0]}  →  ${meilleure[2].j}/${J} jouables, ${meilleure[2].t}/${N} toutes`)
console.log(`  forme d'aujourd'hui (G1=3 G2=3 G3=1 G4=1) → ${figee[2].j}/${J} jouables, ${figee[2].t}/${N} toutes`)

// ── le mélange : la forme change-t-elle si on regarde les citations ? ────
console.log(`\n\n  ET SI LA FORME SUIVAIT LES CITATIONS ?\n`)
const W = { G1: [0.43, 0.57, 0.71, 0.43], G2: [0.57, 0.43, 0.71, 0.14], G3: [0.14, 0.57], G4: [0.14, 0.29] }
function moteurScore(r, par) {
  const cs = cases(r)
  const s = (c) => (par === 'fois' ? c.fois : -c.place)
  const pick = []; const got = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  const min = { G1: 2, G2: 2, G3: 1, G4: 1 }
  const max = { G1: 3, G2: 3, G3: 2, G4: 2 }
  for (const k of ['G1', 'G2', 'G3', 'G4']) {
    cs.filter((c) => c.g.key === k).sort((a, b) => s(b) - s(a) || a.place - b.place)
      .slice(0, min[k]).forEach((c) => { pick.push(c.num); got[k]++ })
  }
  let left = 8 - pick.length
  while (left > 0) {
    const c = cs.filter((x) => !pick.includes(x.num) && got[x.g.key] < max[x.g.key]).sort((a, b) => s(b) - s(a) || a.place - b.place)[0]
    if (!c) break
    pick.push(c.num); got[c.g.key]++; left--
  }
  return { sel: pick, got }
}
for (const par of ['place', 'fois']) {
  const formesVues = {}
  let q = 0
  for (const r of races) { if (bon(r, moteurScore(r, par).sel) === 5) q++ }
  for (const r of races) { const g = moteurScore(r, par).got; const k = `G1=${g.G1} G2=${g.G2} G3=${g.G3} G4=${g.G4}`; formesVues[k] = (formesVues[k] || 0) + 1 }
  console.log(`  par ${par.padEnd(6)} : ${String(q).padStart(2)}/${N} 5/5   formes produites : ${Object.entries(formesVues).map(([f, n]) => `${f} ×${n}`).join(' · ')}`)
}

// ── le point dur : combien de fois la forme juste est fausse ───────────
console.log(`\n\n  LE POINT DUR — la forme qu'il FAUDRAIT pour gagner\n`)
let possible = 0
for (const r of jouables) {
  const o = boxOrder(r.grille)
  const gs = r.arrivee.map((n) => GROUPS.find((g) => (o.indexOf(n) + 1) >= g.lo && (o.indexOf(n) + 1) <= g.hi)?.key)
  const c = gs.reduce((a, g) => ({ ...a, [g]: (a[g] || 0) + 1 }), {})
  const formeLegal = []
  for (const f of FORMES) {
    if ((c.G1 || 0) <= f[0] && (c.G2 || 0) <= f[1] && (c.G3 || 0) <= f[2] && (c.G4 || 0) <= f[3]) formeLegal.push(f.join(','))
  }
  const bes = `${c.G1 || 0}-${c.G2 || 0}-${c.G3 || 0}-${c.G4 || 0}`
  console.log(`   ${r.date}  il faut ${bes}   formes possibles : ${formeLegal.length}  ${formeLegal.length ? '✅' : '❌ impossible'}`)
  if (formeLegal.length) possible++
}
console.log(`\n   ${possible}/${J} jouables ont au moins une forme qui peut gagner`)
console.log(`   → la forme est le vrai problème, pas le poids des cases.`)
