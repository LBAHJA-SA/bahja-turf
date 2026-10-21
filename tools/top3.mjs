/* =============================================================================
 * tools/top3.mjs — LE PODIUM : LA MÉTHODE BAT-ELLE UN TOP-8 BRUT ? (20/10/2026)
 *
 * L'utilisateur : « la méthode n'améliore pas les trois premiers, donc elle est
 * ratée ». Question fermée, donc : on compare, à 8 CHEVAUX ÉGAUX, sur les deux
 * corpus, avec le podium comme juge :
 *
 *   A       4-2-1-1-0 (production : G1-G3 carnet · G4 marché)
 *   P8      les 8 premiers de la Synthèse (la presse, sans structure)
 *   M8      les 8 cotes les plus basses (le marché, sans structure)
 *   F8      la fusion : rang de presse + rang de marché, 8 meilleurs
 *   A10     la production à 10 chevaux — pour voir le plafond, pas pour jouer
 *
 * ⚠ Toutes les lignes à 8 chevaux sont comparables entre elles. A10 est là pour
 *   situer le plafond, elle n'est pas comparable et n'est pas une proposition.
 *
 *   node tools\top3.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const pad = (s, n) => String(s).padEnd(n)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const wid = (s, n) => { const x = String(s); return x + ' '.repeat(Math.max(0, n - x.length)) }

/* ── corpus ───────────────────────────────────────────────────────────── */
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

/* ── les huit chevaux de chaque règle ─────────────────────────────────── */
const cote = (c, n) => Number(c.cotes?.[n]?.cote ?? (typeof c.cotes?.[n] === 'number' ? c.cotes[n] : NaN))

function tirets(c) {
  const g = buildGrid(c.synthese, c.runners)
  const prod = remplirGrille(g, ORD(g), c.discipline, c.cotes, c.stats).ticket.map(Number)

  /* P8 — les 8 premiers de la presse */
  const P8 = c.synthese.slice(0, 8)

  /* M8 — les 8 cotes les plus basses (si le marché est complet) */
  const marche = c.runners.filter((n) => Number.isFinite(cote(c, n)))
  const M8 = marche.slice().sort((a, b) => cote(c, a) - cote(c, b) || a - b).slice(0, 8)

  /* F8 — la fusion des deux rangs */
  const rp = new Map(c.synthese.map((n, i) => [n, i + 1]))
  const rm = new Map(marche.slice().sort((a, b) => cote(c, a) - cote(c, b)).map((n, i) => [n, i + 1]))
  const F8 = (Number.isFinite(cote(c, c.runners[0])) ? c.runners.slice() : c.synthese.slice())
    .sort((a, b) => ((rp.get(a) ?? 99) + (rm.get(a) ?? 99)) - ((rp.get(b) ?? 99) + (rm.get(b) ?? 99)) || a - b)
    .slice(0, 8)

  /* A10 — la production à 10 (plafond, pas comparable) */
  const g10 = { groupes: g.groupes.map((x, i) => ({ ...x, quota: [4, 3, 1, 1, 1][i] })) }
  const A10 = remplirGrille(g10, ORD(g), c.discipline, c.cotes, c.stats).ticket.map(Number)

  return { prod, P8, M8, F8, A10 }
}

function juger(C, champ) {
  let n = 0, t3 = 0, p5 = 0, p4 = 0, couv = 0, ch = 0
  for (const c of C) {
    const t = champ(c)
    if (!t || !t.length) continue
    const s = new Set(t)
    const k = c.arrivee.filter((x) => s.has(x)).length
    n++; couv += k; ch += t.length
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) t3++
    if (k >= 5) p5++
    if (k >= 4) p4++
  }
  return { n, t3, p5, p4, couv, ch }
}

