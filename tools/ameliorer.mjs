/* =============================================================================
 * tools/ameliorer.mjs — AMÉLIORER LES DEUX SEULS CHIFFRES QUI COMPTENT (20/10/2026)
 *
 *   ① les 3 premiers ENSEMBLE dans le ticket      (46,9 % P96 · 44,4 % R18)
 *   ② les 3 premiers dans le BON ORDRE (1-2-3)    ( 0,0 % P96 ·  0,0 % R18)
 *
 * On ne rajoute AUCUN cheval. On ne touche pas à la main. On cherche, on mesure,
 * et on garde seulement ce qui gagne sur les DEUX moitiés ET sur R18.
 *
 *   PARTIE 1 — ① : toutes les répartitions de 8 chevaux × 3 façons de choisir
 *              dans chaque bloc (carnet · marché · fusion).
 *   PARTIE 2 — ② : l'ordre du ticket. 6 règles d'ordonnancement comparées.
 *
 *   node tools\ameliorer.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, computeStats } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const wid = (s, n) => { const x = String(s); return x + ' '.repeat(Math.max(0, n - x.length)) }
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')

/* ── corpus ─────────────────────────────────────────────────────────────── */
const P96 = chargerEchantillon('cotes').map((c) => ({ ...c, discipline: c.discipline || '', stats: null }))

function corpus18() {
  const BRUT = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  const TOUT = Array.isArray(BRUT) ? BRUT : Object.values(BRUT)
  const K = JSON.parse(fs.readFileSync('data/cotes.json', 'utf8'))
  const out = []
  for (const a of TOUT) {
    if (!a || !a.date || (a.arrivee || []).length < 5) continue
    const runners = (a.runners || []).map(Number).filter(Number.isFinite)
    const syn = (a.synthese || []).map(Number).filter(Number.isFinite)
    if (runners.length < 8 || syn.length < 10) continue
    const brut = K[a.cle] || (a.courseId && K[a.courseId]) || null
    const liste = brut ? (Array.isArray(brut) ? brut : brut.cotes || []) : []
    const cotes = {}
    for (const x of liste) {
      const n = Number(x.num), v = Number(x.cote)
      if (Number.isFinite(n) && Number.isFinite(v) && v > 0) cotes[n] = { cote: v }
    }
    out.push({
      date: a.date, synthese: syn, runners,
      arrivee: (a.arrivee || []).map(Number).slice(0, 5),
      cotes: Object.keys(cotes).length >= 10 ? cotes : null,
      discipline: a.discipline || '', stats: null,
    })
  }
  return out.sort((x, y) => x.date.localeCompare(y.date))
}
const R18 = corpus18()

const ORD = (g) => g.groupes.flatMap((x) => x.cases).slice()
  .sort((a, b) => a.slot - b.slot).map((x) => ({ p: { num: x.num }, s: null, ok: true }))

const cote = (c, n) => {
  const v = c.cotes?.[n]
  const x = Number(typeof v === 'object' ? v?.cote : v)
  return Number.isFinite(x) && x > 0 ? x : NaN
}

/* le classement « fusion » : rang de presse + rang de marché */
function classementFusion(c, g) {
  const marche = c.runners.filter((n) => Number.isFinite(cote(c, n)))
  const rm = new Map(marche.slice().sort((a, b) => cote(c, a) - cote(c, b)).map((n, i) => [n, i + 1]))
  const base = ORD(g).map((x, i) => ({ n: x.p.num, rp: i + 1 }))
  return base.sort((a, b) => ((a.rp + (rm.get(a.n) ?? 60)) - (b.rp + (rm.get(b.n) ?? 60))) || a.rp - b.rp)
    .map((x) => ({ p: { num: x.n }, s: null, ok: true }))
}

/* ── une répartition de 8 sur la grille ─────────────────────────────────── */
const grilleAvec = (g, q) => ({
  ...g,
  groupes: g.groupes.map((x, i) => ({ ...x, quota: q[i] })),
})

