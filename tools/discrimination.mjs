/* =============================================================================
 * tools/discrimination.mjs — LE MOTEUR SAIT-IL DIFFÉRENCIER ? (20/10/2026)
 *
 * L'utilisateur : « si le moteur ne sait pas distinguer celui qui peut gagner
 * de celui qui peut finir 2e, 3e, 4e, 5e, ce n'est pas un moteur, c'est de la
 * ferraille ».
 *
 * Question fermée, donc mesure fermée. On prend les 8 chevaux du ticket, on les
 * range par un signal, et on regarde ce qu'ils font VRAIMENT :
 *
 *   · le 1er du classement gagne-t-il plus souvent que le 8e ?
 *   · combien de fois chaque rang prédit finit dans les 3 ? dans les 5 ?
 *   · l'ordre prédit-il mieux qu'un tirage au sort ? (AUC = 0,5 = hasard)
 *
 *   node tools\discrimination.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, computeStats, ordonnerParPresse } from '../src/lib/quinte.js'
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

/* position réelle : 1..5, ou 6 = « hors des cinq » */
const posReelle = (c, n) => {
  const i = c.arrivee.indexOf(n)
  return i < 0 ? 6 : i + 1
}

function analyse(nom, C) {
  const stats = computeStats(C)
  for (const c of C) c.stats = stats

  const cache = new Map()
  const huit = (c) => {
    if (cache.has(c)) return cache.get(c)
    const g = buildGrid(c.synthese, c.runners)
    const t = remplirGrille(g, ORD(g), c.discipline, c.cotes, stats, null).ticket.map(Number)
    const out = { t, g }
    cache.set(c, out)
    return out
  }

  const stCase = (g, n) => {
    const p = g.slotParNum[n]
    return (stats?.parPlace || [])[p - 1] || null
  }
  const note = (st, k) => (st && st.n >= 2 ? (st[k] || 0) / st.n : 0)

  const SIGNAUX = {
    'PRESSE (P croissant)': (c, n, g) => g.parNum[n] ?? 99,
    'MARCHÉ (cote croissante)': (c, n) => (Number.isFinite(cote(c, n)) ? cote(c, n) : 999),
    'victoires de la case': (c, n, g) => -note(stCase(g, n), 'victoires'),
    'podiums de la case': (c, n, g) => -note(stCase(g, n), 'podiums'),
    'presse + marché': (c, n, g) => (g.parNum[n] ?? 99) + 2 * (Number.isFinite(cote(c, n)) ? cote(c, n) : 30),
  }

  console.log('')
  console.log('  ════════════════════════════════════════════════════════════════════════')
  console.log('  ' + nom + ' — ' + C.filter((c) => huit(c).t.length === 8).length + ' courses')
  console.log('  ════════════════════════════════════════════════════════════════════════')

  const resultats = []
  for (const [lib, f] of Object.entries(SIGNAUX)) {
    /* par rang prédit 1..8 */
    const parRang = Array.from({ length: 8 }, () => ({ n: 0, gagne: 0, top3: 0, top5: 0, somme: 0 }))
    let paires = 0, concordantes = 0, n = 0
    for (const c of C) {
      const { t, g } = huit(c)
      if (t.length !== 8) continue
      n++
      const ord = t.slice().sort((a, b) => f(c, a, g) - f(c, b, g) || a - b)
      ord.forEach((num, i) => {
        const p = posReelle(c, num)
        const R = parRang[i]
        R.n++; R.somme += p
        if (p === 1) R.gagne++
        if (p <= 3) R.top3++
        if (p <= 5) R.top5++
      })
      /* AUC : chaque paire de chevaux du ticket, l'un finit devant l'autre */
      for (let i = 0; i < ord.length; i++) {
        for (let j = i + 1; j < ord.length; j++) {
          const pi = posReelle(c, ord[i]), pj = posReelle(c, ord[j])
          if (pi === pj) continue
          paires++
          if (pi < pj) concordantes++       // le mieux classé finit devant
        }
      }
    }
    const auc = paires ? concordantes / paires : 0.5
    resultats.push({ lib, parRang, auc, n })
  }

  resultats.sort((a, b) => b.auc - a.auc)
  for (const r of resultats) {
    console.log('')
    console.log('  ── ' + r.lib + '   (AUC ' + r.auc.toFixed(3).replace('.', ',') +
      ' · hasard 0,500 · ' + (r.auc > 0.5 ? '+' : '') + ((r.auc - 0.5) * 100).toFixed(1).replace('.', ',') + ' pts)')
    console.log('  ' + wid('rang prédit', 12) + wid('gagne', 9) + wid('dans les 3', 12) + wid('dans les 5', 12) + 'position moyenne')
    for (let i = 0; i < 8; i++) {
      const R = r.parRang[i]
      console.log('  ' + wid(i + 1 + (i === 0 ? 'er' : 'e'), 12) + wid(pct(R.gagne, R.n), 9) +
        wid(pct(R.top3, R.n), 12) + wid(pct(R.top5, R.n), 12) + (R.somme / R.n).toFixed(2).replace('.', ','))
    }
  }
  return resultats
}

const a = analyse('P96 · 96 Quintés', P96)
const b = analyse('R18 · 18 courses', R18)

console.log('')
console.log('  ════════════════════════════════════════════════════════════════════════')
console.log('  SYNTHÈSE — pouvoir de tri (0,500 = le hasard)')
console.log('  ════════════════════════════════════════════════════════════════════════')
for (const x of a) {
  const y = b.find((z) => z.lib === x.lib)
  console.log('  ' + wid(x.lib, 28) + 'P96 ' + x.auc.toFixed(3).replace('.', ',') +
    '   ·   R18 ' + (y ? y.auc.toFixed(3).replace('.', ',') : '—'))
}
console.log('')
