/* =============================================================================
 * tools/jockey.mjs — JOCKEY · ENTRAÎNEUR · ÂGE, mesurés comme choix (20/10/2026)
 *
 * Derniers signaux jamais testés, et les seuls qui ne soient dans aucune des
 * 15 variables déjà fermées :
 *
 *   jockey      taux de podium du jockey (lissé, hors la course mesurée)
 *   entraineur  taux de podium de l'entraîneur (idem)
 *   age         l'âge du cheval (les deux sens testés)
 *
 * Même protocole que tools/pouvoir.mjs : vraie grille, 96 Quintés à presse
 * réelle, SORTI = le cheval jeté arrive (bas = bon), et le ticket 4-2-1-1-0.
 *
 *   node tools\jockey.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const JK = JSON.parse(fs.readFileSync('data/corpus/jockeys96.json', 'utf8'))

const C = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const jk = JK[q.date + '|' + q.id]
  if (!jk || jk.erreur) continue
  const grille = buildGrid(syn, nums)
  C.push({ q, grille, nums, jk, bloc: grille.groupes.map((g) => g.cases.map((x) => x.num)) })
}

/* ── les taux, calculés HORS la course mesurée (leave-one-out) ───────────── */
function taux(saufIdx) {
  const J = {}, E = {}
  const add = (o, k, place) => {
    if (!k) return
    const x = (o[k] = o[k] || { n: 0, p3: 0, g: 0 })
    x.n++
    if (place === 1) x.g++
    if (place >= 1 && place <= 3) x.p3++
  }
  C.forEach((c, i) => {
    if (i === saufIdx) return
    c.nums.forEach((n) => {
      const place = c.q.arrivee.indexOf(n) + 1
      add(J, c.jk[n]?.jockey, place)
      add(E, c.jk[n]?.entraineur, place)
    })
  })
  return { J, E }
}
const lisse = (x) => (x ? (x.p3 + 1) / (x.n + 5) : 0.2)   // lissage bayésien
const lisseG = (x) => (x ? (x.g + 1) / (x.n + 6) : 0.1)

const SIG = ['carnet', 'jockey', 'jockeyG', 'entraineur', 'age', 'ageInv']
const MEILLEUR = { carnet: 1, jockey: -1, jockeyG: -1, entraineur: -1, age: -1, ageInv: 1 }

const QUOTAS_AVANT = [3, 3, 1, 1, 0]
console.log('')
console.log('  JOCKEY · ENTRAÎNEUR · ÂGE — ' + C.length + ' Quintés à presse réelle')
console.log('  SORTI = le cheval écarté arrive (bas = bon) · BASE = le hasard')
console.log('')

const valeurs = C.map((c, i) => {
  const { J, E } = taux(i)
  const out = {}
  for (const n of c.nums) {
    const j = J[c.jk[n]?.jockey], e = E[c.jk[n]?.entraineur]
    out[n] = {
      jockey: lisse(j), jockeyG: lisseG(j), entraineur: lisse(e),
      age: c.jk[n]?.age ?? null, ageInv: c.jk[n]?.age ?? null,
      jn: j?.n || 0, en: e?.n || 0,
    }
  }
  return out
})

for (let b = 0; b < 4; b++) {
  const noms = ['G1', 'G2', 'G3', 'G4']
  let nBase = 0, tot = 0
  const stats = {}
  C.forEach((c, i) => {
    const bloc = c.bloc[b]
    if (bloc.length < 2) return
    const a = c.q.arrivee.slice(0, 5)
    const q = Math.min(QUOTAS_AVANT[b], bloc.length)
    tot += bloc.length
    nBase += bloc.filter((x) => a.includes(x)).length
    for (const sig of SIG) {
      if (bloc.some((x) => valeurs[i][x]?.[sig] == null)) continue
      const tri = bloc.slice().sort((x, y) => MEILLEUR[sig] * (valeurs[i][x][sig] - valeurs[i][y][sig]))
      const dehors = tri.slice(q)
      if (!dehors.length) continue
      const s = stats[sig] || (stats[sig] = { n: 0, perdu: 0 })
      s.n++
      if (dehors.some((x) => a.includes(x))) s.perdu++
    }
  })
  console.log('  ── ' + noms[b] + '   BASE ' + pct(nBase, tot))
  for (const [sig, s] of Object.entries(stats).sort((x, y) => x[1].perdu / x[1].n - y[1].perdu / y[1].n)) {
    console.log('     ' + pad(sig, 12) + pad(pct(s.perdu, s.n), 10) + 'n = ' + s.n)
  }
  console.log('')
}

