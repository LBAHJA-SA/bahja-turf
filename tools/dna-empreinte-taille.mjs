/* tools/dna-empreinte-taille.mjs — L'EMPREINTE : TYPE DE COURSE × TAILLE DU PELOTON.
 *
 * Demande : une empreinte pour les pelotons de MOINS de 10 partants, une autre
 * pour 10 et plus, en respectant le type de course (discipline × distance).
 *
 * Hiérarchie de repli quand un type n'a pas assez de courses :
 *   discipline|distance|taille  ->  discipline|taille  ->  discipline|distance  ->  global
 *
 * Aucune cote n'entre dans le score. Le marché n'est mesuré qu'après.
 * Apprentissage 2020-2024, test 2025-2026.
 *
 *   node tools/dna-empreinte-taille.mjs
 */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-archive-index.json', 'utf8'))
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—')

const LETTER_TO_DISC = { a: 'ATTELE', m: 'MONTE', p: 'PLAT', h: 'HAIE', s: 'STEEPLE', c: 'CROSS' }
function parseMusique(m) {
  const re = /([0-9]{1,2}|D|A|T|R)([ampshc])/gi
  const out = []
  let x
  while ((x = re.exec(String(m || '')))) out.push({ place: /^[0-9]+$/.test(x[1]) ? Number(x[1]) : 0, lettre: x[2].toLowerCase() })
  return out
}
function discOf(c) {
  const d = (c.disc || '').toUpperCase()
  if (/ATTELE|TROT/.test(d)) return 'ATTELE'
  if (/MONTE/.test(d)) return 'MONTE'
  if (/PLAT|GALOP/.test(d)) return 'PLAT'
  if (/STEEPLE/.test(d)) return 'STEEPLE'
  if (/HAIE/.test(d)) return 'HAIE'
  if (/CROSS/.test(d)) return 'CROSS'
  const votes = {}
  for (const p of c.ps) for (const r of parseMusique(p.musique)) votes[r.lettre] = (votes[r.lettre] || 0) + 1
  const b = Object.entries(votes).sort((a, x) => x[1] - a[1])[0]
  return b ? (LETTER_TO_DISC[b[0]] || 'AUTRE') : 'AUTRE'
}
const bucketD = (d) => (!d ? '?' : d <= 1400 ? 'SPRINT' : d <= 1900 ? 'MILE' : d <= 2450 ? 'MOYEN' : 'LONG')
const bucketN = (n) => (n < 10 ? 'PETIT' : 'GRAND')
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)

const KEYS = ['forme', 'formeDisc', 'placeRate', 'disq', 'best', 'age', 'jeune', 'deferre']

function feats(p) {
  const mus = parseMusique(p.musique)
  const rec = mus.slice(0, 5)
  let s = 0, w = 0
  rec.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(r.place) * wi; w += wi })
  const same = mus.filter((r) => r.lettre === p._lettre).slice(0, 5)
  let s2 = 0, w2 = 0
  same.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s2 += PTS(r.place) * wi; w2 += wi })
  const last8 = mus.slice(0, 8)
  const b3 = mus.slice(0, 3).filter((r) => r.place > 0)
  return {
    forme: w ? s / w : null,
    formeDisc: w2 ? s2 / w2 : null,
    placeRate: last8.length ? last8.filter((r) => r.place >= 1 && r.place <= 3).length / last8.length : null,
    disq: last8.length ? last8.filter((r) => r.place === 0).length / last8.length : null,
    best: b3.length ? 1 / Math.min(...b3.map((r) => r.place)) : null,
    age: p.age,
    jeune: p.age == null ? null : -Math.abs(p.age - 6),
    deferre: p.deferre && /[DP]/.test(String(p.deferre)) ? 1 : 0,
  }
}
function percentiles(values) {
  const ix = values.map((v, i) => ({ v, i })).filter((x) => x.v != null && Number.isFinite(x.v))
  ix.sort((a, b) => a.v - b.v)
  const out = new Array(values.length).fill(0.5)
  const n = ix.length
  if (!n) return out
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && ix[j + 1].v === ix[i].v) j++
    const p = n === 1 ? 0.5 : (i + j) / 2 / (n - 1)
    for (let k = i; k <= j; k++) out[ix[k].i] = p
    i = j + 1
  }
  return out
}

/* ---------- construction ---------- */
const courses = []
for (const c of idx) {
  const ps = c.ps.filter((p) => p.rang != null && /[0-9]/.test(p.musique || ''))
  if (ps.length < 6) continue
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_TO_DISC).find(([, v]) => v === disc)?.[0]
  const bd = bucketD(c.distance)
  const bn = bucketN(ps.length)
  const F = ps.map((p) => feats({ ...p, _lettre: lettre }))
  const P = {}
  for (const k of KEYS) P[k] = percentiles(F.map((f) => f[k]))
  courses.push({
    date: c.date, disc, bd, bn, n: ps.length,
    cle1: disc + '|' + bd + '|' + bn,
    cle2: disc + '|' + bn,
    cle3: disc + '|' + bd,
    nums: ps.map((p) => p.num),
    P,
    arrivee3: ps.filter((p) => p.rang <= 3).sort((a, b) => a.rang - b.rang).map((p) => p.num),
    cotes: ps.map((p) => p.cote),
  })
}

