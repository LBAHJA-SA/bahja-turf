/* tools/dna-empreinte-type.mjs — L'EMPREINTE PAR TYPE DE COURSE.
 *
 * Idée : ne pas classer les chevaux par la cote, mais par le PROFIL MESURÉ
 * de ceux qui arrivent dans ce type de course (discipline × distance).
 *
 * Aucune donnée de marché n'entre dans le score. La cote n'est mesurée
 * qu'après, comme point de comparaison.
 *
 * Protocole :
 *   - features calculées depuis la musique, l'âge, le sexe, le déferrage
 *     (tout est disponible le jour de la course, rien du futur)
 *   - chaque feature est convertie en PERCENTILE DANS LA COURSE (0..1)
 *   - l'empreinte d'un type = percentile moyen des 3 premiers − 0,5
 *   - poids appris sur 2020-2024, notés sur 2025-2026 (hors échantillon)
 *
 *   node tools/dna-empreinte-type.mjs
 */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-archive-index.json', 'utf8'))
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—')

/* ---------- 1. nettoyage ---------- */
const LETTER_TO_DISC = { a: 'ATTELE', m: 'MONTE', p: 'PLAT', h: 'HAIE', s: 'STEEPLE', c: 'CROSS' }

function parseMusique(m) {
  const s = String(m || '')
  const out = []
  const re = /([0-9]{1,2}|D|A|T|R)([ampshc])/gi
  let x
  while ((x = re.exec(s))) {
    const raw = x[1].toUpperCase()
    const lettre = x[2].toLowerCase()
    const place = /^[0-9]+$/.test(raw) ? Number(raw) : 0
    out.push({ place, lettre })
  }
  return out
}

function discOf(course) {
  const d = (course.disc || '').toUpperCase()
  if (/ATTELE|TROT/.test(d)) return 'ATTELE'
  if (/MONTE/.test(d)) return 'MONTE'
  if (/PLAT|GALOP/.test(d)) return 'PLAT'
  if (/STEEPLE/.test(d)) return 'STEEPLE'
  if (/HAIE/.test(d)) return 'HAIE'
  if (/CROSS/.test(d)) return 'CROSS'
  // discipline vide -> vote des musiques
  const votes = {}
  for (const p of course.ps) for (const r of parseMusique(p.musique)) votes[r.lettre] = (votes[r.lettre] || 0) + 1
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]
  if (!best) return 'AUTRE'
  return LETTER_TO_DISC[best[0]] || 'AUTRE'
}

function distanceBucket(d) {
  if (!d) return '?'
  if (d <= 1400) return 'SPRINT'      // <=1400
  if (d <= 1900) return 'MILE'        // 1401-1900
  if (d <= 2450) return 'MOYEN'       // 1901-2450
  return 'LONG'                       // 2450+
}

/* ---------- 2. features (aucune cote) ---------- */
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)

function features(p, course) {
  const mus = parseMusique(p.musique)
  const recent = mus.slice(0, 5)
  const disc = discOf(course)
  const lettre = Object.entries(LETTER_TO_DISC).find(([, v]) => v === disc)?.[0]

  let sw = 0, sv = 0
  recent.forEach((r, i) => {
    const w = 1 / (1 + i * 0.55)
    sv += PTS(r.place) * w
    sw += w
  })
  const forme = sw ? sv / sw : null

  const same = mus.filter((r) => r.lettre === lettre).slice(0, 5)
  let sw2 = 0, sv2 = 0
  same.forEach((r, i) => {
    const w = 1 / (1 + i * 0.55)
    sv2 += PTS(r.place) * w
    sw2 += w
  })
  const formeDisc = sw2 ? sv2 / sw2 : null

  const last8 = mus.slice(0, 8)
  const placeRate = last8.length ? last8.filter((r) => r.place >= 1 && r.place <= 3).length / last8.length : null
  const disq = last8.length ? last8.filter((r) => r.place === 0).length / last8.length : null
  const best3 = mus.slice(0, 3).filter((r) => r.place > 0)
  const best = best3.length ? Math.min(...best3.map((r) => r.place)) : null

  return {
    forme,
    formeDisc,
    placeRate,
    disq,
    best: best == null ? null : 1 / best,
    age: p.age,
    jeune: p.age == null ? null : -Math.abs(p.age - 6),
    deferre: p.deferre && /[DP]/.test(String(p.deferre)) ? 1 : 0,
  }
}

/* percentile dans la course */
function percentiles(values) {
  const idxs = values.map((v, i) => ({ v, i })).filter((x) => x.v != null && Number.isFinite(x.v))
  idxs.sort((a, b) => a.v - b.v)
  const out = new Array(values.length).fill(0.5)
  const n = idxs.length
  if (!n) return out
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && idxs[j + 1].v === idxs[i].v) j++
    const p = n === 1 ? 0.5 : (i + j) / 2 / (n - 1)
    for (let k = i; k <= j; k++) out[idxs[k].i] = p
    i = j + 1
  }
  return out
}