const CHOIX = {
  CCCC: { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'carnet' },
  CCCM: { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche' },
  CCFM: { G1: 'carnet', G2: 'carnet', G3: 'fusion', G4: 'marche' },
  CFFM: { G1: 'carnet', G2: 'fusion', G3: 'fusion', G4: 'marche' },
  FFFM: { G1: 'fusion', G2: 'fusion', G3: 'fusion', G4: 'marche' },
  FFFF: { G1: 'fusion', G2: 'fusion', G3: 'fusion', G4: 'fusion' },
}

function ticketDe(c, q, choix) {
  const g = buildGrid(c.synthese, c.runners)
  const gq = grilleAvec(g, q)
  const cl = classementFusion(c, g)
  const r = remplirGrille(gq, cl, c.discipline, c.cotes, c.stats, choix)
  return { t: r.ticket.map(Number), g }
}

/* ── les métriques ──────────────────────────────────────────────────────── */
function noter(C, f) {
  let n = 0, trio = 0, exact = 0, t3case = 0, gagnant = 0, cinq = 0, longueur = 0
  for (const c of C) {
    const t = f(c)
    if (!t || t.length !== 8) continue
    n++; longueur += t.length
    const s = new Set(t)
    const trois = c.arrivee.slice(0, 3)
    if (trois.every((x) => s.has(x))) trio++
    if (t[0] === trois[0] && t[1] === trois[1] && t[2] === trois[2]) exact++
    if (trois.every((x) => t.slice(0, 3).includes(x))) t3case++
    if (t[0] === trois[0]) gagnant++
    if (c.arrivee.every((x) => s.has(x))) cinq++
  }
  return { n, trio, exact, t3case, gagnant, cinq, longueur }
}

/* ═════════════════════════ PARTIE 1 — ① LE TRIO ═══════════════════════════ */
console.log('')
console.log('  ╔══════════════════════════════════════════════════════════════════════╗')
console.log('  ║  PARTIE 1 — les 3 premiers ENSEMBLE : 8 chevaux, toutes les règles   ║')
console.log('  ╚══════════════════════════════════════════════════════════════════════╝')

const combos = []
for (let q1 = 1; q1 <= 4; q1++)
  for (let q2 = 0; q2 <= 4; q2++)
    for (let q3 = 1; q3 <= 3; q3++)
      for (let q4 = 0; q4 <= 2; q4++)
        for (let q5 = 0; q5 <= 1; q5++)
          if (q1 + q2 + q3 + q4 + q5 === 8) combos.push([q1, q2, q3, q4, q5])

console.log('' + (combos.length) + ' répartitions de 8 chevaux × ' + Object.keys(CHOIX).length + ' règles de choix = ' +
  (combos.length * Object.keys(CHOIX).length) + ' combinaisons testées sur P96')

/* chaque combinaison n'est REJOUÉE QU'UNE FOIS : on garde les tickets, puis on note */
const resultats = []
const m2 = Math.floor(P96.length / 2)
for (const q of combos) {
  for (const [nom, choix] of Object.entries(CHOIX)) {
    const T96 = P96.map((c) => ticketDe(c, q, choix).t)
    const T18 = R18.map((c) => ticketDe(c, q, choix).t)
    const noterListe = (C, T) => {
      let n = 0, trio = 0, exact = 0, cinq = 0
      C.forEach((c, i) => {
        const t = T[i]
        if (!t || t.length !== 8) return
        n++
        const s = new Set(t)
        const trois = c.arrivee.slice(0, 3)
        if (trois.every((x) => s.has(x))) trio++
        if (t[0] === trois[0] && t[1] === trois[1] && t[2] === trois[2]) exact++
        if (c.arrivee.every((x) => s.has(x))) cinq++
      })
      return { n, trio, exact, cinq }
    }
    const a = noterListe(P96, T96)
    if (a.n < 95) continue
    const h1 = noterListe(P96.slice(0, m2), T96.slice(0, m2))
    const h2 = noterListe(P96.slice(m2), T96.slice(m2))
    const r = noterListe(R18, T18)
    resultats.push({
      q: q.join('-'), choix: nom,
      trio: a.trio / a.n, h1: h1.trio / h1.n, h2: h2.trio / h2.n,
      r18: r.n ? r.trio / r.n : 0, cinq: a.cinq / a.n, exact: a.exact / a.n,
    })
  }
}
resultats.sort((x, y) => y.trio - x.trio)

console.log('')
console.log('  ' + wid('répartition', 13) + wid('choix', 7) + wid('trio P96', 10) + wid('1re moit.', 11) + wid('2e moit.', 11) + wid('trio R18', 10) + '5/5 P96')
console.log('  ' + '─'.repeat(71))
for (const r of resultats.slice(0, 15)) {
  console.log('  ' + wid(r.q, 13) + wid(r.choix, 7) + wid(pct(r.trio * 100, 100), 10) +
    wid(pct(r.h1 * 100, 100), 11) + wid(pct(r.h2 * 100, 100), 11) + wid(pct(r.r18 * 100, 100), 10) + pct(r.cinq * 100, 100))
}
const prod = resultats.find((r) => r.q === '4-2-1-1-0' && r.choix === 'CCCM')
console.log('  ' + '─'.repeat(71))
console.log('  production 4-2-1-1-0 · CCCM : trio ' + pct(prod.trio * 100, 100) + ' · moitiés ' +
  pct(prod.h1 * 100, 100) + ' / ' + pct(prod.h2 * 100, 100) + ' · R18 ' + pct(prod.r18 * 100, 100) +
  ' · 5/5 ' + pct(prod.cinq * 100, 100))

/* celui qui gagne partout */
const solide = resultats.filter((r) => r.h1 > prod.h1 && r.h2 > prod.h2 && r.r18 >= prod.r18 - 0.06 && r.cinq >= prod.cinq - 0.02)
console.log('')
console.log('  règles qui battent la production sur LES DEUX MOITIÉS et ne s\'écroulent pas ailleurs : ' + solide.length)
for (const r of solide.slice(0, 8)) {
  console.log('    ' + wid(r.q, 13) + wid(r.choix, 7) + 'trio ' + pct(r.trio * 100, 100) +
    ' · moitiés ' + pct(r.h1 * 100, 100) + ' / ' + pct(r.h2 * 100, 100) +
    ' · R18 ' + pct(r.r18 * 100, 100) + ' · 5/5 ' + pct(r.cinq * 100, 100))
}

/* ═════════════════════ PARTIE 2 — ② L'ORDRE DU TICKET ════════════════════ */
console.log('')
console.log('  ╔══════════════════════════════════════════════════════════════════════╗')
console.log('  ║  PARTIE 2 — l\'ordre du ticket : 1-2-3 exact, les 3 en tête, le 1er   ║')
console.log('  ╚══════════════════════════════════════════════════════════════════════╝')

/* les stats de production : computeStats sur le corpus (validé 96/96) */
const STATS96 = computeStats(P96)
const STATS18 = computeStats(R18)

/* les 8 chevaux de la production */
const huit = (c) => ticketDe(c, [4, 2, 1, 1, 0], CHOIX.CCCM)

const rangPresse = (c, n) => { const i = c.synthese.indexOf(n); return i < 0 ? 99 : i + 1 }
const rangMarche = (c, n) => {
  const m = c.runners.filter((x) => Number.isFinite(cote(c, x))).sort((a, b) => cote(c, a) - cote(c, b))
  const i = m.indexOf(n)
  return i < 0 ? 99 : i + 1
}

const ORDRES = {
  'stats podium (production)': (c, t, g) => {
    const st = c.stats || null
    return null
  },
  'carnet P croissant': (c, t) => t.slice().sort((a, b) => (g0(c).slotParNum[a] ?? 99) - (g0(c).slotParNum[b] ?? 99)),
  'presse croissante': (c, t) => t.slice().sort((a, b) => rangPresse(c, a) - rangPresse(c, b)),
  'marché croissant': (c, t) => t.slice().sort((a, b) => (rangMarche(c, a) - rangMarche(c, b)) || a - b),
  'fusion presse+marché': (c, t) => t.slice().sort((a, b) => (rangPresse(c, a) + rangMarche(c, a)) - (rangPresse(c, b) + rangMarche(c, b)) || a - b),
}

const cache0 = new Map()
function g0(c) {
  if (!cache0.has(c)) cache0.set(c, buildGrid(c.synthese, c.runners))
  return cache0.get(c)
}

function noterOrdre(C, nom, f) {
  let n = 0, exact = 0, troisEnTete = 0, gagnant = 0
  for (const c of C) {
    const t = f(c)
    if (!t || t.length !== 8) continue
    n++
    const trois = c.arrivee.slice(0, 3)
    if (t[0] === trois[0] && t[1] === trois[1] && t[2] === trois[2]) exact++
    if (trois.every((x) => t.slice(0, 3).includes(x))) troisEnTete++
    if (t[0] === trois[0]) gagnant++
  }
  return { nom, n, exact, troisEnTete, gagnant }
}

const ORDRES2 = {
  'production (stats podium)': (c) => ordreProd(c),
  'carnet P croissant': (c) => ORDRES['carnet P croissant'](c, huit(c).t),
  'presse croissante': (c) => ORDRES['presse croissante'](c, huit(c).t),
  'marché croissant': (c) => ORDRES['marché croissant'](c, huit(c).t),
  'fusion presse+marché': (c) => ORDRES['fusion presse+marché'](c, huit(c).t),
  'inverse du carnet': (c) => ORDRES['carnet P croissant'](c, huit(c).t).slice().reverse(),
}

function ordreProd(c) {
  const { t, g } = huit(c)
  c.stats = c.stats || (c === undefined ? null : null)
  return remplirGrille(grilleAvec(g, [4, 2, 1, 1, 0]), classementFusion(c, g), c.discipline, c.cotes, c.stats, CHOIX.CCCM).ticket.map(Number)
}

console.log('')
for (const [nom, C] of [['P96', P96], ['R18', R18]]) {
  const stats = nom === 'P96' ? STATS96 : STATS18
  /* on injecte les stats de production dans chaque course */
  for (const c of C) c.stats = stats
  console.log('  ' + nom + ' — ' + C.length + ' courses')
  console.log('  ' + wid('ordre du ticket', 30) + wid('1-2-3 exact', 13) + wid('les 3 en tête', 15) + 'le 1er en case 1')
  for (const [lib, f] of Object.entries(ORDRES2)) {
    const r = noterOrdre(C, lib, f)
    console.log('  ' + wid(lib, 30) + wid(pct(r.exact, r.n), 13) + wid(pct(r.troisEnTete, r.n), 15) + pct(r.gagnant, r.n))
  }
  console.log('')
}
console.log('')