function rapport(nom, C) {
  const cache = new Map()
  const T = (c) => { if (!cache.has(c)) cache.set(c, tirets(c)); return cache.get(c) }
  const lignes = [
    ['A · 4-2-1-1-0 (production, 8)', (c) => T(c).prod],
    ['P8 · les 8 premiers de la presse', (c) => T(c).P8],
    ['M8 · les 8 cotes les plus basses', (c) => T(c).M8],
    ['F8 · fusion presse + marché (8)', (c) => T(c).F8],
    ['A10 · la production à 10 (plafond)', (c) => T(c).A10],
  ]
  console.log('')
  console.log('  ════ ' + nom + ' — ' + C.length + ' courses ════')
  console.log('  ' + wid('', 36) + wid('Top3 entier', 13) + wid('5/5', 9) + wid('≥4/5', 9) + wid('couverture', 12) + 'chevaux')
  for (const [lib, f] of lignes) {
    const r = juger(C, f)
    console.log('  ' + wid(lib, 36) + wid(pct(r.t3, r.n), 13) + wid(pct(r.p5, r.n), 9) + wid(pct(r.p4, r.n), 9) +
      wid(pct(r.couv, 5 * r.n), 12) + (r.ch / r.n).toFixed(2))
  }
  /* le hasard, même nombre de chevaux */
  const alea = C.reduce((t, c) => {
    const N = c.runners.length, m = 8
    const Cnk = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r }
    return t + (N - 3 >= m - 3 ? Cnk(N - 3, m - 3) / Cnk(N, m) : 0)
  }, 0)
  console.log('  ' + wid('hasard · 8 chevaux sur le peloton', 36) + wid(pct(alea, C.length), 13))

  /* ── apparié : A contre M8, course par course ── */
  const app = { n: 0, aMieux: 0, mMieux: 0, egal: 0, sauves: 0, perdus: 0 }
  const pod = { aSeul: 0, mSeul: 0 }
  for (const c of C) {
    const t = T(c)
    if (!t.M8.length) continue
    const sa = new Set(t.prod), sm = new Set(t.M8)
    const ka = c.arrivee.filter((x) => sa.has(x)).length
    const km = c.arrivee.filter((x) => sm.has(x)).length
    app.n++
    if (ka > km) app.aMieux++; else if (km > ka) app.mMieux++; else app.egal++
    for (const x of c.arrivee) {
      if (sa.has(x) && !sm.has(x)) app.sauves++
      if (!sa.has(x) && sm.has(x)) app.perdus++
    }
    const pa = c.arrivee.slice(0, 3).every((x) => sa.has(x))
    const pm = c.arrivee.slice(0, 3).every((x) => sm.has(x))
    if (pa && !pm) pod.aSeul++
    if (pm && !pa) pod.mSeul++
  }
  console.log('  ' + wid('  apparié A/M8 (' + app.n + ' courses)', 36) +
    'A mieux ' + app.aMieux + ' · M8 mieux ' + app.mMieux + ' · égal ' + app.egal +
    ' · arrivants ' + app.sauves + '/' + app.perdus)
  console.log('  ' + wid('  podium : A seul / M8 seul', 36) + pod.aSeul + ' / ' + pod.mSeul)
  /* ── stabilité : chaque moitié chronologique ── */
  const m = Math.floor(C.length / 2)
  const moit = (liste) => ({
    A: juger(liste, (c) => T(c).prod),
    M8: juger(liste, (c) => T(c).M8),
    F8: juger(liste, (c) => T(c).F8),
  })
  const h1 = moit(C.slice(0, m)), h2 = moit(C.slice(m))
  console.log('  ' + wid('  Top3 · 1re moitié / 2e moitié', 36) +
    'A ' + pct(h1.A.t3, h1.A.n) + ' / ' + pct(h2.A.t3, h2.A.n) +
    ' · M8 ' + pct(h1.M8.t3, h1.M8.n) + ' / ' + pct(h2.M8.t3, h2.M8.n) +
    ' · F8 ' + pct(h1.F8.t3, h1.F8.n) + ' / ' + pct(h2.F8.t3, h2.F8.n))
  return { nom, C }
}

rapport('P96 · data/quintes.json', P96)
rapport('R18 · data/synthese.json', corpus18())
console.log('')
console.log('  Lecture : à 8 chevaux, P8/M8/F8 ne peuvent pas être plus larges que A —')
console.log('  ils sont simplement AUTREMENT choisis. Si A gagne le podium ici, ce n’est pas')
console.log('  la structure qui gagne, c’est le mélange carnet + marché.')
console.log('')