/* ---------- 3. construction ---------- */
const races = []
for (const c of idx) {
  const partants = c.ps.filter((p) => p.rang != null && /[0-9]/.test(p.musique || ''))
  if (partants.length < 6) continue
  const disc = discOf(c)
  const bucket = distanceBucket(c.distance)
  const feats = partants.map((p) => features(p, c))
  const keys = ['forme', 'formeDisc', 'placeRate', 'disq', 'best', 'age', 'jeune', 'deferre']
  const P = {}
  for (const k of keys) P[k] = percentiles(feats.map((f) => f[k]))
  const top3 = new Set(partants.filter((p) => p.rang <= 3).map((p) => p.num))
  const cotes = partants.map((p) => p.cote)
  races.push({
    date: c.date, disc, bucket, type: disc + '|' + bucket,
    n: partants.length,
    nums: partants.map((p) => p.num),
    P, top3,
    cotes,
    arrivee3: partants.filter((p) => p.rang <= 3).sort((a, b) => a.rang - b.rang).map((p) => p.num),
  })
}

console.log('courses utilisables :', races.length)
const byType = {}
for (const r of races) byType[r.type] = (byType[r.type] || 0) + 1
console.log('\ntypes (discipline|distance) :')
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log('  ' + k.padEnd(20) + v)

/* ---------- 4. apprentissage de l'empreinte ---------- */
const KEYS = ['forme', 'formeDisc', 'placeRate', 'disq', 'best', 'age', 'jeune', 'deferre']
const train = races.filter((r) => r.date <= '2024-12-31')
const test = races.filter((r) => r.date >= '2025-01-01')
console.log('\napprentissage :', train.length, '| test (hors échantillon) :', test.length)

function learnEmp(re, fallback) {
  const acc = {}
  let n = 0
  for (const r of re) {
    if (r.top3.size !== 3) continue
    n++
    for (const k of KEYS) {
      let s = 0
      for (let i = 0; i < r.nums.length; i++) if (r.top3.has(r.nums[i])) s += r.P[k][i]
      acc[k] = (acc[k] || 0) + s / 3
    }
  }
  const emp = {}
  for (const k of KEYS) {
    const mean = n ? acc[k] / n : 0.5
    emp[k] = Math.max(0, (mean - 0.5) * 2) // 0 = aucun signal, 1 = signal fort
  }
  const tot = Object.values(emp).reduce((a, b) => a + b, 0)
  if (tot < 0.15 && fallback) return fallback
  for (const k of KEYS) emp[k] = emp[k] / (tot || 1)
  return emp
}

const globalEmp = learnEmp(train, null)
const empByType = {}
for (const t of Object.keys(byType)) {
  const sub = train.filter((r) => r.type === t)
  if (sub.length >= 40) empByType[t] = learnEmp(sub, globalEmp)
}

console.log('\n=== EMPREINTE APPRISE (poids normalisés) ===')
console.log('type'.padEnd(20) + KEYS.map((k) => k.slice(0, 7).padStart(8)).join(''))
console.log('GLOBAL'.padEnd(20) + KEYS.map((k) => (100 * globalEmp[k]).toFixed(0).padStart(8)).join(''))
for (const [t, e] of Object.entries(empByType).sort()) {
  console.log(t.padEnd(20) + KEYS.map((k) => (100 * e[k]).toFixed(0).padStart(8)).join(''))
}

/* ---------- 5. classement et mesure ---------- */
const scoreRank = (r, emp) => {
  const s = r.nums.map((n, i) => {
    let v = 0
    for (const k of KEYS) v += emp[k] * r.P[k][i]
    return { n, v: +v.toFixed(6), i }
  })
  s.sort((a, b) => b.v - a.v || a.i - b.i)
  return s.map((x) => x.n)
}
const marketRank = (r) => {
  const s = r.nums.map((n, i) => ({ n, c: r.cotes[i], i }))
    .filter((x) => x.c != null && x.c > 0)
    .sort((a, b) => a.c - b.c || a.i - b.i)
  return s.map((x) => x.n)
}
const inTop = (order, arr, N) => {
  if (order.length < N) return false
  const s = new Set(order.slice(0, N))
  return arr.every((x) => s.has(x))
}

