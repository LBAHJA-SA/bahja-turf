/* =============================================================================
 * tools/regle-oos.mjs — LE VRAI HORS-ÉCHANTILLON (20/10/2026)
 *
 * Les deux règles précédentes ont été CHOISIES en regardant les 123 courses.
 * Ici la sélection se fait sur une moitié et la note se prend sur l'AUTRE :
 *   moitié A → on cherche, bloc par bloc, le signal qui sort le moins d'arrivants
 *   moitié B → on applique ce signal, et on compte les 5/5 et les podiums
 * puis on inverse. Le total est le vrai chiffre hors échantillon.
 *
 *   node tools\regle-oos.mjs
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

const Q = [3, 3, 1, 1]
const SIG = ['poids', 'valeur', 'corde', 'age', 'tauxVictoire', 'tauxPlace', 'gainParCourse', 'ferrage']

/** choix[b] = { sig, asc } | null (null = la cote) */
function ordreBloc(k, b, choix) {
  const l = k.blocs[b].slice()
  const ch = choix[b]
  if (!ch) return l
  if (l.some((x) => k.sig[x]?.[ch.sig] == null)) return l   /* jamais de tri partiel */
  return l.sort((x, y) => {
    const a = k.sig[x][ch.sig], z = k.sig[y][ch.sig]
    return ch.asc ? a - z : z - a
  })
}
function ticket(k, choix) {
  const t = []
  for (let b = 0; b < 4; b++) ordreBloc(k, b, choix).slice(0, Q[b]).forEach((n) => t.push(n))
  return t
}
function noter(liste, choix) {
  let pod = 0, qui = 0, q4 = 0
  for (const k of liste) {
    const s = new Set(ticket(k, choix))
    const a = k.c.arrivee
    if (a.slice(0, 3).every((x) => s.has(x))) pod++
    if (a.slice(0, 5).every((x) => s.has(x))) qui++
    if (a.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: liste.length }
}
/** le sorti du bloc arrive-t-il ? (sur les courses où le bloc a la donnée) */
function tauxSorti(liste, b, sig, asc) {
  let n = 0, t5 = 0
  for (const k of liste) {
    if (k.blocs[b].length <= Q[b]) continue
    if (k.blocs[b].some((x) => k.sig[x]?.[sig] == null)) continue
    const o = ordreBloc(k, b, [0, 0, 0, 0].map((_, i) => (i === b ? { sig, asc } : null)))
    const sorti = o[o.length - 1]
    n++
    if (k.c.arrivee.slice(0, 5).includes(sorti)) t5++
  }
  return { n, t5, taux: n ? t5 / n : 1 }
}
function choisir(liste) {
  const ch = [null, null, null, null]
  for (let b = 0; b < 4; b++) {
    let best = { sig: 'cote', asc: true, t: tauxSorti(liste, b, 'cote', true) }
    for (const sig of SIG) for (const asc of [true, false]) {
      const r = tauxSorti(liste, b, sig, asc)
      if (r.n < 25) continue
      if (r.taux < best.t.taux) best = { sig, asc, t: r }
    }
    ch[b] = { sig: best.sig, asc: best.asc }
  }
  return ch
}

const BASE = [null, null, null, null]
const m = Math.floor(COURSES.length / 2)
const H = [COURSES.slice(0, m), COURSES.slice(m)]

console.log('')
console.log('  HORS ÉCHANTILLON — ' + COURSES.length + ' Quintés français (archives, hors statistiques)')
console.log('  la règle est CHOISIE sur une moitié, NOTÉE sur l’autre')
console.log('')

let auto = { pod: 0, qui: 0, q4: 0, n: 0 }
let base = { pod: 0, qui: 0, q4: 0, n: 0 }
for (const [a, b] of [[0, 1], [1, 0]]) {
  const ch = choisir(H[a])
  const rA = noter(H[b], ch), rB = noter(H[b], BASE)
  auto = { pod: auto.pod + rA.pod, qui: auto.qui + rA.qui, q4: auto.q4 + rA.q4, n: auto.n + rA.n }
  base = { pod: base.pod + rB.pod, qui: base.qui + rB.qui, q4: base.q4 + rB.q4, n: base.n + rB.n }
  console.log('  choisie sur la ' + (a === 0 ? '1ʳᵉ' : '2ᵈᵉ') + ' moitié → ' +
    ch.map((x) => x.sig + (x.asc ? '↑' : '↓')).join(' · '))
  console.log('     notée sur l’autre      : ' + pct(rA.pod, rA.n) + ' podium · ' + pct(rA.qui, rA.n) + ' quinté' +
    '    (la cote : ' + pct(rB.pod, rB.n) + ' · ' + pct(rB.qui, rB.n) + ')')
}
console.log('')
console.log('  ' + pad('TOTAL hors échantillon', 26) + pad(pct(auto.pod, auto.n), 10) + pad(pct(auto.qui, auto.n), 10) + pct(auto.q4, auto.n))
console.log('  ' + pad('la cote partout', 26) + pad(pct(base.pod, base.n), 10) + pad(pct(base.qui, base.n), 10) + pct(base.q4, base.n))
console.log('')
console.log('  colonnes : podium entier · quinté entier · ≥4 du quinté')
console.log('')