/* combien de courses ont un jockey/entraîneur connu + assez de montes */
let avecJ = 0, avecE = 0
C.forEach((c, i) => {
  const v = valeurs[i]
  if (c.nums.filter((n) => v[n].jn >= 5).length >= 10) avecJ++
  if (c.nums.filter((n) => v[n].en >= 5).length >= 10) avecE++
})
console.log('  jockeys avec ≥ 5 montes dans le corpus : ' + avecJ + ' / ' + C.length + ' courses')
console.log('  entraîneurs avec ≥ 5 partants        : ' + avecE + ' / ' + C.length + ' courses')
console.log('')

/* ── le ticket 4-2-1-1-0 ─────────────────────────────────────────────────── */
const QUOTAS = [4, 2, 1, 1, 0]
function ticket(i, choix) {
  const c = C[i], v = valeurs[i]
  const t = []
  for (let b = 0; b < 4; b++) {
    const cases = c.grille.groupes[b]?.cases || []
    if (!cases.length) continue
    const q = b === 2 ? Math.max(1, Math.min(QUOTAS[b], cases.length)) : Math.min(QUOTAS[b], cases.length)
    const sig = choix[b]
    const bloc = cases.map((x) => x.num)
    let ordre
    if (sig === 'marche') {
      ordre = cases.slice().sort((x, y) => c.q.cotes[x.num] - c.q.cotes[y.num] || x.place - y.place)
    } else if (!sig || bloc.some((n) => v[n]?.[sig] == null)) {
      ordre = cases.slice().sort((x, y) => x.place - y.place)
    } else {
      ordre = cases.slice().sort((x, y) => MEILLEUR[sig] * (v[x.num][sig] - v[y.num][sig]))
    }
    ordre.slice(0, q).forEach((x) => t.push(x.num))
  }
  return t
}
function noter(idx, choix) {
  let p = 0, q = 0, q4 = 0
  for (const i of idx) {
    const s = new Set(ticket(i, choix))
    const a = C[i].q.arrivee
    if (a.slice(0, 3).every((x) => s.has(x))) p++
    if (a.slice(0, 5).every((x) => s.has(x))) q++
    if (a.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { p, q, q4, n: idx.length }
}
const PROD = [null, 'carnet', 'carnet', 'marche']
const SCEN = [
  ['production (carnet G2-G3 · cote G4)', PROD],
  ['G2 par l’ENTRAÎNEUR', [null, 'entraineur', 'carnet', 'marche']],
  ['G2 par le JOCKEY', [null, 'jockey', 'carnet', 'marche']],
  ['G2 par l’ÂGE (le plus jeune)', [null, 'age', 'carnet', 'marche']],
  ['G2 par l’ÂGE (le plus vieux)', [null, 'ageInv', 'carnet', 'marche']],
]
const idx = C.map((_, i) => i)
const m = Math.floor(idx.length / 2)
console.log('  LE TICKET 4-2-1-1-0 — on ne change QUE le choix de G2')
console.log('  ' + pad('scénario', 34) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 10))
for (const [nom, ch] of SCEN) {
  const r = noter(idx, ch)
  console.log('  ' + pad(nom, 34) + pad(pct(r.p, r.n), 10) + pad(pct(r.q, r.n), 10) + pad(pct(r.q4, r.n), 10))
}
console.log('')
console.log('  MOITIÉ PAR MOITIÉ (quinté entier)')
for (const [nom, ch] of SCEN) {
  const a = noter(idx.slice(0, m), ch), b = noter(idx.slice(m), ch)
  console.log('  ' + pad(nom, 34) + pad(pct(a.q, a.n), 10) + pct(b.q, b.n))
}
console.log('')
console.log('  BOOTSTRAP apparié, 10 000 tirages, contre la production')
for (const [nom, ch] of SCEN.slice(1)) {
  const d = idx.map((i) => {
    const A = new Set(ticket(i, PROD)), B = new Set(ticket(i, ch))
    const a = C[i].q.arrivee.slice(0, 5)
    return (a.every((x) => B.has(x)) ? 1 : 0) - (a.every((x) => A.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  let mieux = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let k = 0; k < d.length; k++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mieux++
  }
  console.log('  ' + pad(nom, 34) + 'gagnées ' + pad(g, 4) + '· perdues ' + pad(p, 4) + '· mieux ' + (mieux / 100).toFixed(1) + ' %')
}
console.log('')