const train = courses.filter((c) => c.date <= '2024-12-31')
const test = courses.filter((c) => c.date >= '2025-01-01')
console.log('apprentissage ' + train.length + '  ·  test ' + test.length + '\n')

/* ---------- apprentissage de l'empreinte ---------- */
function learn(re) {
  const acc = {}
  let n = 0
  for (const r of re) {
    if (r.arrivee3.length !== 3) continue
    n++
    const top = new Set(r.arrivee3)
    for (const k of KEYS) {
      let s = 0
      for (let i = 0; i < r.nums.length; i++) if (top.has(r.nums[i])) s += r.P[k][i]
      acc[k] = (acc[k] || 0) + s / 3
    }
  }
  const raw = {}
  for (const k of KEYS) raw[k] = n ? Math.max(0, (acc[k] / n - 0.5) * 2) : 0
  const tot = Object.values(raw).reduce((a, b) => a + b, 0)
  for (const k of KEYS) raw[k] = tot ? raw[k] / tot : 0.5 / KEYS.length
  return raw
}

const universal = learn(train)
const tables = {}
for (const cle of [...new Set(train.map((r) => r.cle1))]) {
  const sub = train.filter((r) => r.cle1 === cle)
  if (sub.length >= 30) tables[cle] = learn(sub)
}
for (const cle of [...new Set(train.map((r) => r.cle2))]) {
  const sub = train.filter((r) => r.cle2 === cle)
  if (sub.length >= 60 && !tables[cle]) tables[cle] = learn(sub)
}
for (const cle of [...new Set(train.map((r) => r.cle3))]) {
  const sub = train.filter((r) => r.cle3 === cle)
  if (sub.length >= 60 && !tables[cle]) tables[cle] = learn(sub)
}

const empFor = (r) => tables[r.cle1] || tables[r.cle2] || tables[r.cle3] || universal

console.log('=== EMPREINTE « PETIT PELOTON » (< 10 partants) ===')
const smallKeys = Object.keys(tables).filter((k) => k.endsWith('PETIT')).slice(0, 10)
console.log('type                          ' + KEYS.map((k) => k.slice(0, 6).padStart(7)).join(''))
for (const k of smallKeys) console.log(k.padEnd(30) + KEYS.map((x) => (100 * tables[k][x]).toFixed(0).padStart(7)).join(''))
console.log('\n=== EMPREINTE « GRAND PELOTON » (10 partants et plus) ===')
const bigKeys = Object.keys(tables).filter((k) => k.endsWith('GRAND')).slice(0, 10)
for (const k of bigKeys) console.log(k.padEnd(30) + KEYS.map((x) => (100 * tables[k][x]).toFixed(0).padStart(7)).join(''))
console.log('\nGLOBAL (repli)                ' + KEYS.map((k) => (100 * universal[k]).toFixed(0).padStart(7)).join(''))

/* ---------- mesure ---------- */
const scoreOrder = (r) => {
  const e = empFor(r)
  return r.nums.map((n, i) => {
    let v = 0
    for (const k of KEYS) v += e[k] * r.P[k][i]
    return { n, v, i }
  }).sort((a, b) => b.v - a.v || a.i - b.i).map((x) => x.n)
}
const marketOrder = (r) => r.nums.map((n, i) => ({ n, c: r.cotes[i], i }))
  .filter((x) => x.c != null && x.c > 0).sort((a, b) => a.c - b.c || a.i - b.i).map((x) => x.n)
const inTop = (ord, arr, N) => {
  if (ord.length < N) return false
  const s = new Set(ord.slice(0, N))
  return arr.every((x) => s.has(x))
}

function bloc(titre, set) {
  console.log('\n--- ' + titre + ' (' + set.length + ' courses) ---')
  console.log('  N   empreinte   marché   hasard')
  for (const N of [3, 4, 5, 6]) {
    let e = 0, m = 0, h = 0, nn = 0
    for (const r of set) {
      const eo = scoreOrder(r), mo = marketOrder(r)
      if (eo.length < N || mo.length < N) continue
      nn++
      if (inTop(eo, r.arrivee3, N)) e++
      if (inTop(mo, r.arrivee3, N)) m++
      const n = r.n
      h += (n >= 3) ? 6 / (n * (n - 1) * (n - 2)) : 0
    }
    console.log('  ' + String(N).padStart(2) + '   ' + pct(e, nn).padStart(8) + '  ' + pct(m, nn).padStart(7) + '  ' + pct(h, nn).padStart(7))
  }
}

