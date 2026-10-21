/* =============================================================================
 * tools/poids-presse.mjs — LE POIDS, SUR LES VRAIS BLOCS PRESSE (20/10/2026)
 *
 * tools\qui-sort-paire.mjs a trouvé UN signal sur les 123 Quintés des archives :
 * dans un bloc, le cheval le plus lourd arrive moins souvent. Mais les blocs y
 * étaient des TRANCHES DE MARCHÉ — pas les blocs P1-P4 / P5-P8 de la méthode.
 *
 * Ici on teste sur les VRAIS blocs : `buildGrid` sur les 96 Quintés à presse
 * réelle de `data/quintes.json`, quotas 3-3-1-1-0, choix de production
 * (G1-G3 carnet, G4 marché), et on ne change QU'UNE chose :
 *
 *       dans G1, on sort le PLUS LOURD au lieu du moins cité.
 *
 * Les poids viennent de pro.casacourses.com (`runners[].weight`), mis en cache
 * dans data/corpus/poids-presse.json. Le trot n'a pas de poids → ces courses
 * gardent la production telle quelle (aucune invention).
 *
 *   node tools\poids-presse.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const CC = 'https://pro.casacourses.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const CACHE = 'data/corpus/poids-presse.json'

/* ─────────── ① le corpus, exactement comme tools\sept.mjs ───────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const BRUT = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  BRUT.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])) })
}
const REC = BRUT.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))
const C = BRUT.map((c, i) => {
  const grille = buildGrid(c.syn, c.nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  return { c, grille, cl, stats: computeStats(REC.filter((_, k) => k !== i)), arr: c.q.arrivee }
})
console.log('')
console.log('  LE POIDS SUR LES VRAIS BLOCS PRESSE — ' + C.length + ' Quintés à presse réelle')

/* ─────────── ② les poids, en cache ─────────────────────────────────────── */
let cache = {}
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')) } catch { cache = {} }
const aChercher = C.map((c) => c.c.q).filter((q) => q.id && !cache[q.id] && /plat/i.test(q.discipline || ''))
console.log('  poids à récupérer : ' + aChercher.length + ' courses de plat (cache : ' + Object.keys(cache).length + ')')
const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}
let fait = 0
for (let i = 0; i < aChercher.length; i += 6) {
  const lot = aChercher.slice(i, i + 6)
  await Promise.all(lot.map(async (q) => {
    for (let essai = 0; essai < 3; essai++) {
      try {
        const j = await get(`${CC}/api/race/${q.id}?date=${q.date}`)
        const w = {}
        for (const r of j.runners || []) {
          const n = Number(r.number)
          if (Number.isFinite(n) && r.weight != null) w[n] = Number(r.weight)
        }
        cache[q.id] = w
        fait++
        return
      } catch (e) { await new Promise((s) => setTimeout(s, 400 * (essai + 1))) }
    }
  }))
  if (i % 30 === 0) process.stdout.write('    ' + fait + ' / ' + aChercher.length + '\r')
}
fs.mkdirSync('data/corpus', { recursive: true })
fs.writeFileSync(CACHE, JSON.stringify(cache))
console.log('    ' + fait + ' récupérées · cache écrit (' + Object.keys(cache).length + ' courses)          ')

