/* =============================================================================
 * tools/ordre2.mjs — L'ORDRE DU TICKET, MESURÉ (20/10/2026)
 *
 * Le ticket de 8 est FIXÉ (4-2-1-1-0). Seule change la PLACE de chaque cheval.
 * On mesure ce que rapporte une place juste :
 *
 *   1-2-3 exact     : les trois premiers, dans l'ordre du ticket
 *   les 3 en tête   : les trois premiers occupent les 3 premières cases
 *   2 places justes : deux des trois sont à leur place
 *   le 1er en case 1: le vainqueur ouvre le ticket
 *
 * ⚠ L'ordre ne change RIEN au Quinté (désordre) : le 5/5 est un ensemble.
 *   Il ne change que les paris « dans l'ordre ». Donc tout gain ici est gratuit.
 *
 *   node tools\ordre2.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, computeStats, ordonnerTicket } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const wid = (s, n) => { const x = String(s); return x + ' '.repeat(Math.max(0, n - x.length)) }
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')

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
const RP = (c, n) => { const i = c.synthese.indexOf(n); return i < 0 ? 99 : i + 1 }
const RM = (c, n) => {
  const m = c.runners.filter((x) => Number.isFinite(cote(c, x))).sort((a, b) => cote(c, a) - cote(c, b))
  const i = m.indexOf(n)
  return i < 0 ? 99 : i + 1
}
const g0 = (c) => buildGrid(c.synthese, c.runners)

/* les 8 chevaux de la production + leur stats de case */
function huit(c, stats) {
  const g = g0(c)
  const t = remplirGrille(g, ORD(g), c.discipline, c.cotes, stats, null).ticket.map(Number)
  return { t, g }
}

const stCase = (stats, g, n) => {
  const p = g.slotParNum[n]
  return (stats?.parPlace || [])[p - 1] || null
}

const REGLES = {
  'PRODUCTION · presse (§11.32)': (c, t, g) => ordonnerTicket(t, g),
  'statistiques de podium (ancien)': (c, t, g, st) => t.slice().sort((a, b) => {
    const fa = stCase(st, g, a), fb = stCase(st, g, b)
    const va = fa && fa.n >= 2 ? (fa.podiums ?? 0) / fa.n : null
    const vb = fb && fb.n >= 2 ? (fb.podiums ?? 0) / fb.n : null
    if (va == null && vb == null) return (g.slotParNum[a] ?? 99) - (g.slotParNum[b] ?? 99)
    if (va == null) return 1
    if (vb == null) return -1
    return (vb - va) || ((g.slotParNum[a] ?? 99) - (g.slotParNum[b] ?? 99))
  }),
  'victoire de la case': (c, t, g, st) => t.slice().sort((a, b) => {
    const fa = stCase(st, g, a), fb = stCase(st, g, b)
    const va = fa && fa.n >= 2 ? (fa.victoires ?? 0) / fa.n : null
    const vb = fb && fb.n >= 2 ? (fb.victoires ?? 0) / fb.n : null
    if (va == null && vb == null) return (g.slotParNum[a] ?? 99) - (g.slotParNum[b] ?? 99)
    if (va == null) return 1
    if (vb == null) return -1
    return (vb - va) || ((g.slotParNum[a] ?? 99) - (g.slotParNum[b] ?? 99))
  }),
  'presse (P croissant)': (c, t) => t.slice().sort((a, b) => RP(c, a) - RP(c, b) || a - b),
  'carnet (case P croissante)': (c, t, g) => t.slice().sort((a, b) => (g.slotParNum[a] ?? 99) - (g.slotParNum[b] ?? 99)),
  'marché (cote croissante)': (c, t) => t.slice().sort((a, b) => (RM(c, a) - RM(c, b)) || a - b),
  'presse puis marché': (c, t) => t.slice().sort((a, b) => (RP(c, a) - RP(c, b)) || (RM(c, a) - RM(c, b))),
  'marché puis presse': (c, t) => t.slice().sort((a, b) => (RM(c, a) - RM(c, b)) || (RP(c, a) - RP(c, b))),
  'presse × marché (rang somme)': (c, t) => t.slice().sort((a, b) => (RP(c, a) + RM(c, a)) - (RP(c, b) + RM(c, b)) || a - b),
}

function mesurer(nom, C) {
  const stats = computeStats(C)
  const r = []
  for (const [lib, f] of Object.entries(REGLES)) {
    let n = 0, exact = 0, tete = 0, deux = 0, gagnant = 0
    for (const c of C) {
      const { t, g } = huit(c, stats)
      if (t.length !== 8) continue
      const ord = f(c, t, g, stats)
      if (ord.length !== 8) continue
      n++
      const trois = c.arrivee.slice(0, 3)
      if (ord[0] === trois[0] && ord[1] === trois[1] && ord[2] === trois[2]) exact++
      if (trois.every((x) => ord.slice(0, 3).includes(x))) tete++
      const justes = trois.filter((x, i) => ord[i] === x).length
      if (justes >= 2) deux++
      if (ord[0] === trois[0]) gagnant++
    }
    r.push({ lib, n, exact, tete, deux, gagnant })
  }
  r.sort((a, b) => (b.tete - a.tete) || (b.exact - a.exact))
  console.log('')
  console.log('  ════ ' + nom + ' — ' + C.length + ' courses ════')
  console.log('  ' + wid('ordre du ticket', 32) + wid('1-2-3 exact', 13) + wid('les 3 en tête', 15) + wid('2 places justes', 17) + '1er en case 1')
  for (const x of r) {
    console.log('  ' + wid(x.lib, 32) + wid(pct(x.exact, x.n), 13) + wid(pct(x.tete, x.n), 15) +
      wid(pct(x.deux, x.n), 17) + pct(x.gagnant, x.n))
  }
  return r
}

const a = mesurer('P96 · data/quintes.json', P96)
const b = mesurer('R18 · data/synthese.json', R18)
console.log('')
console.log('  Cumul 114 courses (les 3 en tête) : ' +
  a.map((x, i) => x.lib.slice(0, 22) + ' ' + ((x.tete + (b.find((y) => y.lib === x.lib)?.tete ?? 0)))).slice(0, 4).join(' · '))
console.log('')