bloc('PETIT PELOTON — hors échantillon', test.filter((r) => r.bn === 'PETIT'))
bloc('GRAND PELOTON — hors échantillon', test.filter((r) => r.bn === 'GRAND'))
bloc('14 partants et plus — hors échantillon', test.filter((r) => r.n >= 14))

/* stabilité */
const t1 = test.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
const h2 = Math.floor(t1.length / 2)
console.log('\n=== stabilité de l\'empreinte seule (trio, N=3) ===')
for (const [nm, set] of [['1re moitié', t1.slice(0, h2)], ['2e moitié', t1.slice(h2)]]) {
  let e = 0, m = 0, n = 0
  for (const r of set) {
    const eo = scoreOrder(r), mo = marketOrder(r)
    if (eo.length < 3 || mo.length < 3) continue
    n++
    if (inTop(eo, r.arrivee3, 3)) e++
    if (inTop(mo, r.arrivee3, 3)) m++
  }
  console.log('  ' + nm + ' (' + n + ') : empreinte ' + pct(e, n) + '  ·  marché ' + pct(m, n))
}

/* gagnant */
for (const [nm, set] of [['PETIT', test.filter((r) => r.bn === 'PETIT')], ['GRAND', test.filter((r) => r.bn === 'GRAND')]]) {
  let e = 0, m = 0, n = 0
  for (const r of set) {
    const eo = scoreOrder(r), mo = marketOrder(r)
    if (!eo.length || !mo.length) continue
    n++
    if (eo[0] === r.arrivee3[0]) e++
    if (mo[0] === r.arrivee3[0]) m++
  }
  console.log('\n  gagnant ' + nm + ' : empreinte ' + pct(e, n) + '  ·  marché ' + pct(m, n))
}

/* ---------- mesure publiée dans l'artefact (la page l'affiche telle quelle) ---------- */
function mesureBloc(set) {
  const out = {}
  const hitK = (order, arr, k) => {
    if (order.length < k) return null
    const s = new Set(order.slice(0, k))
    return arr.slice(0, k).every((x) => s.has(x))
  }
  const s = (k) => {
    let e = 0, m = 0, n = 0
    for (const r of set) {
      const eo = scoreOrder(r), mo = marketOrder(r)
      const he = hitK(eo, r.arrivee3, k)
      const hm = hitK(mo, r.arrivee3, k)
      if (he == null || hm == null) continue
      n++
      if (he) e++
      if (hm) m++
    }
    return { n, empreinte: n ? +((100 * e) / n).toFixed(1) : null, marche: n ? +((100 * m) / n).toFixed(1) : null }
  }
  /* couverture : les 3 arrivants tiennent dans les N premiers */
  const cover = (N) => {
    let e = 0, m = 0, n = 0
    for (const r of set) {
      const eo = scoreOrder(r), mo = marketOrder(r)
      if (eo.length < N || mo.length < N) continue
      n++
      if (inTop(eo, r.arrivee3, N)) e++
      if (inTop(mo, r.arrivee3, N)) m++
    }
    return { n, empreinte: n ? +((100 * e) / n).toFixed(1) : null, marche: n ? +((100 * m) / n).toFixed(1) : null }
  }
  out.gagnant = s(1)
  out.couple = s(2)
  out.trio = s(3)
  out.six = cover(6)
  return out
}

const mesure = {
  PETIT: mesureBloc(test.filter((r) => r.bn === 'PETIT')),
  GRAND: mesureBloc(test.filter((r) => r.bn === 'GRAND')),
  '14+': mesureBloc(test.filter((r) => r.n >= 14)),
  testDu: test.length ? test.map((r) => r.date).sort()[0] : null,
  testAu: test.length ? test.map((r) => r.date).sort().pop() : null,
}
console.log('\n=== MESURE PUBLIÉE (affichée par la page) ===')
for (const [k, v] of Object.entries(mesure)) {
  if (typeof v !== 'object') continue
  console.log('  ' + k.padEnd(6) + ' gagnant ' + v.gagnant.empreinte + '% (marché ' + v.gagnant.marche + '%)  ·  couplé ' + v.couple.empreinte + '%  ·  trio ' + v.trio.empreinte + '%  ·  6 num ' + v.six.empreinte + '%   n=' + v.trio.n)
}

fs.writeFileSync('data/dna-empreinte-taille.json', JSON.stringify({ KEYS, universal, tables, mesure, tailles: { PETIT: train.filter((r) => r.bn === 'PETIT').length, GRAND: train.filter((r) => r.bn === 'GRAND').length } }, null, 1))
console.log('\n-> data/dna-empreinte-taille.json')
