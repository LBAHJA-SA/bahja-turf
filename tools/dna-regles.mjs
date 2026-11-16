/* tools/dna-regles.mjs — quelle règle simple classe le mieux ?
 * Choisie SUR 2020-2024, notée SUR 2025-2026. Aucune donnée du test ne sert au choix.
 * L'empreinte composite actuelle est incluse comme point de comparaison.
 */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-archive-index.json', 'utf8'))
const emp = JSON.parse(fs.readFileSync('data/dna-empreinte-taille.json', 'utf8'))
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—')

const LETTER_DISC = { a: 'ATTELE', m: 'MONTE', p: 'PLAT', h: 'HAIE', s: 'STEEPLE', c: 'CROSS' }
const parseM = (m) => {
  const re = /([0-9]{1,2}|D|A|T|R)([amphsc])/gi
  const o = []
  let x
  while ((x = re.exec(String(m || '')))) o.push({ place: /^[0-9]+$/.test(x[1]) ? Number(x[1]) : 0, lettre: x[2].toLowerCase() })
  return o
}
const discOf = (c) => {
  const d = (c.disc || '').toUpperCase()
  if (/ATTELE|TROT/.test(d)) return 'ATTELE'
  if (/MONTE/.test(d)) return 'MONTE'
  if (/PLAT|GALOP/.test(d)) return 'PLAT'
  if (/STEEPLE/.test(d)) return 'STEEPLE'
  if (/HAIE/.test(d)) return 'HAIE'
  if (/CROSS/.test(d)) return 'CROSS'
  const v = {}
  for (const p of c.ps) for (const r of parseM(p.musique)) v[r.lettre] = (v[r.lettre] || 0) + 1
  const b = Object.entries(v).sort((a, x) => x[1] - a[1])[0]
  return b ? LETTER_DISC[b[0]] || 'AUTRE' : 'AUTRE'
}
const bucketD = (d) => (!d ? '?' : d <= 1400 ? 'SPRINT' : d <= 1900 ? 'MILE' : d <= 2450 ? 'MOYEN' : 'LONG')
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)

function pcts(vals) {
  const ix = vals.map((v, i) => ({ v, i })).filter((x) => x.v != null && Number.isFinite(x.v))
  ix.sort((a, b) => a.v - b.v)
  const out = new Array(vals.length).fill(0.5)
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

const MOY = (arr, mode) => {
  const a = arr.filter((r) => (mode === 'z' ? true : r.place > 0)).map((r) => (r.place === 0 ? 12 : r.place))
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null
}
const MOYW = (arr) => {
  let s = 0, w = 0
  arr.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += (r.place === 0 ? 12 : r.place) * wi; w += wi })
  return w ? s / w : null
}

const races = []
for (const c of idx) {
  const ps = c.ps.filter((p) => p.rang != null && p.rang > 0 && /[0-9]/.test(p.musique || ''))
  if (ps.length < 6) continue
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_DISC).find(([, v]) => v === disc)?.[0]
  const F = ps.map((p) => {
    const mus = parseM(p.musique)
    const l3 = mus.slice(0, 3), l5 = mus.slice(0, 5), l8 = mus.slice(0, 8)
    const dl = mus.filter((r) => r.lettre === lettre)
    return {
      m3: MOY(l3, 'x'), m3z: MOY(l3, 'z'), m5: MOY(l5, 'x'), m5z: MOY(l5, 'z'),
      mw: MOYW(l5), mwD: MOYW(dl.slice(0, 5)),
      t3: l8.length ? l8.filter((r) => r.place >= 1 && r.place <= 3).length / l8.length : null,
      bst: l3.some((r) => r.place > 0) ? Math.min(...l3.filter((r) => r.place > 0).map((r) => r.place)) : null,
      win: l8.length ? l8.filter((r) => r.place === 1).length / l8.length : null,
      disq: l8.length ? l8.filter((r) => r.place === 0).length / l8.length : null,
      forme: (() => { let s = 0, w = 0; l5.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(r.place) * wi; w += wi }); return w ? s / w : null })(),
    }
  })
  // signe : on veut « plus grand = meilleur »
  const SIGN = { m3: -1, m3z: -1, m5: -1, m5z: -1, mw: -1, mwD: -1, t3: 1, bst: -1, win: 1, disq: -1, forme: 1 }
  const R = {}
  for (const k of Object.keys(SIGN)) R[k] = pcts(F.map((f) => (f[k] == null ? null : SIGN[k] * f[k])))

  const empT = emp.tables[disc + '|' + bucketD(c.distance) + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] || emp.tables[disc + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] || emp.universal
  const eP = {}
  for (const k of emp.KEYS) eP[k] = pcts(F.map((f) => f[k]))
  const eScore = ps.map((p, i) => { let v = 0; for (const k of emp.KEYS) v += (empT[k] || 0) * eP[k][i]; return { n: p.num, v } }).sort((a, b) => b.v - a.v).map((x) => x.n)

  races.push({
    date: c.date, petit: ps.length < 10, ps, R, emp: eScore,
    arr: ps.filter((p) => p.rang <= 3).sort((a, b) => a.rang - b.rang).map((p) => p.num),
  })
}

const TRAIN = races.filter((r) => r.date < '2025-01-01')
const TEST = races.filter((r) => r.date >= '2025-01-01')