function report(label, set) {
  const withM = set.filter((r) => marketRank(r).length >= 3)
  const rows = []
  for (const N of [3, 4, 5, 6, 8]) {
    let emp = 0, mkt = 0, nn = 0
    for (const r of withM) {
      const e = empByType[r.type] ? scoreRank(r, empByType[r.type]) : scoreRank(r, globalEmp)
      const m = marketRank(r)
      if (e.length < N || m.length < N) continue
      nn++
      if (inTop(e, r.arrivee3, N)) emp++
      if (inTop(m, r.arrivee3, N)) mkt++
    }
    rows.push({ N, emp: pct(emp, nn), mkt: pct(mkt, nn), n: nn })
  }
  console.log('\n--- ' + label + ' (' + withM.length + ' courses) ---')
  console.log('  N   empreinte   marché')
  for (const r of rows) console.log('  ' + String(r.N).padStart(2) + '   ' + r.emp.padStart(8) + '  ' + r.mkt.padStart(7))
}

report('HORS ÉCHANTILLON 2025-2026', test)
report('APPRENTISSAGE 2020-2024', train)
report('TOUT', races)

/* gagnant seul */
function winner(label, set) {
  let e = 0, m = 0, n = 0
  for (const r of set) {
    const ord = empByType[r.type] ? scoreRank(r, empByType[r.type]) : scoreRank(r, globalEmp)
    const mk = marketRank(r)
    if (!ord.length || !mk.length) continue
    n++
    if (ord[0] === r.arrivee3[0]) e++
    if (mk[0] === r.arrivee3[0]) m++
  }
  console.log('\n  gagnant  ' + label + ' : empreinte ' + pct(e, n) + '  ·  marché ' + pct(m, n))
}
winner('hors échantillon', test)
winner('tout', races)

/* ---------- 6. stabilité par discipline ---------- */
console.log('\n=== TRIO (N=3) par discipline — hors échantillon ===')
const discs = [...new Set(test.map((r) => r.disc))]
console.log('  discipline   courses   empreinte   marché')
for (const d of discs) {
  const sub = test.filter((r) => r.disc === d && marketRank(r).length >= 3)
  if (sub.length < 20) continue
  let e = 0, m = 0
  for (const r of sub) {
    const ord = empByType[r.type] ? scoreRank(r, empByType[r.type]) : scoreRank(r, globalEmp)
    if (inTop(ord, r.arrivee3, 3)) e++
    if (inTop(marketRank(r), r.arrivee3, 3)) m++
  }
  console.log('  ' + d.padEnd(12) + String(sub.length).padStart(7) + pct(e, sub.length).padStart(11) + pct(m, sub.length).padStart(10))
}

/* ---------- 7. CONTRÔLE : taille du peloton ---------- */
console.log('\n=== CONTRÔLE — le peloton change tout (hors échantillon, N=3) ===')
console.log('  partants   courses   empreinte   marché   hasard')
const strata = [[6, 9], [10, 13], [14, 40]]
for (const [lo, hi] of strata) {
  const sub = test.filter((r) => r.n >= lo && r.n <= hi && marketRank(r).length >= 3)
  if (sub.length < 15) continue
  let e = 0, m = 0, h = 0
  for (const r of sub) {
    const ord = empByType[r.type] ? scoreRank(r, empByType[r.type]) : scoreRank(r, globalEmp)
    if (inTop(ord, r.arrivee3, 3)) e++
    if (inTop(marketRank(r), r.arrivee3, 3)) m++
    // hasard : 3 tirés parmi n
    h += 6 / (r.n * (r.n - 1) * (r.n - 2))
  }
  console.log('  ' + (lo + '-' + hi).padEnd(10) + String(sub.length).padStart(6) + pct(e, sub.length).padStart(11) + pct(m, sub.length).padStart(9) + pct(h, sub.length).padStart(9))
}

/* ---------- 8. le Quinté seul (14+ partants), le vrai format ---------- */
console.log('\n=== LE FORMAT QUI COMPTE : 14 partants et plus (hors échantillon) ===')
const big = test.filter((r) => r.n >= 14 && marketRank(r).length >= 4)
console.log('  courses :', big.length)
console.log('  N   empreinte   marché')
for (const N of [3, 4, 5, 6, 8]) {
  let e = 0, m = 0, nn = 0
  for (const r of big) {
    const ord = empByType[r.type] ? scoreRank(r, empByType[r.type]) : scoreRank(r, globalEmp)
    const mk = marketRank(r)
    if (ord.length < N || mk.length < N) continue
    nn++
    if (inTop(ord, r.arrivee3, N)) e++
    if (inTop(mk, r.arrivee3, N)) m++
  }
  console.log('  ' + String(N).padStart(2) + '   ' + pct(e, nn).padStart(8) + '  ' + pct(m, nn).padStart(7))
}

fs.writeFileSync('data/dna-empreinte-type.json', JSON.stringify({ KEYS, globalEmp, empByType, byType, tested: test.length }, null, 1))
console.log('\n-> data/dna-empreinte-type.json')
