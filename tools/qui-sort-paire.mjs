/* =============================================================================
 * tools/qui-sort-paire.mjs — LE MÊME TEST, APPARIÉ (20/10/2026)
 *
 * Correction de tools\qui-sort.mjs : la référence « cote » était mesurée sur
 * TOUTES les courses (123) alors qu'un signal comme le POIDS n'existe que sur
 * les courses de plat (59). Comparer 39,0 % (n = 59) à 52,0 % (n = 123) n'est
 * pas une comparaison — c'est deux populations différentes.
 *
 * Ici, pour chaque signal : on garde la MÊME liste de courses pour le signal et
 * pour la cote, et on compare les deux sur cette liste.
 *
 *   node tools\qui-sort-paire.mjs
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

const ferrageDe = (d) => {
  const s = String(d || '')
  if (s.includes('DEFERRE_ANTERIEURS_POSTERIEURS')) return 2
  if (s.includes('DEFERRE_ANTERIEURS') || s.includes('DEFERRE_POSTERIEURS')) return 1
  if (s === '') return null
  return 0
}
function signaux(p) {
  const nc = Number(p.nombreCourses) || 0
  return {
    cote: Number(p.cote_pmu) || null,
    poids: Number(p.poids) || null,
    valeur: Number(p.valeur) || null,
    corde: Number(p.corde) || null,
    age: Number(p.age) || null,
    tauxVictoire: nc >= 5 ? (Number(p.nombreVictoires) || 0) / nc : null,
    tauxPlace: nc >= 5 ? (Number(p.nombrePlaces) || 0) / nc : null,
    gainParCourse: nc >= 5 ? (Number(p.gain) || 0) / nc : null,
    ferrage: ferrageDe(p.deferre),
    oeilleres: p.oeilleres ? (String(p.oeilleres).includes('SANS') ? 0 : 1) : null,
  }
}

const COURSES = []
for (const c of CORPUS) {
  const f = FICHIERS.get(c.date + '|' + N(c.track) + '|' + c.num) || FICHIERS.get(c.date + '|?|' + c.num)
  if (!f) continue
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { continue }
  const parNum = Object.fromEntries((j.participants || []).map((x) => [Number(x.num), signaux(x)]))
  const nums = Object.keys(c.cotes).map(Number).filter((n) => c.cotes[n] > 0)
    .sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  if (nums.length < 10 || c.arrivee.length < 5) continue
  COURSES.push({
    c,
    blocs: [nums.slice(0, 4), nums.slice(4, 8), nums.slice(8, 10), nums.slice(10, 12)],
    sig: parNum,
  })
}

const BLOCS = ['G1', 'G2', 'G3', 'G4']
const QUOTA = [3, 3, 1, 1]
const SIGNAUX = ['poids', 'valeur', 'corde', 'age', 'tauxVictoire', 'tauxPlace', 'gainParCourse', 'ferrage', 'oeilleres']

/** sur un sous-ensemble de courses, le sorti par `sig`/`asc` ET le sorti par la cote */
function paire(liste, b, sig, asc) {
  const q = QUOTA[b]
  let n = 0, t5s = 0, t3s = 0, t5c = 0, t3c = 0
  for (const k of liste) {
    const bloc = k.blocs[b]
    if (bloc.length <= q) continue
    if (bloc.some((x) => k.sig[x]?.[sig] == null)) continue
    const tri = bloc.slice().sort((x, y) => {
      const a = k.sig[x][sig], z = k.sig[y][sig]
      return asc ? a - z : z - a
    })
    const parSig = tri[tri.length - 1]
    const parCote = bloc[bloc.length - 1]              /* le plus cher du bloc */
    const a = k.c.arrivee
    n++
    if (a.slice(0, 5).includes(parSig)) t5s++
    if (a.slice(0, 3).includes(parSig)) t3s++
    if (a.slice(0, 5).includes(parCote)) t5c++
    if (a.slice(0, 3).includes(parCote)) t3c++
  }
  return { n, t5s, t3s, t5c, t3c }
}

