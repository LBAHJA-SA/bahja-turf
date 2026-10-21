/* =============================================================================
 * tools/regle-poids.mjs — LA RÈGLE DU POIDS (20/10/2026)
 *
 * Ce qui sort du test apparié (tools\qui-sort-paire.mjs) :
 *
 *   G1  poids ↑  -11,9 pts   le sorti arrive 39,0 % au lieu de 50,8 %
 *   G2  rien                 le marché est déjà le bon choix
 *   G3  valeur ↑  -5,1 pts
 *   G4  valeur ↑  -5,1 pts
 *
 * poids et valeur donnent le MÊME ordre (poids = valeur + une base) : c'est
 * UN seul signal, le poids de handicap. Dans le plat, on sort le plus lourd.
 *
 * Ce fichier mesure la règle complète sur le ticket 3-3-1-1-0 :
 *   R0  la cote partout
 *   R1  G1 au poids, le reste à la cote
 *   R2  G1 + G3 + G4 au poids, G2 à la cote
 *
 *   node tools\regle-poids.mjs
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const N = (s) => String(s || '').toUpperCase().replace(/[_\s]+/g, ' ').trim()
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const statCles = new Set(TOUT.filter((x) => x.date).map((x) => x.date + '|' + N(x.track)))
const CORPUS = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
  .filter((c) => !statCles.has(c.date + '|' + N(c.track)))

const FICHIERS = new Map()
function indexer(dir, hippo) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { indexer(p, N(e.name)); continue }
    const m = e.name.match(/^race_R\d+_C(\d+)_(\d{4}-\d{2}-\d{2})\.json$/)
    if (!m) continue
    const k = m[2] + '|' + (hippo || '?') + '|' + Number(m[1])
    if (!FICHIERS.has(k)) FICHIERS.set(k, p)
  }
}
indexer('archives', null)

const COURSES = []
for (const c of CORPUS) {
  const f = FICHIERS.get(c.date + '|' + N(c.track) + '|' + c.num) || FICHIERS.get(c.date + '|?|' + c.num)
  if (!f) continue
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { continue }
  const pn = Object.fromEntries((j.participants || []).map((x) => [Number(x.num), Number(x.poids) || null]))
  const nums = Object.keys(c.cotes).map(Number).filter((n) => c.cotes[n] > 0)
    .sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  if (nums.length < 10 || c.arrivee.length < 5) continue
  COURSES.push({
    c,
    blocs: [nums.slice(0, 4), nums.slice(4, 8), nums.slice(8, 10), nums.slice(10, 12)],
    poids: pn,
  })
}

const Q = [3, 3, 1, 1]

/** règle = tableau de 4 booléens : true = ce bloc est trié au POIDS (plus léger d'abord) */
function ticket(k, regle) {
  const t = []
  for (let b = 0; b < 4; b++) {
    const l = k.blocs[b].slice()
    if (regle[b]) {
      /* si un seul cheval du bloc n'a pas de poids → on ne trie pas ce bloc :
         jamais de tri partiel (on retombe sur la cote) */
      if (!l.some((x) => k.poids[x] == null)) {
        l.sort((x, y) => k.poids[x] - k.poids[y])
      }
    }
    l.slice(0, Q[b]).forEach((n) => t.push(n))
  }
  return t
}
function ev(liste, regle) {
  let pod = 0, qui = 0, q4 = 0
  for (const k of liste) {
    const s = new Set(ticket(k, regle))
    const a = k.c.arrivee
    if (a.slice(0, 3).every((x) => s.has(x))) pod++
    if (a.slice(0, 5).every((x) => s.has(x))) qui++
    if (a.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: liste.length }
}
const boot = (d) => {
  let m = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) m++
  }
  return m / 100
}
function apparié(regle, idx) {
  const d = COURSES.map((k) => {
    const A = new Set(ticket(k, [false, false, false, false])), B = new Set(ticket(k, regle))
    const a = k.c.arrivee.slice(0, idx)
    return (a.every((x) => B.has(x)) ? 1 : 0) - (a.every((x) => A.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  return { g, p, mieux: boot(d) }
}

const R0 = [false, false, false, false]
const R1 = [true, false, false, false]
const R2 = [true, false, true, true]

console.log('')
console.log('  LA RÈGLE DU POIDS — ' + COURSES.length + ' Quintés français (archives, hors statistiques)')
console.log('  ticket 3-3-1-1-0 · G1-G4 = tranches de marché · métriques denses')
console.log('')
const m = Math.floor(COURSES.length / 2)
const H = [COURSES.slice(0, m), COURSES.slice(m)]

console.log('  ' + pad('construction', 34) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 10))
const NOM = { R0: 'la cote partout', R1: 'G1 poids · le reste cote', R2: 'G1+G3+G4 poids · G2 cote' }
for (const [cle, r] of [['R0', R0], ['R1', R1], ['R2', R2]]) {
  const e = ev(COURSES, r)
  console.log('  ' + pad(cle + '  ' + NOM[cle], 34) + pad(pct(e.pod, e.n), 10) + pad(pct(e.qui, e.n), 10) + pct(e.q4, e.n))
}

console.log('')
console.log('  MOITIÉ PAR MOITIÉ')
for (const [nom, l] of [['1ʳᵉ moitié', H[0]], ['2ᵈᵉ moitié', H[1]]]) {
  const a = ev(l, R0), b = ev(l, R1), c = ev(l, R2)
  console.log('  ' + pad(nom, 14) + 'cote ' + pad(pct(a.pod, a.n) + ' · ' + pct(a.qui, a.n), 20) +
    '· R1 ' + pad(pct(b.pod, b.n) + ' · ' + pct(b.qui, b.n), 20) +
    '· R2 ' + pct(c.pod, c.n) + ' · ' + pct(c.qui, c.n))
}

console.log('')
console.log('  BOOTSTRAP APPARIÉ (10 000 tirages, contre la cote)')
for (const [cle, r] of [['R1', R1], ['R2', R2]]) {
  const p3 = apparié(r, 3), p5 = apparié(r, 5)
  console.log('  ' + pad(cle, 4) + 'podium : gagnées ' + pad(p3.g, 4) + '· perdues ' + pad(p3.p, 4) +
    '· mieux ' + pad(p3.mieux.toFixed(1) + ' %', 9) +
    '  |  quinté : gagnées ' + pad(p5.g, 4) + '· perdues ' + pad(p5.p, 4) +
    '· mieux ' + p5.mieux.toFixed(1) + ' %')
}

/* combien de courses la règle touche-t-elle vraiment ? */
let touche = 0
for (const k of COURSES) {
  const a = new Set(ticket(k, R0)), b = new Set(ticket(k, R2))
  if ([...b].some((x) => !a.has(x))) touche++
}
console.log('')
console.log('  courses où la règle change le ticket : ' + touche + ' / ' + COURSES.length)
console.log('')
