// ════════════════════════════════════════════════════════════════════
//  G5 = 0 — où se perd la course, et ce qu'on peut faire
//  30 courses réelles, avec les «fois cité» de la presse.
//
//  Règles du carnet, intactes :
//    · découpage G1..G5 inchangé, lecture en travers inchangée
//    · ticket de 8, de G1 à G4, G5 toujours zéro
//    · les quotas sont des bornes, pas une forme imposée
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
  const clean = raw.filter((n) => n != null && !isNaN(n))
  const firstEven = clean[0] % 2 === 0
  const top = clean.filter((n) => (firstEven ? n % 2 === 0 : n % 2 !== 0))
  const bot = clean.filter((n) => (firstEven ? n % 2 !== 0 : n % 2 === 0))
  const cols = []
  for (let i = 0; i < Math.max(top.length, bot.length); i++) cols.push([top[i], bot[i]])
  return cols
}
// l'ordre de lecture du carnet : travers, groupe par groupe
function boxOrder(raw) {
  const cells = buildCells(raw); const spans = []; let i = 0
  for (const g of GROUPS) { const w = Math.ceil((g.hi - g.lo + 1) / 2); spans.push([i, i + w]); i += w }
  const out = []
  for (const [a, b] of spans) for (let r = 0; r < 2; r++) cells.slice(a, b).forEach((c) => {
    if (c[r] != null && !isNaN(c[r])) out.push(Number(c[r]))
  })
  return out
}
// la GRILLE avec le nombre de citations, remise dans l'ordre de lecture
function grilleLue(r) {
  const ordre = boxOrder(r.grille)
  const foisDe = new Map(r.grille_foix.map(([p, n, f]) => [n, f]))
  return ordre.map((n, i) => ({ place: i + 1, num: n, fois: foisDe.get(n) ?? null }))
}

const data = JSON.parse(readFileSync('press-archive-fois.json', 'utf8'))
const races = data.races
const N = races.length
const pc = (v, n) => (n ? Math.round((100 * v) / n) + '%' : '—')
const groupeDe = (p) => GROUPS.find((g) => p >= g.lo && p <= g.hi)?.key

// ── le moteur actuel, mot pour mot ──────────────────────────────────────
function moteurActuel(r) {
  const cells = []
  for (const g of GROUPS) {
    const w = CELL_W[g.key] || []
    boxOrder(r.grille).slice(g.lo - 1, g.hi).forEach((num, i) => {
      if (num != null) cells.push({ g, num, w: w[i] ?? 0, i, place: g.lo + i })
    })
  }
  const pick = {}; const got = {}
  for (const g of GROUPS) got[g.key] = 0
  for (const g of ACTIFS) {
    const mine = cells.filter((c) => c.g.key === g.key).sort((a, b) => b.w - a.w)
    for (const c of mine.slice(0, Math.min(g.min, mine.length))) { pick[c.num] = true; got[g.key]++ }
  }
  let left = TICKET - Object.values(got).reduce((a, b) => a + b, 0)
  while (left > 0) {
    const c = cells.filter((x) => !pick[x.num] && got[x.g.key] < x.g.max).sort((a, b) => b.w - a.w)[0]
    if (!c) break
    pick[c.num] = true; got[c.g.key]++; left--
  }
  return { sel: Object.keys(pick).map(Number), got }
}

// ── moteur générique : un score par case, les quotas restent des bornes ──
function moteur(r, score) {
  const cells = grilleLue(r).map((c) => ({ ...c, g: GROUPS.find((g) => c.place >= g.lo && c.place <= g.hi) }))
    .filter((c) => c.num != null)
  for (const c of cells) c.s = score(c, cells)
  const pick = {}; const got = {}
  for (const g of GROUPS) got[g.key] = 0
  for (const g of ACTIFS) {
    const mine = cells.filter((c) => c.g.key === g.key).sort((a, b) => b.s - a.s || a.place - b.place)
    for (const c of mine.slice(0, Math.min(g.min, mine.length))) { pick[c.num] = true; got[g.key]++ }
  }
  let left = TICKET - Object.values(got).reduce((a, b) => a + b, 0)
  while (left > 0) {
    const c = cells.filter((x) => !pick[x.num] && got[x.g.key] < x.g.max).sort((a, b) => b.s - a.s || a.place - b.place)[0]
    if (!c) break
    pick[c.num] = true; got[c.g.key]++; left--
  }
  return { sel: Object.keys(pick).map(Number), got }
}

// ── le plafond : tous les tickets possibles, quotas respectés ───────────
function tousLesTickets(r) {
  const cases = {}
  for (const g of ACTIFS) {
    const dispo = grilleLue(r).filter((c) => c.place >= g.lo && c.place <= g.hi && c.num != null)
    cases[g.key] = []
    for (let k = g.min; k <= g.max; k++) {
      const comb = []
      const rec = (i, chosen) => {
        if (i === dispo.length) { if (k === chosen.length) cases[g.key].push([...chosen]); return }
        rec(i + 1, chosen); rec(i + 1, [...chosen, dispo[i].num])
      }
      rec(0, [])
    }
  }
  const out = []
  for (const a of cases.G1) for (const b of cases.G2) for (const c of cases.G3) for (const d of cases.G4) {
    const t = [...a, ...b, ...c, ...d]
    if (t.length === TICKET && new Set(t).size === TICKET) out.push({ sel: t, g: [a.length, b.length, c.length, d.length] })
  }
  return out
}

const bon = (r, sel) => r.arrivee.filter((x) => sel.includes(x)).length