console.log('')
console.log('  QUI SORT — TEST APPARIÉ sur ' + COURSES.length + ' Quintés français (archives, hors statistiques)')
console.log('  les deux lignes portent sur EXACTEMENT les mêmes courses')
console.log('')

for (let b = 0; b < 4; b++) {
  const lignes = []
  for (const sig of SIGNAUX) for (const asc of [true, false]) {
    const r = paire(COURSES, b, sig, asc)
    if (r.n < 40) continue
    lignes.push({ nom: sig + (asc ? ' ↑' : ' ↓'), ...r })
  }
  /* le gain du signal contre la cote, sur le même lot */
  lignes.forEach((l) => { l.gain = (l.t5s / l.n - l.t5c / l.n) * 100 })
  lignes.sort((x, y) => x.gain - y.gain)
  console.log('  ── ' + BLOCS[b] + '  (on sort 1 cheval sur ' + (QUOTA[b] === 1 ? '2' : '4') + ')')
  console.log('     ' + pad('signal', 20) + pad('sorti top-5', 14) + pad('la cote, mêmes courses', 24) + pad('gain', 10) + 'n')
  for (const l of lignes.slice(0, 6)) {
    console.log('     ' + pad(l.nom, 20) + pad(pct(l.t5s, l.n), 14) + pad(pct(l.t5c, l.n), 24) +
      pad((l.gain >= 0 ? '+' : '') + l.gain.toFixed(1).replace('.', ',') + ' pts', 10) + l.n)
  }
  console.log('')
}

/* ─────── la règle complète : poids en G1, la cote ailleurs ─────────────── */
const Q = [3, 3, 1, 1]
function ticket(k, poidsG1) {
  const t = []
  for (let b = 0; b < 4; b++) {
    const l = k.blocs[b].slice()
    if (b === 0 && poidsG1) {
      l.sort((x, y) => {
        const a = k.sig[x]?.poids, z = k.sig[y]?.poids
        if (a == null && z == null) return 0
        if (a == null) return 1
        if (z == null) return -1
        return a - z
      })
    }
    l.slice(0, Q[b]).forEach((n) => t.push(n))
  }
  return t
}
const ev = (liste, f) => {
  let pod = 0, qui = 0, q4 = 0
  for (const k of liste) {
    const s = new Set(f(k))
    const a = k.c.arrivee
    if (a.slice(0, 3).every((x) => s.has(x))) pod++
    if (a.slice(0, 5).every((x) => s.has(x))) qui++
    if (a.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: liste.length }
}
console.log('  ── LA RÈGLE (G1 : on sort le plus lourd · G2-G3-G4 : la cote)')
const m = Math.floor(COURSES.length / 2)
for (const [nom, l] of [['tout', COURSES], ['1ʳᵉ moitié', COURSES.slice(0, m)], ['2ᵈᵉ moitié', COURSES.slice(m)]]) {
  const a = ev(l, (k) => ticket(k, false)), z = ev(l, (k) => ticket(k, true))
  console.log('     ' + pad(nom, 14) + 'cote : ' + pad(pct(a.pod, a.n) + ' · ' + pct(a.qui, a.n) + ' · ' + pct(a.q4, a.n), 26) +
    'règle : ' + pct(z.pod, z.n) + ' · ' + pct(z.qui, z.n) + ' · ' + pct(z.q4, z.n))
}
/* apparié sur les DEUX événements */
for (const [nom, idx] of [['podium entier', 3], ['quinté entier', 5]]) {
  const d = COURSES.map((k) => {
    const A = new Set(ticket(k, false)), B = new Set(ticket(k, true))
    const a = k.c.arrivee.slice(0, idx)
    return (a.every((x) => B.has(x)) ? 1 : 0) - (a.every((x) => A.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  let mieux = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mieux++
  }
  console.log('     ' + pad(nom, 14) + 'gagnées ' + pad(g, 4) + '· perdues ' + pad(p, 4) +
    '· bootstrap mieux que la cote : ' + (mieux / 100).toFixed(1) + ' %')
}
console.log('')
