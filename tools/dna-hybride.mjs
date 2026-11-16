/* tools/dna-hybride.mjs — la seule utilisation honnête qui reste à l'empreinte :
 * choisir la QUEUE d'une liste, pas la liste entière.
 *
 *   A : marché top-N                       (référence)
 *   B : marché top-4 + 2 meilleures empreintes parmi les rangs 5..10
 *   C : marché top-3 + 3 meilleures empreintes parmi les rangs 4..12
 *   D : empreinte seule top-N              (la demande initiale)
 *
 * Test : courses 2025-2026 avec 14 partants et plus (le format Quinté).
 */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-archive-index.json', 'utf8'))
const emp = JSON.parse(fs.readFileSync('data/dna-empreinte-type.json', 'utf8'))
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
const bucket = (d) => (!d ? '?' : d <= 1400 ? 'SPRINT' : d <= 1900 ? 'MILE' : d <= 2450 ? 'MOYEN' : 'LONG')
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)

function feats(p, disc, lettre) {
  const mus = parseMusique(p.musique)
  const rec = mus.slice(0, 5)
  let s = 0, w = 0
  rec.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(r.place) * wi; w += wi })
  const forme = w ? s / w : null
  const same = mus.filter((r) => r.lettre === lettre).slice(0, 5)
  let s2 = 0, w2 = 0
  same.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s2 += PTS(r.place) * wi; w2 += wi })
  const last8 = mus.slice(0, 8)
  const b3 = mus.slice(0, 3).filter((r) => r.place > 0)
  return {
    forme,
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

const KEYS = emp.KEYS
const courses = []
for (const c of idx) {
  const ps = c.ps.filter((p) => p.rang != null && /[0-9]/.test(p.musique || '') && p.cote != null && p.cote > 0)
  if (ps.length < 6) continue
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_TO_DISC).find(([, v]) => v === disc)?.[0]
  const F = ps.map((p) => feats(p, disc, lettre))
  const P = {}
  for (const k of KEYS) P[k] = percentiles(F.map((f) => f[k]))
  const tokens = emp.empByType[disc + '|' + bucket(c.distance)] || emp.globalEmp
  const sc = ps.map((p, i) => {
    let v = 0
    for (const k of KEYS) v += tokens[k] * P[k][i]
    return { num: p.num, v, cote: p.cote }
  })
  const byMarket = [...sc].sort((a, b) => a.cote - b.cote)
  const byEmp = [...sc].sort((a, b) => b.v - a.v)
  courses.push({
    date: c.date, n: ps.length, disc,
    arrivee3: ps.filter((p) => p.rang <= 3).sort((a, b) => a.rang - b.rang).map((p) => p.num),
    byMarket, byEmp,
  })
}

const test = courses.filter((c) => c.date >= '2025-01-01' && c.n >= 14)
console.log('courses test (2025-2026, 14+ partants) :', test.length, '\n')

const hit = (sel, arr) => {
  if (sel.length < arr.length) return false
  const s = new Set(sel)
  return arr.every((x) => s.has(x))
}

const regles = {
  'A marché top-6': (c) => c.byMarket.slice(0, 6).map((x) => x.num),
  'B marché 4 + empreinte 2 (rangs 5-10)': (c) => {
    const tete = c.byMarket.slice(0, 4).map((x) => x.num)
    const queue = c.byMarket.slice(4, 10)
    const pick = queue.map((x) => ({ x, s: c.byEmp.findIndex((y) => y.num === x.num) })).sort((a, b) => a.s - b.s).slice(0, 2).map((y) => y.x.num)
    return [...tete, ...pick]
  },
  'C marché 3 + empreinte 3 (rangs 4-12)': (c) => {
    const tete = c.byMarket.slice(0, 3).map((x) => x.num)
    const queue = c.byMarket.slice(3, 12)
    const pick = queue.map((x) => ({ x, s: c.byEmp.findIndex((y) => y.num === x.num) })).sort((a, b) => a.s - b.s).slice(0, 3).map((y) => y.x.num)
    return [...tete, ...pick]
  },
  'D empreinte seule top-6': (c) => c.byEmp.slice(0, 6).map((x) => x.num),
}

console.log('règle                                    trio couvert (les 3 arrivants dans les 6)')
const results = {}
for (const [name, fn] of Object.entries(regles)) {
  let k = 0
  for (const c of test) if (hit(fn(c), c.arrivee3)) k++
  results[name] = k
  console.log('  ' + name.padEnd(40) + pct(k, test.length).padStart(8) + '   (' + k + '/' + test.length + ')')
}

/* et sur les 10-13 partants, pour la stabilité */
const mid = courses.filter((c) => c.date >= '2025-01-01' && c.n >= 10 && c.n <= 13)
console.log('\ncontrôle 10-13 partants (' + mid.length + ' courses) :')
for (const [name, fn] of Object.entries(regles)) {
  let k = 0
  for (const c of mid) if (hit(fn(c), c.arrivee3)) k++
  console.log('  ' + name.padEnd(40) + pct(k, mid.length).padStart(8))
}