// ════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(78))
console.log(`  G5 = 0  ·  ${N} courses  ·  2021..2025  ·  ticket de 8`)
console.log('═'.repeat(78))

// ── ① les 9 courses jouables ────────────────────────────────────────────
const jouables = races.filter((r) => r.arrivee.every((n) => {
  const p = boxOrder(r.grille).indexOf(n) + 1
  return p >= 1 && p <= 12
}))
const J = jouables.length
console.log(`\n① ${J} courses jouables (les 5 arrivés sont tous en P1-P12)\n`)
console.log('   date         arrivée                                    groupes des 5')
for (const r of jouables) {
  const o = boxOrder(r.grille)
  const gs = r.arrivee.map((n) => groupeDe(o.indexOf(n) + 1) ?? '?')
  const compte = gs.reduce((a, g) => ({ ...a, [g]: (a[g] || 0) + 1 }), {})
  console.log(`   ${r.date}  ${r.arrivee.map(String).join('-').padEnd(12)} ${gs.join(' ').padEnd(16)} ${JSON.stringify(compte)}`)
}

// ── ② le plafond, course par course ─────────────────────────────────────
console.log(`\n\n② LE PLAFOND — le ticket parfait, quotas respectés, G5 = 0\n`)
let plafondJ = 0
for (const r of jouables) {
  const ts = tousLesTickets(r)
  const gagnants = ts.filter((t) => bon(r, t.sel) === 5)
  if (gagnants.length) plafondJ++
  else {
    const mieux = ts.reduce((a, t) => Math.max(a, bon(r, t.sel)), 0)
    console.log(`   ${r.date}  AUCUN ticket 8/8 ne gagne — maximum ${mieux}/5  (il faut les 5, donc 5 places différentes)`)
  }
}
console.log(`\n   plafond sur les ${J} jouables : ${plafondJ}/${J} = ${pc(plafondJ, J)}`)

// ── ③ les formes possibles ──────────────────────────────────────────────
console.log(`\n\n③ LES FORMES LÉGALES (toutes respectent min/max) — il y en a 6\n`)
const formes = new Set()
for (const a of [2, 3]) for (const b of [2, 3]) for (const c of [1, 2]) for (const d of [1, 2]) {
  if (a + b + c + d === TICKET) formes.add(`G1=${a} G2=${b} G3=${c} G4=${d}`)
}
for (const f of [...formes].sort()) console.log(`   ${f}`)

// ── ④ le moteur actuel, mesuré ──────────────────────────────────────────
console.log(`\n\n④ LE MOTEUR ACTUEL\n`)
const curJ = jouables.filter((r) => bon(r, moteurActuel(r).sel) === 5).length
const curT = races.filter((r) => bon(r, moteurActuel(r).sel) === 5).length
const curF = {}
for (const r of races) { const { got } = moteurActuel(r); const f = `G1=${got.G1} G2=${got.G2} G3=${got.G3} G4=${got.G4}`; curF[f] = (curF[f] || 0) + 1 }
console.log(`   sur les ${J} jouables : ${curJ}/${J} = ${pc(curJ, J)}`)
console.log(`   sur les ${N} courses  : ${curT}/${N} = ${pc(curT, N)}`)
console.log(`   formes produites : ${Object.entries(curF).map(([f, n]) => `${f} ×${n}`).join(' · ')}`)

// ── ⑤ les scores possibles, mesurés ────────────────────────────────────
console.log(`\n\n⑤ UN SCORE RÉEL À LA PLACE DES POIDS INVENTÉS\n`)
const maxFois = (cells) => Math.max(1, ...cells.map((c) => c.fois || 0))
const SCORES = {
  'fois cités (le nombre écrit à côté)': (c, cells) => c.fois ?? 0,
  'fois cités ÷ max de la course': (c, cells) => (c.fois ?? 0) / maxFois(cells),
  'rang du nombre de citations': (c, cells) => {
    const tri = [...cells].filter((x) => x.num != null).sort((a, b) => (b.fois ?? 0) - (a.fois ?? 0))
    return -tri.findIndex((x) => x.place === c.place)
  },
  'place seule (la grille)': (c) => -c.place,
  'citations puis place (classement)': (c, cells) => {
    const tri = [...cells].filter((x) => x.num != null).sort((a, b) => (b.fois ?? 0) - (a.fois ?? 0) || a.place - b.place)
    return tri.findIndex((x) => x.place === c.place)
  },
}
const best = []
for (const [nom, sc] of Object.entries(SCORES)) {
  const j = jouables.filter((r) => bon(r, moteur(r, sc).sel) === 5).length
  const t = races.filter((r) => bon(r, moteur(r, sc).sel) === 5).length
  const f = {}
  for (const r of races) { const { got } = moteur(r, sc); const k = `G1=${got.G1} G2=${got.G2} G3=${got.G3} G4=${got.G4}`; f[k] = (f[k] || 0) + 1 }
  best.push([nom, j, t, Object.keys(f).length])
}
console.log('   score                                jouables    toutes   formes')
console.log('   ' + '─'.repeat(66))
console.log(`   ${'(moteur actuel)'.padEnd(36)} ${String(curJ).padStart(4)}/${J}  ${pc(curJ, J).padStart(6)} ${String(curT).padStart(5)}/${N}  ${pc(curT, N).padStart(6)} ${'1'.padStart(7)}`)
for (const [nom, j, t, nf] of best) {
  console.log(`   ${nom.padEnd(36)} ${String(j).padStart(4)}/${J}  ${pc(j, J).padStart(6)} ${String(t).padStart(5)}/${N}  ${pc(t, N).padStart(6)} ${String(nf).padStart(7)}`)
}
