/* =============================================================================
 * tools/verif-trio.mjs — LA PREUVE, COURSE PAR COURSE (20/10/2026)
 *
 * L'utilisateur : « ton calcul est faux, tu ne mesures pas les trois premiers
 * ENSEMBLE, tu mesures chaque place séparément ».
 *
 * Réponse : le test du trio est bien `les 3 ensemble, dans n'importe quel ordre`.
 * Ce fichier l'affiche course par course, pour qu'on puisse le vérifier à l'œil,
 * et affiche AUSSI les trois autres façons de compter — pour qu'on voie que ce
 * ne sont pas les mêmes chiffres.
 *
 *   ① ensemble   : les 3 premiers sont-ils TOUS dans le ticket ? (n'importe quel ordre)
 *   ② ordre exact: 1er en 1re, 2e en 2e, 3e en 3e (la place juste)
 *   ③ par place  : le 1er dans le ticket ? le 2e ? le 3e ? (séparément)
 *   ④ ≥ 2 des 3  : au moins deux des trois
 *
 *   node tools\verif-trio.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const wid = (s, n) => { const x = String(s); return x + ' '.repeat(Math.max(0, n - x.length)) }
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')

/* ── les corpus ─────────────────────────────────────────────────────────── */
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

const ORD = (g) => g.groupes.flatMap((x) => x.cases).slice()
  .sort((a, b) => a.slot - b.slot).map((x) => ({ p: { num: x.num }, s: null, ok: true }))

/* la production, telle quelle */
const ticketA = (c) => {
  const g = buildGrid(c.synthese, c.runners)
  return remplirGrille(g, ORD(g), c.discipline, c.cotes, c.stats).ticket.map(Number)
}

/* ── les quatre compteurs ───────────────────────────────────────────────── */
function compter(C) {
  const r = { n: 0, ensemble: 0, ordreExact: 0, p1: 0, p2: 0, p3: 0, auMoins2: 0 }
  const lignes = []
  for (const c of C) {
    const t = ticketA(c)
    const s = new Set(t)
    const trois = c.arrivee.slice(0, 3)
    if (trois.length < 3) continue
    r.n++
    const dedans = trois.map((x) => s.has(x))
    const tout = dedans.every(Boolean)
    if (tout) r.ensemble++
    /* ordre exact : le 1er en case 1 du ticket, le 2e en case 2, le 3e en case 3 */
    if (t[0] === trois[0] && t[1] === trois[1] && t[2] === trois[2]) r.ordreExact++
    if (dedans[0]) r.p1++
    if (dedans[1]) r.p2++
    if (dedans[2]) r.p3++
    if (dedans.filter(Boolean).length >= 2) r.auMoins2++
    lignes.push({ c, t, trois, dedans, tout })
  }
  return { ...r, lignes }
}

function afficher(nom, C, detail) {
  const r = compter(C)
  console.log('')
  console.log('  ══════════════════════════════════════════════════════════════════════════')
  console.log('  ' + nom + ' — ' + r.n + ' courses')
  console.log('  ══════════════════════════════════════════════════════════════════════════')
  if (detail) {
    console.log('  ' + wid('date', 12) + wid('les 3 premiers', 16) + wid('ticket (8)', 30) + 'ensemble')
    for (const L of r.lignes) {
      console.log('  ' + wid(L.c.date, 12) +
        wid(L.trois.join(' · '), 16) +
        wid(L.t.join(' · '), 30) +
        (L.tout ? '✔ les 3 dedans' : '✘ ' + L.dedans.map((x, i) => (x ? '' : L.trois[i])).filter(Boolean).join(' manque ')))
    }
    console.log('')
  }
  console.log('  ① les 3 ENSEMBLE (n\'importe quel ordre) : ' + pct(r.ensemble, r.n) + '   (' + r.ensemble + '/' + r.n + ')')
  console.log('  ② ordre EXACT 1-2-3 du ticket        : ' + pct(r.ordreExact, r.n) + '   (' + r.ordreExact + '/' + r.n + ')')
  console.log('  ③ place par place : 1er ' + pct(r.p1, r.n) + ' · 2e ' + pct(r.p2, r.n) + ' · 3e ' + pct(r.p3, r.n))
  console.log('  ④ au moins 2 des 3                   : ' + pct(r.auMoins2, r.n) + '   (' + r.auMoins2 + '/' + r.n + ')')
  return r
}

afficher('P96 · data/quintes.json', P96, false)
afficher('R18 · data/synthese.json', corpus18(), true)
console.log('')
console.log('  ⚠ Le chiffre publié (46,9 % sur P96) est la ligne ①, pas la ③.')
console.log('    La ligne ③ est toujours PLUS HAUTE (il suffit d\'un des trois).')
console.log('    La ligne ② est toujours PLUS BASSE (elle exige la place juste).')
console.log('')