/* une règle = liste de [clé, poids] */
const order = (r, w) => r.ps.map((p, i) => {
  let v = 0
  for (const [k, a] of w) v += a * r.R[k][i]
  return { n: p.num, v }
}).sort((a, b) => b.v - a.v).map((x) => x.n)

const trioIn = (o, arr, k) => (o.length >= k ? arr.every((x) => new Set(o.slice(0, k)).has(x)) : false)
const hitTop = (o, arr, k) => (o.length >= k ? arr.slice(0, k).every((x) => new Set(o.slice(0, k)).has(x)) : false)

const RULES = [
  ['moyenne 3 dernières (sans 0)', [['m3', 1]]],
  ['moyenne 3 dernières (0→12)', [['m3z', 1]]],
  ['moyenne 5 dernières (sans 0)', [['m5', 1]]],
  ['moyenne 5 dernières (0→12)', [['m5z', 1]]],
  ['moyenne pondérée 5 (0→12)', [['mw', 1]]],
  ['moyenne pondérée 5, même disc.', [['mwD', 1]]],
  ['taux top-3 (8 dernières)', [['t3', 1]]],
  ['meilleure place (3 dernières)', [['bst', 1]]],
  ['taux de victoire (8 dernières)', [['win', 1]]],
  ['mw + t3', [['mw', 2], ['t3', 1]]],
  ['mw + bst', [['mw', 2], ['bst', 1]]],
  ['mw + mwD', [['mw', 2], ['mwD', 1]]],
  ['mw + t3 + disq', [['mw', 3], ['t3', 2], ['disq', 1]]],
  ['mw + t3 + mwD + disq', [['mw', 3], ['t3', 2], ['mwD', 2], ['disq', 1]]],
]

const tab = (list, w) => {
  let g = 0, co = 0, tr = 0, t5 = 0, t6 = 0
  for (const r of list) {
    const o = order(r, w)
    if (hitTop(o, r.arr, 1)) g++
    if (hitTop(o, r.arr, 2)) co++
    if (trioIn(o, r.arr, 3)) tr++
    if (trioIn(o, r.arr, 5)) t5++
    if (trioIn(o, r.arr, 6)) t6++
  }
  const n = list.length
  return { g: g / n, co: co / n, tr: tr / n, t5: t5 / n, t6: t6 / n, n }
}

const groupes = { ALL: (r) => true, PETIT: (r) => r.petit, GRAND: (r) => !r.petit }

for (const [nom, w] of RULES) {
  console.log('  ' + nom.padEnd(32) + RULES.indexOf([nom, w]))
}
console.log('')

for (const key of ['ALL', 'GRAND', 'PETIT']) {
  const f = groupes[key]
  const tr = TRAIN.filter(f), te = TEST.filter(f)
  console.log('=== ' + key + '  train ' + tr.length + ' · test ' + te.length)
  console.log('règle'.padEnd(34) + 'TRAIN gagnant couplé trio | TEST gagnant couplé trio trio≤5 trio≤6')
  // empreinte de référence
  const refT = (() => { let g = 0, co = 0, tr3 = 0; for (const r of tr) { if (hitTop(r.emp, r.arr, 1)) g++; if (hitTop(r.emp, r.arr, 2)) co++; if (trioIn(r.emp, r.arr, 3)) tr3++ } return [g / tr.length, co / tr.length, tr3 / tr.length] })()
  const refE = (() => { let g = 0, co = 0, tr3 = 0, t5 = 0, t6 = 0; for (const r of te) { const o = r.emp; if (hitTop(o, r.arr, 1)) g++; if (hitTop(o, r.arr, 2)) co++; if (trioIn(o, r.arr, 3)) tr3++; if (trioIn(o, r.arr, 5)) t5++; if (trioIn(o, r.arr, 6)) t6++ } return [g / te.length, co / te.length, tr3 / te.length, t5 / te.length, t6 / te.length] })()
  const fmt = (a) => a.map((x) => pct(x * 1000, 1000).padStart(7)).join('')
  console.log('  EMPREINTE (production)'.padEnd(34) + fmt(refT) + ' |' + fmt(refE))
  const cls = []
  for (const [nom, w] of RULES) {
    const a = tab(tr, w), b = tab(te, w)
    cls.push({ nom, a, b })
    console.log('  ' + nom.padEnd(32) + fmt([a.g, a.co, a.tr]) + ' |' + fmt([b.g, b.co, b.tr, b.t5, b.t6]))
  }
  const best = [...cls].sort((x, y) => (y.a.g + y.a.co + y.a.tr) - (x.a.g + x.a.co + x.a.tr))[0]
  const bestTrio = [...cls].sort((x, y) => (y.a.t5 + y.a.t6) - (x.a.t5 + x.a.t6))[0]
  console.log('  → meilleur TRAIN (gagnant+couplé+trio) : ' + best.nom + '  → test ' + pct(best.b.g * 1000, 1000) + ' / ' + pct(best.b.tr * 1000, 1000))
  console.log('  → meilleur TRAIN (trio≤5 + trio≤6)     : ' + bestTrio.nom + '  → test ' + pct(bestTrio.b.t5 * 1000, 1000) + ' / ' + pct(bestTrio.b.t6 * 1000, 1000))
  console.log('')
}