/* ─────────── ③ la production ───────────────────────────────────────────── */
const QUOTAS = [3, 3, 1, 1, 0]
function production(c) {
  const g2 = { groupes: c.grille.groupes.map((g, k) => ({ ...g, quota: Math.min(QUOTAS[k], g.cases.length) })) }
  return remplirGrille(g2, c.cl, c.c.q.discipline, c.c.cotes, c.stats).ticket
}
/** la variante : dans G1, on garde les 3 PLUS LÉGERS (si les 4 ont un poids) */
function variante(c, tProd) {
  const g1 = c.grille.groupes[0]
  if (!g1 || g1.cases.length < 2) return tProd
  const w = (cache[c.c.q.id] || {})
  const nums = g1.cases.map((x) => x.num)
  if (nums.some((n) => w[n] == null)) return tProd        /* trot ou poids manquant : rien */
  const quota = Math.min(QUOTAS[0], nums.length)
  const garder = nums.slice().sort((a, b) => w[a] - w[b]).slice(0, quota)  /* les plus légers */
  const hors = new Set(nums.filter((n) => !garder.includes(n)))
  const dans = new Set(nums.filter((n) => garder.includes(n)))
  const out = []
  for (const n of tProd) {
    if (dans.has(n)) { out.push(n); continue }
    if (hors.has(n)) continue                            /* le sorti de G1 disparaît */
    out.push(n)
  }
  for (const n of dans) if (!out.includes(n)) out.push(n)
  return out
}

function noter(f) {
  let pod = 0, qui = 0, q4 = 0, ch = 0
  for (const c of C) {
    const t = f(c)
    const s = new Set(t)
    ch += t.length
    if (c.arr.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arr.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arr.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: C.length, moy: ch / C.length }
}

const PROD = noter(production)
const VAR = noter((c) => variante(c, production(c)))
console.log('')
console.log('  ' + pad('construction', 34) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 10) + 'chevaux')
console.log('  ' + pad('production (3-3-1-1-0)', 34) + pad(pct(PROD.pod, PROD.n), 10) + pad(pct(PROD.qui, PROD.n), 10) +
  pad(pct(PROD.q4, PROD.n), 10) + PROD.moy.toFixed(2))
console.log('  ' + pad('G1 : on sort le plus lourd', 34) + pad(pct(VAR.pod, VAR.n), 10) + pad(pct(VAR.qui, VAR.n), 10) +
  pad(pct(VAR.q4, VAR.n), 10) + VAR.moy.toFixed(2))

/* ─────────── ④ moitiés + bootstrap apparié ─────────────────────────────── */
const m = Math.floor(C.length / 2)
console.log('')
console.log('  MOITIÉ PAR MOITIÉ')
for (const [nom, l] of [['1ʳᵉ moitié', C.slice(0, m)], ['2ᵈᵉ moitié', C.slice(m)]]) {
  const a = noter.liste = null
  let p1 = 0, q1 = 0, p2 = 0, q2 = 0
  for (const c of l) {
    const t1 = new Set(production(c)), t2 = new Set(variante(c, production(c)))
    if (c.arr.slice(0, 3).every((x) => t1.has(x))) p1++
    if (c.arr.slice(0, 5).every((x) => t1.has(x))) q1++
    if (c.arr.slice(0, 3).every((x) => t2.has(x))) p2++
    if (c.arr.slice(0, 5).every((x) => t2.has(x))) q2++
  }
  console.log('  ' + pad(nom, 14) + 'production ' + pad(pct(p1, l.length) + ' · ' + pct(q1, l.length), 22) +
    '· variante ' + pct(p2, l.length) + ' · ' + pct(q2, l.length))
}
const boot = (d) => {
  let mm = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mm++
  }
  return mm / 100
}
console.log('')
for (const [nom, k] of [['podium entier', 3], ['quinté entier', 5]]) {
  const d = C.map((c) => {
    const t1 = new Set(production(c)), t2 = new Set(variante(c, production(c)))
    const a = c.arr.slice(0, k)
    return (a.every((x) => t2.has(x)) ? 1 : 0) - (a.every((x) => t1.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  console.log('  ' + pad(nom, 16) + 'gagnées ' + pad(g, 4) + '· perdues ' + pad(p, 4) + '· bootstrap mieux : ' + boot(d).toFixed(1) + ' %')
}
let change = 0
for (const c of C) {
  const a = new Set(production(c)), b = new Set(variante(c, production(c)))
  if ([...b].some((x) => !a.has(x))) change++
}
console.log('')
console.log('  courses où le poids change vraiment le ticket : ' + change + ' / ' + C.length)
console.log('')
